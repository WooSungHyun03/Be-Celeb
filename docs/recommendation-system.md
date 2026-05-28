# Be-Celeb 추천 시스템 문서

이 문서는 현재 코드 기준 추천 생성 흐름을 설명한다. 기준 파일은 `apps/api/app/services/recommendation_service.py`, `apps/api/app/services/youtube_content_service.py`, `apps/api/app/services/database_service.py`, `apps/api/app/services/prompt_template_service.py`, `apps/api/app/domains/recommendations/controller.py`이다.

## 전체 흐름

1. Frontend가 `POST /api/recommend-content`로 `channelUrl`, 선택 카테고리, 결과 옵션, 선택적 `videoAnalysisId`를 보낸다.
2. Backend controller는 Authorization header에서 Supabase 사용자를 확인하고 `create_single_content_recommendation()`을 호출한다.
3. Backend는 YouTube Data API로 채널 정보와 최근 업로드 영상을 조회한다.
4. 요청 카테고리가 유효하면 그 값을 사용하고, 없으면 채널/영상 텍스트 키워드로 카테고리를 자동 추론한다.
5. 선택 카테고리의 `influencer_videos` 데이터를 Supabase에서 가져온다.
6. 사용자 최근 영상과 인플루언서 영상의 제목/설명/태그 토큰 overlap을 계산해 중복 가능성이 높은 인플루언서 영상을 제외한다.
7. active LLM prompt template을 가져오고, 없으면 fallback template을 사용한다.
8. 선택된 옵션에 맞는 JSON schema와 지시문을 prompt에 추가한다.
9. Local LLM API를 호출하고, JSON parse 실패 시 fallback 추천을 사용한다.
10. `user_channel_analyses`와 `content_recommendations`에 결과를 저장한다.
11. 저장된 `recommendationId`로 `/dashboard/result/{recommendationId}` 또는 `GET /api/recommendations/{recommendationId}`에서 다시 조회한다.

## 사용자 입력 데이터

`RecommendContentRequest` 입력:

- `channelUrl`: 필수 YouTube 채널 URL/handle/channel id.
- `category`: 선택 값. 카테고리 문자열이 없거나 빈 값이면 자동선정으로 처리한다.
- `options`: 선택 값. `reason`, `hashtags`, `storyboard`, `hook`, `thumbnailIdea`, `uploadTips` 생성 여부를 제어한다.
- `videoAnalysisId`: 선택 값. 기존 `video_analysis` 레코드가 있으면 추가 컨텍스트로 사용한다.

인증 사용자가 있으면 `content_recommendations.user_id`, `user_channel_analyses.user_id`, `user_channel_settings` metadata 저장에 사용한다. 비로그인 사용자는 `user_id = null`로 저장될 수 있다.

## 카테고리 자동선정

카테고리 자동선정은 `category`가 없거나 지원 카테고리와 일치하지 않는 빈 값일 때 동작한다. `infer_category()`는 다음 텍스트를 하나로 합친 뒤 소문자 기준으로 검색한다.

- YouTube 채널 제목
- YouTube 채널 설명
- 최근 영상 제목
- 최근 영상 설명
- 최근 영상 태그

각 카테고리는 `CATEGORY_KEYWORDS`에 정의된 키워드 목록을 갖는다. 포함된 키워드 개수를 점수로 계산하고, 점수가 높은 카테고리를 선택한다. 점수가 같으면 `CREATOR_CATEGORIES` 배열 순서가 빠른 카테고리를 선택한다. 모든 점수가 0이어도 첫 번째 정렬 결과가 선택되며, 예외 fallback은 `"일상"`이다.

지원 카테고리:

- 게임, 운동, IT, 노래, OTT, 일상, 뷰티, 스터디, 코미디, 먹방, 춤

## 수동 카테고리 선택

요청 `category`가 지원 카테고리와 일치하면 자동 추론 결과보다 수동 선택 값이 우선한다. 지원하지 않는 문자열이면 `VALIDATION_ERROR`로 400 응답을 반환한다.

수동 선택이어도 `inferredCategory`는 내부 분석과 저장 payload에 남긴다. 추천 생성에는 `selectedCategory` 기준의 인플루언서 DB 영상만 사용한다.

## LLM에 전달되는 데이터

LLM prompt에는 다음 종류의 데이터만 전달한다.

- 선택 카테고리
- 사용자 채널 요약: `youtubeChannelId`, 제목, 설명 최대 1000자, 구독자 수, 영상 수
- 사용자 최근 영상 최대 10개: video id, 업로드일, 제목, 설명 최대 700자, 정규화 태그 최대 12개, 조회/좋아요/댓글 수
- 카테고리 인플루언서 영상 최대 24개: 동일 compact video 구조
- 중복 회피 지침
- 선택 옵션에 따른 JSON schema
- 선택적 video analysis context

`_compact_video()`가 LLM 입력 영상 필드를 제한한다. YouTube API raw 응답 전체, Supabase service role key, 사용자 access token, admin/cron secret, LLM API key는 prompt에 넣지 않는다.

## Prompt 구성 방식

기본 prompt template은 `prompt_template_service.DEFAULT_USER_PROMPT_TEMPLATE`이다. 운영자가 admin에서 `llm_prompt_templates` active template을 지정하면 `get_active_prompt_template()`이 해당 template을 사용한다.

template 변수:

- `{{selected_category}}`
- `{{user_channel}}`
- `{{user_recent_videos}}`
- `{{category_database_videos}}`
- `{{duplicate_guidelines}}`

Backend는 template render 결과 뒤에 다음 계약을 추가한다.

- JSON root는 `recommendation`
- 사용자-facing 문자열은 자연스러운 한국어
- 선택 옵션에 포함된 필드만 생성
- `storyboard=true`이면 8~12개 scene과 `duration`, `visual`, `dialogue`, `caption`, `shootingTip` 요구
- 선택적 video analysis context가 있으면 hook, scene, tone, caption style, hashtags, flow summary 개선에 사용

`_max_tokens_for_options()`는 선택 옵션에 따라 LLM token budget을 늘린다. storyboard와 hook/thumbnail/uploadTips가 모두 켜진 경우 가장 큰 budget을 사용한다.

## 추천 결과 생성 알고리즘

1. `get_channel_info()`로 채널 메타데이터를 조회한다.
2. `get_recent_videos()`로 최근 업로드 영상을 가져온다.
3. 자동 또는 수동으로 `selectedCategory`를 결정한다.
4. `fetch_category_videos()`가 `influencer_video_categories` join table 기준으로 해당 카테고리 영상을 우선 조회하고, 없으면 legacy `influencer_videos.category_id`로 fallback한다.
5. `remove_duplicate_like_videos()`가 사용자 영상과 인플루언서 영상 토큰 overlap을 계산한다.
6. overlap score가 `0.34` 이상이면 중복 가능성이 높은 영상으로 제외한다.
7. 남은 인플루언서 영상을 seed로 fallback 추천을 만든다.
8. LLM 응답 JSON을 parse하고, 실패하면 fallback 추천을 사용한다.
9. `_filter_recommendation_options()`가 사용자가 선택하지 않은 옵션 필드를 제거한다.

## 트렌드/영상/인플루언서/키워드 반영

추천 생성 자체는 실시간 trends API를 직접 호출하지 않는다. 대신 daily collector가 Supabase에 저장한 `influencer_videos`가 카테고리별 인플루언서/영상 트렌드 역할을 한다.

- daily YouTube collector: `influencer_channels`에서 채널을 읽고 YouTube Data API로 최근 영상을 수집해 `influencer_videos`에 upsert한다.
- 카테고리 연결: `influencer_channel_categories`, `influencer_video_categories`를 우선 사용한다.
- 키워드 기반 자동선정: `CATEGORY_KEYWORDS`가 채널/영상 텍스트에서 카테고리 신호를 찾는다.
- 검색 관심도/Naver DataLab 데이터는 trends 화면과 키워드 랭킹에 사용되며, 현재 추천 prompt에는 직접 주입하지 않는다.

## Video analysis context

`videoAnalysisId`가 있으면 `get_video_analysis_prompt_context()`가 해당 레코드를 읽어 prompt에 추가한다. 없으면 추천에 사용된 인플루언서 영상 id 목록으로 기존 `video_analysis` 레코드를 최대 4개 조회한다.

현재 신규 YouTube 분석은 `yt-dlp` 자막 조회를 사용하지 않는다. `create_video_analysis_from_youtube_video()`는 metadata-only 레코드를 만들며, 자막/쿠키/오디오/Whisper 기반 분석은 수행하지 않는다. 과거에 저장된 transcript 레코드가 DB에 남아 있으면 읽기 context로는 사용할 수 있다.

## Fallback / error 처리

- 지원하지 않는 카테고리: 400 `VALIDATION_ERROR`
- YouTube API/DB 실패: `BackendApiError`로 API error response 반환
- LLM JSON parse 실패: fallback 추천 JSON으로 대체하고 저장 payload에 parse error를 남긴다.
- 저장 실패: 추천이 생성돼도 `content_recommendations` 저장 id가 없으면 502 `SUPABASE_ERROR`
- 선택적 video analysis context 조회 실패: warning log만 남기고 추천 생성은 계속한다.
- LLM 응답에 선택하지 않은 필드가 있어도 `_filter_recommendation_options()`가 제거한다.

## 저장/조회 흐름

저장:

- `save_channel_analysis()` → `user_channel_analyses`
- `save_single_content_recommendation()` → `content_recommendations`
- 로그인 사용자인 경우 `save_user_channel_settings_metadata()`로 최근 채널 설정 metadata 갱신

조회:

- `GET /api/recommendations/{recommendationId}`
- `fetch_content_recommendation_detail()`이 추천 row를 읽고, `analysis_id`로 `user_channel_analyses`를 다시 읽어 channel 정보를 복원한다.
- `content_recommendations.user_id`가 있으면 요청 사용자와 일치해야 한다.

## LLM에 넘기면 안 되는 데이터

다음 값은 prompt, LLM request body, 운영 로그에 넣지 않는다.

- Supabase service role key, anon key, user access token
- `ADMIN_SECRET`, `CRON_SECRET`, Local LLM API key, YouTube/Naver API key
- 원본 Authorization header
- YouTube API raw 응답 전체
- 사용자가 명시하지 않은 계정/프로필 개인정보
- LLM prompt에 필요 없는 DB row 전체 JSON
- 운영자 admin 입력 secret

운영 로그에는 prompt 원문이나 LLM 입력 데이터 전체를 남기지 않는다. 실패 로그는 error class 또는 짧은 메시지 중심으로 유지한다.
