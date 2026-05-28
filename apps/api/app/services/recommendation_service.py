# Orchestrates the YouTube content recommendation workflows.
from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.core.errors import BackendApiError
from app.schemas.youtube_content import (
    ContentPlan,
    ContentPlanResponse,
    CreatorCategoryName,
    GenerateContentPlanOptionInput,
    RecommendationFieldOptions,
    RecommendationResponseChannel,
    RecommendOptionsResponse,
    RecommendationOption,
    RecommendationOptionsChannel,
    SingleContentRecommendation,
    SingleRecommendContentResponse,
    StoryboardScene,
    YouTubeChannelAnalysis,
    YouTubeVideoAnalysis,
)
from app.services.account_service import save_user_channel_settings_metadata
from app.services.database_service import (
    fetch_category_videos,
    fetch_channel_analysis,
    save_channel_analysis,
    save_content_plan,
    save_recommendation_options,
    save_single_content_recommendation,
)
from app.services.llm_service import call_local_llm, parse_llm_json_with_fallback
from app.services.prompt_template_service import get_active_prompt_template, render_prompt_template
from app.services.text_sanitizer import KOREAN_ONLY_OUTPUT_INSTRUCTION, sanitize_user_facing_text
from app.domains.video_analysis.service import get_video_analysis_context_for_youtube_ids, get_video_analysis_prompt_context
from app.services.youtube_content_service import CATEGORY_KEYWORDS, CREATOR_CATEGORIES
from app.services.youtube_service import get_channel_info, get_recent_videos

logger = logging.getLogger(__name__)


def normalize_category(value: str | None) -> CreatorCategoryName | None:
    if not value:
        return None
    normalized = value.strip().lower()
    for category in CREATOR_CATEGORIES:
        if category.lower() == normalized:
            return category
    return None


def normalize_tags(tags: list[str]) -> list[str]:
    normalized = []
    for tag in tags:
        value = tag.strip().lstrip("#").strip().lower()
        if value and value not in normalized:
            normalized.append(value)
    return normalized


def infer_category(channel: YouTubeChannelAnalysis, videos: list[YouTubeVideoAnalysis]) -> CreatorCategoryName:
    text = " ".join(
        [
            channel.channelTitle,
            channel.description,
            *[part for video in videos for part in [video.title, video.description, *video.tags]],
        ]
    ).lower()
    scores = [
        (
            category,
            len([keyword for keyword in CATEGORY_KEYWORDS[category] if keyword.lower() in text]),
            CREATOR_CATEGORIES.index(category),
        )
        for category in CREATOR_CATEGORIES
    ]
    scores.sort(key=lambda item: (-item[1], item[2]))
    return scores[0][0] if scores else "일상"


def _tokenize(value: str) -> set[str]:
    cleaned = re.sub(r"[^\w\s#가-힣]", " ", value.lower())
    return {token.lstrip("#") for token in cleaned.split() if len(token.lstrip("#")) >= 2}


def _overlap_score(user_video: YouTubeVideoAnalysis, influencer_video: YouTubeVideoAnalysis) -> float:
    user_tokens = _tokenize(" ".join([user_video.title, user_video.description, *normalize_tags(user_video.tags)]))
    influencer_tokens = _tokenize(
        " ".join([influencer_video.title, influencer_video.description, *normalize_tags(influencer_video.tags)])
    )
    if not user_tokens or not influencer_tokens:
        return 0.0
    return len(user_tokens & influencer_tokens) / min(len(user_tokens), len(influencer_tokens))


def remove_duplicate_like_videos(
    user_videos: list[YouTubeVideoAnalysis],
    influencer_videos: list[YouTubeVideoAnalysis],
    threshold: float = 0.34,
) -> tuple[list[YouTubeVideoAnalysis], int]:
    filtered: list[YouTubeVideoAnalysis] = []
    duplicate_count = 0
    for influencer_video in influencer_videos:
        max_score = max((_overlap_score(user_video, influencer_video) for user_video in user_videos), default=0.0)
        if max_score >= threshold:
            duplicate_count += 1
        else:
            filtered.append(influencer_video)
    return filtered, duplicate_count


def _compact_video(video: YouTubeVideoAnalysis) -> dict[str, Any]:
    return {
        "youtubeVideoId": video.youtubeVideoId,
        "publishedAt": video.publishedAt,
        "title": video.title,
        "description": video.description[:700],
        "tags": normalize_tags(video.tags)[:12],
        "viewCount": video.viewCount,
        "likeCount": video.likeCount,
        "commentCount": video.commentCount,
    }


def build_options_prompt(
    selected_category: CreatorCategoryName,
    channel: YouTubeChannelAnalysis,
    user_videos: list[YouTubeVideoAnalysis],
    influencer_videos: list[YouTubeVideoAnalysis],
) -> str:
    schema = {
        "options": [
            {
                "optionId": "option-1",
                "ideaTitle": "string",
                "format": "string",
                "summary": "string",
                "reason": "string",
                "whyNotDuplicate": "string",
                "expectedAudience": "string",
            }
        ]
    }
    input_data = {
        "selectedCategory": selected_category,
        "userChannel": {
            "youtubeChannelId": channel.youtubeChannelId,
            "title": channel.channelTitle,
            "description": channel.description[:1000],
            "subscriberCount": channel.subscriberCount,
            "videoCount": channel.videoCount,
        },
        "userRecentVideos": [_compact_video(video) for video in user_videos[:10]],
        "categoryInfluencerVideos": [_compact_video(video) for video in influencer_videos[:24]],
    }
    return "\n\n".join(
        [
            "You are a YouTube content strategy analyst.",
            "Analyze the user channel and category influencer database.",
            "Recommend exactly 3 content ideas.",
            "Do not recommend content similar to the user's existing videos.",
            KOREAN_ONLY_OUTPUT_INSTRUCTION,
            "Return valid JSON only.",
            "JSON schema:",
            json.dumps(schema, ensure_ascii=False, indent=2),
            "Input data:",
            json.dumps(input_data, ensure_ascii=False, indent=2),
        ]
    )


def build_content_plan_prompt(
    selected_category: CreatorCategoryName,
    option: GenerateContentPlanOptionInput,
    channel: YouTubeChannelAnalysis,
    user_videos: list[YouTubeVideoAnalysis],
    influencer_videos: list[YouTubeVideoAnalysis],
) -> str:
    schema = {
        "plan": {
            "title": "string",
            "format": "string",
            "hashtags": ["string"],
            "thumbnailIdea": "string",
            "targetAudience": "string",
            "hook": "string",
            "toneAnalysis": "string",
            "captionStyle": "string",
            "flowSummary": "string",
            "storyboard": [
                {
                    "scene": 1,
                    "duration": "0-3s",
                    "description": "string",
                    "caption": "string",
                }
            ],
            "uploadTips": ["string"],
        }
    }
    input_data = {
        "selectedCategory": selected_category,
        "selectedIdea": option.model_dump(mode="json"),
        "userChannel": {
            "youtubeChannelId": channel.youtubeChannelId,
            "title": channel.channelTitle,
            "description": channel.description[:1000],
        },
        "userRecentVideos": [_compact_video(video) for video in user_videos[:10]],
        "categoryInfluencerVideos": [_compact_video(video) for video in influencer_videos[:24]],
    }
    return "\n\n".join(
        [
            "Based on the selected idea and category influencer database, create a detailed YouTube content plan.",
            "Generate title, hashtags, thumbnail idea, hook, storyboard, and upload tips.",
            "Do not copy or closely repeat the user's existing uploaded topics.",
            KOREAN_ONLY_OUTPUT_INSTRUCTION,
            "Return valid JSON only.",
            "JSON schema:",
            json.dumps(schema, ensure_ascii=False, indent=2),
            "Input data:",
            json.dumps(input_data, ensure_ascii=False, indent=2),
        ]
    )


def _fallback_options(selected_category: CreatorCategoryName, influencer_videos: list[YouTubeVideoAnalysis]) -> list[RecommendationOption]:
    seeds = influencer_videos[:3]
    while len(seeds) < 3:
        seeds.append(
            YouTubeVideoAnalysis(
                youtubeVideoId=f"fallback-{len(seeds) + 1}",
                channelId="",
                publishedAt="",
                title=f"{selected_category} 카테고리 신규 콘텐츠",
                description="",
                thumbnails={},
                tags=[],
                raw={},
            )
        )
    return [
        RecommendationOption(
            optionId=f"option-{index + 1}",
            ideaTitle=f"{video.title[:40]} 재해석" if video.title else f"{selected_category} 콘텐츠 아이디어 {index + 1}",
            format="YouTube video",
            summary="카테고리 인기 흐름을 참고하되 내 채널의 기존 영상과 겹치지 않도록 각도를 바꾼 아이디어입니다.",
            reason="카테고리 DB에서 반복적으로 나타나는 관심사를 내 채널 톤에 맞게 변형했습니다.",
            whyNotDuplicate="최근 업로드 제목/설명/태그와 직접적인 키워드 중복을 피했습니다.",
            expectedAudience=f"{selected_category} 주제에 관심 있는 신규 시청자",
        )
        for index, video in enumerate(seeds[:3])
    ]


def _normalize_options(raw: dict[str, Any], fallback: list[RecommendationOption]) -> list[RecommendationOption]:
    values = raw.get("options")
    options: list[RecommendationOption] = []
    if isinstance(values, list):
        for index, value in enumerate(values):
            if not isinstance(value, dict):
                continue
            title = value.get("ideaTitle")
            if not isinstance(title, str) or not title.strip():
                continue
            options.append(
                RecommendationOption(
                    optionId=value.get("optionId") if isinstance(value.get("optionId"), str) else f"option-{index + 1}",
                    ideaTitle=sanitize_user_facing_text(title),
                    format=sanitize_user_facing_text(value.get("format")) if isinstance(value.get("format"), str) else "YouTube video",
                    summary=sanitize_user_facing_text(value.get("summary")) if isinstance(value.get("summary"), str) else "",
                    reason=sanitize_user_facing_text(value.get("reason")) if isinstance(value.get("reason"), str) else "",
                    whyNotDuplicate=sanitize_user_facing_text(value.get("whyNotDuplicate")) if isinstance(value.get("whyNotDuplicate"), str) else "",
                    expectedAudience=sanitize_user_facing_text(value.get("expectedAudience")) if isinstance(value.get("expectedAudience"), str) else "",
                )
            )
    merged = options[:3]
    for fallback_item in fallback:
        if len(merged) >= 3:
            break
        merged.append(fallback_item)
    return [
        RecommendationOption(**{**option.model_dump(), "optionId": f"option-{index + 1}"})
        for index, option in enumerate(merged[:3])
    ]


def _fallback_plan(option: GenerateContentPlanOptionInput) -> ContentPlan:
    return ContentPlan(
        title=option.ideaTitle,
        format=option.format or "YouTube video",
        hashtags=["#YouTube", "#BeCeleb"],
        thumbnailIdea="핵심 장면을 크게 배치하고 대비가 강한 짧은 문구를 얹습니다.",
        targetAudience="이 주제에 관심이 있지만 빠르게 핵심만 보고 싶은 시청자",
        hook=option.summary or "첫 3초에 결과물을 먼저 보여주고 과정을 압축해서 전개합니다.",
        storyboard=[
            StoryboardScene(scene=1, duration="0-3s", visual="결과 또는 갈등 상황을 먼저 보여줍니다.", caption="이게 가능할까?", shootingTip="첫 컷은 흔들림 없이 정면으로 촬영합니다."),
            StoryboardScene(scene=2, duration="3-12s", visual="핵심 과정을 빠르게 압축해 보여줍니다.", caption="핵심만 따라오세요", shootingTip="손동작이나 화면 전환은 짧게 끊어 편집합니다."),
            StoryboardScene(scene=3, duration="12-20s", visual="차별화 포인트와 마무리 행동을 제안합니다.", caption="저장하고 다시 보기", shootingTip="마지막 프레임에 댓글 질문을 남깁니다."),
        ],
        uploadTips=["첫 화면에 결과를 배치하세요.", "해시태그는 3-5개로 제한하세요.", "댓글 질문으로 다음 편 소재를 유도하세요."],
    )


def _fallback_single_recommendation(selected_category: CreatorCategoryName, influencer_videos: list[YouTubeVideoAnalysis]) -> SingleContentRecommendation:
    seed = influencer_videos[0] if influencer_videos else None
    title = f"{seed.title[:42]} 재해석" if seed and seed.title else f"{selected_category} 카테고리 신규 콘텐츠"
    return SingleContentRecommendation(
        title=title,
        format="YouTube video",
        hashtags=["#YouTube", "#BeCeleb", f"#{selected_category}"],
        thumbnailIdea="결과 장면을 크게 배치하고 대비가 강한 짧은 문구를 얹습니다.",
        targetAudience=f"{selected_category} 주제에 관심 있는 신규 시청자",
        hook="첫 3초에 결과 또는 반전을 먼저 보여주고 이유를 빠르게 전개합니다.",
        reason="카테고리 인플루언서 DB에서 반복되는 관심사를 내 채널 톤에 맞게 변형했습니다.",
        whyNotDuplicate="최근 업로드 제목/설명/태그와 직접적인 키워드 중복을 피했습니다.",
        storyboard=[
            StoryboardScene(scene=1, duration="0-5s", visual="완성 결과나 가장 강한 반전 장면을 화면 중앙에 크게 보여줍니다.", dialogue="오늘은 이 결과가 왜 나왔는지 바로 보여드릴게요.", caption="처음부터 결과 공개", shootingTip="첫 컷은 0.5초 안에 핵심 피사체가 보이도록 클로즈업합니다."),
            StoryboardScene(scene=2, duration="5-12s", visual="현재 채널의 기존 영상과 다른 접근 포인트를 짧게 설명합니다.", dialogue="기존 방식과 다르게 이번에는 포인트를 하나만 바꿉니다.", caption="기존 영상과 다른 점", shootingTip="말하는 장면과 자료 화면을 1:1 비율로 교차 편집합니다."),
            StoryboardScene(scene=3, duration="12-20s", visual="핵심 준비물, 설정값, 상황을 한 화면에 정리합니다.", dialogue="따라 하려면 이 세 가지만 준비하면 됩니다.", caption="준비물 3가지", shootingTip="텍스트가 잘 보이도록 배경을 단순하게 둡니다."),
            StoryboardScene(scene=4, duration="20-32s", visual="첫 번째 실행 장면을 실제 속도보다 빠르게 보여줍니다.", dialogue="첫 단계에서는 여기서 실수가 가장 많이 나옵니다.", caption="1단계 핵심", shootingTip="중요한 손동작 또는 클릭 지점은 화면 확대를 넣습니다."),
            StoryboardScene(scene=5, duration="32-45s", visual="두 번째 실행 장면에서 실패/성공 차이를 비교합니다.", dialogue="이 차이 하나 때문에 결과가 완전히 달라집니다.", caption="성공 포인트", shootingTip="좌우 비교 화면을 쓰면 핵심 차이를 빠르게 이해시키기 좋습니다."),
            StoryboardScene(scene=6, duration="45-60s", visual="완성 결과와 시청자 행동 유도를 함께 보여줍니다.", dialogue="여러분이라면 어떤 방식으로 바꿔보고 싶나요?", caption="댓글로 다음 실험 추천", shootingTip="마지막 2초는 댓글 질문이 읽히도록 화면을 정지합니다."),
        ],
        uploadTips=["첫 화면에 결과를 배치하세요.", "해시태그는 3-5개로 제한하세요.", "댓글 질문으로 다음 편 소재를 유도하세요."],
    )


def _selected_options(options: RecommendationFieldOptions | None) -> RecommendationFieldOptions:
    return options or RecommendationFieldOptions()


def _max_tokens_for_options(options: RecommendationFieldOptions) -> int:
    selected_count = sum(
        [
            options.reason,
            options.hashtags,
            options.storyboard,
            options.hook,
            options.thumbnail_idea,
            options.upload_tips,
        ]
    )
    if options.storyboard and options.hook and options.thumbnail_idea and options.upload_tips:
        return 6500
    if options.storyboard:
        return 4500
    if options.reason or options.hashtags:
        return 1800
    return 1200 if selected_count <= 1 else 1600


def _recommendation_schema_for_options(options: RecommendationFieldOptions, include_video_analysis_fields: bool = False) -> dict[str, Any]:
    recommendation: dict[str, Any] = {"title": "string"}
    if options.reason:
        recommendation["reason"] = "string"
        recommendation["whyNotDuplicate"] = "string"
    if options.hashtags:
        recommendation["hashtags"] = ["string"]
    if options.hook:
        recommendation["hook"] = "string"
    if options.thumbnail_idea:
        recommendation["thumbnailIdea"] = "string"
    if options.storyboard:
        recommendation["storyboard"] = [
            {
                "scene": 1,
                "duration": "0-5s",
                "visual": "string",
                "dialogue": "string",
                "caption": "string",
                "shootingTip": "string",
            }
        ]
    if options.upload_tips:
        recommendation["uploadTips"] = ["string"]
    if include_video_analysis_fields:
        recommendation["toneAnalysis"] = "string"
        recommendation["captionStyle"] = "string"
        recommendation["flowSummary"] = "string"
    return {"recommendation": recommendation}


async def _safe_video_analysis_context(
    video_analysis_id: str | None,
    user_id: str | None,
    youtube_video_ids: list[str],
) -> str | None:
    try:
        if video_analysis_id:
            return await get_video_analysis_prompt_context(video_analysis_id, user_id)
        return await get_video_analysis_context_for_youtube_ids(youtube_video_ids)
    except Exception as error:
        logger.warning("Skipping optional video analysis context: %s", error)
        return None


def _option_instructions(options: RecommendationFieldOptions) -> list[str]:
    instructions = [
        "title is mandatory and must always be included.",
        "Only include fields listed in the JSON schema. Do not include unchecked option fields.",
    ]
    if options.storyboard:
        instructions.extend(
            [
                "storyboard must contain 8 to 12 scenes.",
                "Every storyboard scene must include duration, visual, dialogue, caption, and shootingTip.",
                "Write detailed filming directions that a creator can use immediately.",
                "Include scene transitions, framing, subtitle copy, B-roll, and camera points.",
                "Do not write thin one-line storyboard scenes.",
            ]
        )
    return instructions


def _filter_recommendation_options(recommendation: SingleContentRecommendation, options: RecommendationFieldOptions) -> SingleContentRecommendation:
    return SingleContentRecommendation(
        title=recommendation.title,
        format=recommendation.format,
        reason=recommendation.reason if options.reason else None,
        whyNotDuplicate=recommendation.whyNotDuplicate if options.reason else None,
        hashtags=recommendation.hashtags if options.hashtags else [],
        hook=recommendation.hook if options.hook else None,
        thumbnailIdea=recommendation.thumbnailIdea if options.thumbnail_idea else None,
        targetAudience=recommendation.targetAudience,
        toneAnalysis=recommendation.toneAnalysis,
        captionStyle=recommendation.captionStyle,
        flowSummary=recommendation.flowSummary,
        storyboard=recommendation.storyboard if options.storyboard else [],
        uploadTips=recommendation.uploadTips if options.upload_tips else [],
    )


def _normalize_plan(raw: dict[str, Any], fallback: ContentPlan) -> ContentPlan:
    value = raw.get("plan") if isinstance(raw.get("plan"), dict) else raw
    if not isinstance(value, dict):
        return fallback
    storyboard = []
    if isinstance(value.get("storyboard"), list):
        for index, scene in enumerate(value["storyboard"]):
            if not isinstance(scene, dict):
                continue
            storyboard.append(
                StoryboardScene(
                    scene=scene.get("scene") if isinstance(scene.get("scene"), int) else index + 1,
                    duration=scene.get("duration") if isinstance(scene.get("duration"), str) else f"{index * 3}-{index * 3 + 3}s",
                    visual=sanitize_user_facing_text(scene.get("visual")) if isinstance(scene.get("visual"), str) else sanitize_user_facing_text(scene.get("description")) if isinstance(scene.get("description"), str) else "",
                    dialogue=sanitize_user_facing_text(scene.get("dialogue")) if isinstance(scene.get("dialogue"), str) else "",
                    caption=sanitize_user_facing_text(scene.get("caption")) if isinstance(scene.get("caption"), str) else "",
                    shootingTip=sanitize_user_facing_text(scene.get("shootingTip")) if isinstance(scene.get("shootingTip"), str) else "",
                    description=sanitize_user_facing_text(scene.get("description")) if isinstance(scene.get("description"), str) else "",
                )
            )
    return ContentPlan(
        title=sanitize_user_facing_text(value.get("title")) if isinstance(value.get("title"), str) else fallback.title,
        format=sanitize_user_facing_text(value.get("format")) if isinstance(value.get("format"), str) else fallback.format,
        hashtags=[sanitize_user_facing_text(item) for item in value.get("hashtags", []) if isinstance(item, str)] if isinstance(value.get("hashtags"), list) else fallback.hashtags,
        thumbnailIdea=sanitize_user_facing_text(value.get("thumbnailIdea")) if isinstance(value.get("thumbnailIdea"), str) else fallback.thumbnailIdea,
        targetAudience=sanitize_user_facing_text(value.get("targetAudience")) if isinstance(value.get("targetAudience"), str) else fallback.targetAudience,
        hook=sanitize_user_facing_text(value.get("hook")) if isinstance(value.get("hook"), str) else fallback.hook,
        toneAnalysis=sanitize_user_facing_text(value.get("toneAnalysis")) if isinstance(value.get("toneAnalysis"), str) else fallback.toneAnalysis,
        captionStyle=sanitize_user_facing_text(value.get("captionStyle")) if isinstance(value.get("captionStyle"), str) else fallback.captionStyle,
        flowSummary=sanitize_user_facing_text(value.get("flowSummary")) if isinstance(value.get("flowSummary"), str) else fallback.flowSummary,
        storyboard=storyboard or fallback.storyboard,
        uploadTips=[sanitize_user_facing_text(item) for item in value.get("uploadTips", []) if isinstance(item, str)] if isinstance(value.get("uploadTips"), list) else fallback.uploadTips,
    )


def _normalize_single_recommendation(raw: dict[str, Any], fallback: SingleContentRecommendation) -> SingleContentRecommendation:
    value = raw.get("recommendation") if isinstance(raw.get("recommendation"), dict) else raw
    if not isinstance(value, dict):
        return fallback
    base_plan = _normalize_plan(value, fallback)
    return SingleContentRecommendation(
        **base_plan.model_dump(),
        reason=sanitize_user_facing_text(value.get("reason")) if isinstance(value.get("reason"), str) else fallback.reason,
        whyNotDuplicate=sanitize_user_facing_text(value.get("whyNotDuplicate")) if isinstance(value.get("whyNotDuplicate"), str) else fallback.whyNotDuplicate,
    )


def build_single_recommendation_prompt(
    selected_category: CreatorCategoryName,
    channel: YouTubeChannelAnalysis,
    user_videos: list[YouTubeVideoAnalysis],
    influencer_videos: list[YouTubeVideoAnalysis],
) -> str:
    schema = {
        "recommendation": {
            "title": "string",
            "format": "string",
            "hashtags": ["string"],
            "thumbnailIdea": "string",
            "targetAudience": "string",
            "hook": "string",
            "reason": "string",
            "whyNotDuplicate": "string",
            "toneAnalysis": "string",
            "captionStyle": "string",
            "flowSummary": "string",
            "storyboard": [
                {
                    "scene": 1,
                    "duration": "0-5s",
                    "visual": "string",
                    "dialogue": "string",
                    "caption": "string",
                    "shootingTip": "string",
                }
            ],
            "uploadTips": ["string"],
        }
    }
    return json.dumps(
        {
            "schema": schema,
            "selectedCategory": selected_category,
            "userChannel": {
                "youtubeChannelId": channel.youtubeChannelId,
                "title": channel.channelTitle,
                "description": channel.description[:1000],
                "subscriberCount": channel.subscriberCount,
                "videoCount": channel.videoCount,
            },
            "userRecentVideos": [_compact_video(video) for video in user_videos[:10]],
            "categoryInfluencerVideos": [_compact_video(video) for video in influencer_videos[:24]],
            "duplicateGuidelines": "Do not recommend content similar to the user's existing uploaded topics, titles, descriptions, or tags.",
        },
        ensure_ascii=False,
        indent=2,
    )


async def create_single_content_recommendation(
    channel_url: str,
    category: str | None,
    user_id: str | None = None,
    options: RecommendationFieldOptions | None = None,
    video_analysis_id: str | None = None,
) -> SingleRecommendContentResponse:
    selected_options = _selected_options(options)
    selected_from_request = normalize_category(category)
    if category and not selected_from_request:
        raise BackendApiError(f"category must be one of: {', '.join(CREATOR_CATEGORIES)}.", 400, "VALIDATION_ERROR")

    channel = await get_channel_info(channel_url)
    recent_videos = await get_recent_videos(channel)
    inferred_category = infer_category(channel, recent_videos)
    selected_category = selected_from_request or inferred_category
    influencer_videos = await fetch_category_videos(selected_category)
    filtered_videos, duplicate_count = remove_duplicate_like_videos(recent_videos, influencer_videos)
    fallback = _fallback_single_recommendation(selected_category, filtered_videos)
    prompt_template = await get_active_prompt_template()
    video_analysis_context = await _safe_video_analysis_context(
        video_analysis_id,
        user_id,
        [video.youtubeVideoId for video in filtered_videos[:12]],
    )
    values = {
        "selected_category": selected_category,
        "user_channel": json.dumps(
            {
                "youtubeChannelId": channel.youtubeChannelId,
                "title": channel.channelTitle,
                "description": channel.description[:1000],
                "subscriberCount": channel.subscriberCount,
                "videoCount": channel.videoCount,
            },
            ensure_ascii=False,
        ),
        "user_recent_videos": json.dumps([_compact_video(video) for video in recent_videos[:10]], ensure_ascii=False),
        "category_database_videos": json.dumps([_compact_video(video) for video in filtered_videos[:24]], ensure_ascii=False),
        "duplicate_guidelines": "사용자가 이미 올린 영상의 제목, 설명, 태그와 유사한 주제는 추천하지 않는다. 선택된 추천 옵션과 JSON schema에 포함된 필드만 생성한다.",
    }
    dynamic_schema = _recommendation_schema_for_options(selected_options, include_video_analysis_fields=bool(video_analysis_context))
    prompt_contract = "\n\n".join(
        [
            "Required response contract:",
            "Return valid JSON only. The root object must contain recommendation.",
            KOREAN_ONLY_OUTPUT_INSTRUCTION,
            "If video analysis context is provided, use it to improve the hook, scene composition, tone analysis, caption style, hashtags, and flow summary.",
            "JSON schema:",
            json.dumps(dynamic_schema, ensure_ascii=False, indent=2),
            *(_option_instructions(selected_options)),
        ]
    )
    analysis_context = f"\n\nVideo analysis context:\n{video_analysis_context}" if video_analysis_context else ""
    rendered_prompt = f"{render_prompt_template(prompt_template['userPromptTemplate'], values)}{analysis_context}\n\n{prompt_contract}"
    raw_text = await call_local_llm(
        rendered_prompt,
        system_prompt=f"{prompt_template['systemPrompt']}\n{KOREAN_ONLY_OUTPUT_INSTRUCTION}",
        max_tokens=_max_tokens_for_options(selected_options),
        queue_owner_id=user_id,
        queue_purpose="recommend_content",
    )
    raw_json, parse_error = parse_llm_json_with_fallback(raw_text, {"recommendation": fallback.model_dump()})
    recommendation = _filter_recommendation_options(_normalize_single_recommendation(raw_json, fallback), selected_options)
    analysis_id = await save_channel_analysis(
        channel_url=channel_url,
        requested_category=category,
        selected_category=selected_category,
        inferred_category=inferred_category,
        channel=channel,
        recent_videos=recent_videos,
        user_id=user_id,
    )
    recommendation_id = await save_single_content_recommendation(
        analysis_id=analysis_id,
        user_id=user_id,
        selected_category=selected_category,
        input_payload={
            "channelUrl": channel_url,
            "requestedCategory": category,
            "selectedCategory": selected_category,
            "inferredCategory": inferred_category,
            "influencerVideosUsed": len(filtered_videos),
            "duplicateVideosExcluded": duplicate_count,
            "promptTemplateId": prompt_template.get("id"),
            "llmParseError": parse_error,
            "options": selected_options.model_dump(mode="json", by_alias=True),
            "videoAnalysisId": video_analysis_id,
        },
        llm_response={
            "recommendation": recommendation.model_dump(mode="json", exclude_none=True),
            "options": selected_options.model_dump(mode="json", by_alias=True),
            "raw": raw_json,
        },
    )
    if not recommendation_id:
        raise BackendApiError("Recommendation was generated but could not be saved.", 502, "SUPABASE_ERROR")
    if user_id:
        await save_user_channel_settings_metadata(user_id, channel_url, selected_category, channel)

    return SingleRecommendContentResponse(
        recommendationId=recommendation_id,
        analysisId=analysis_id,
        selectedCategory=selected_category,
        channel=RecommendationResponseChannel(
            youtubeChannelId=channel.youtubeChannelId,
            title=channel.channelTitle,
            thumbnailUrl=channel.thumbnailUrl,
        ),
        recommendation=recommendation,
        options=selected_options,
    )


async def create_recommendation_options(channel_url: str, category: str | None) -> RecommendOptionsResponse:
    selected_from_request = normalize_category(category)
    if category and not selected_from_request:
        raise BackendApiError(f"category must be one of: {', '.join(CREATOR_CATEGORIES)}.", 400, "VALIDATION_ERROR")

    channel = await get_channel_info(channel_url)
    recent_videos = await get_recent_videos(channel)
    inferred_category = infer_category(channel, recent_videos)
    selected_category = selected_from_request or inferred_category
    influencer_videos = await fetch_category_videos(selected_category)
    filtered_videos, _duplicate_count = remove_duplicate_like_videos(recent_videos, influencer_videos)
    fallback = _fallback_options(selected_category, filtered_videos)
    prompt = build_options_prompt(selected_category, channel, recent_videos, filtered_videos)
    raw_text = await call_local_llm(prompt, queue_purpose="recommendation_options")
    raw_json, _parse_error = parse_llm_json_with_fallback(raw_text, {"options": [item.model_dump() for item in fallback]})
    options = _normalize_options(raw_json, fallback)
    analysis_id = await save_channel_analysis(
        channel_url=channel_url,
        requested_category=category,
        selected_category=selected_category,
        inferred_category=inferred_category,
        channel=channel,
        recent_videos=recent_videos,
    )
    await save_recommendation_options(analysis_id, selected_category, options, raw_json)

    return RecommendOptionsResponse(
        analysisId=analysis_id,
        selectedCategory=selected_category,
        inferredCategory=None if selected_from_request else inferred_category,
        channel=RecommendationOptionsChannel(
            youtubeChannelId=channel.youtubeChannelId,
            title=channel.channelTitle,
            thumbnailUrl=channel.thumbnailUrl,
        ),
        options=options,
    )


async def create_content_plan(
    analysis_id: str,
    option: GenerateContentPlanOptionInput,
    video_analysis_id: str | None = None,
    user_id: str | None = None,
) -> ContentPlanResponse:
    analysis = await fetch_channel_analysis(analysis_id)
    influencer_videos = await fetch_category_videos(analysis.selected_category)
    filtered_videos, _duplicate_count = remove_duplicate_like_videos(analysis.recent_videos, influencer_videos)
    fallback = _fallback_plan(option)
    prompt = build_content_plan_prompt(
        analysis.selected_category,
        option,
        analysis.channel,
        analysis.recent_videos,
        filtered_videos,
    )
    video_analysis_context = await _safe_video_analysis_context(
        video_analysis_id,
        user_id,
        [video.youtubeVideoId for video in filtered_videos[:12]],
    )
    if video_analysis_context:
        prompt = "\n\n".join(
            [
                prompt,
                "Video analysis context:",
                video_analysis_context,
                "Use this context to include a stronger first 3-second hook, scene-by-scene composition, tone analysis, caption style suggestions, hashtag recommendations, and a concise flow summary.",
            ]
        )
    raw_text = await call_local_llm(prompt, queue_owner_id=user_id, queue_purpose="content_plan")
    raw_json, _parse_error = parse_llm_json_with_fallback(raw_text, {"plan": fallback.model_dump()})
    plan = _normalize_plan(raw_json, fallback)
    await save_content_plan(
        analysis=analysis,
        selected_option_id=option.optionId,
        option_payload=option.model_dump(mode="json"),
        plan=plan,
        raw=raw_json,
    )
    return ContentPlanResponse(
        analysisId=analysis.analysis_id,
        selectedOptionId=option.optionId,
        plan=plan,
    )
