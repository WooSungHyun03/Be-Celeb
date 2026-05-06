// Provides mock recommendation data for pages and API route handlers.
import type { Recommendation } from "@/types/recommendation";

export const mockRecommendations: Recommendation[] = [
  {
    id: "rec-001",
    title: "AI 내레이션 비하인드 쇼츠",
    summary: "제작 과정을 짧게 보여주고 AI 음성으로 핵심 포인트를 설명합니다.",
    category: "ai-video",
    platforms: ["tiktok", "youtube-shorts"],
    priority: "high",
    reason: "AI 영상 카테고리와 rising trend의 결합도가 높습니다.",
    steps: ["3초 hook 작성", "제작 화면 녹화", "AI 내레이션 mock script 작성"],
    relatedTrendIds: ["trend-001"],
    isSaved: true,
  },
  {
    id: "rec-002",
    title: "한입 리액션 맛집 비교",
    summary: "같은 메뉴를 두 가게에서 한입씩 비교하는 빠른 리뷰 포맷입니다.",
    category: "mukbang",
    platforms: ["instagram-reels", "tiktok"],
    priority: "medium",
    reason: "먹방 계정의 반복 가능한 시리즈 포맷으로 확장하기 좋습니다.",
    steps: ["비교 메뉴 선정", "한입 컷 촬영", "점수 자막 추가"],
    relatedTrendIds: ["trend-002"],
    isSaved: true,
  },
  {
    id: "rec-003",
    title: "3가지 아이템 출근룩 전환",
    summary: "핵심 아이템 3개로 스타일을 전환하는 패션 콘텐츠입니다.",
    category: "fashion",
    platforms: ["instagram-reels", "youtube-shorts"],
    priority: "low",
    reason: "패션 전환 포맷은 안정적이지만 차별화 hook이 필요합니다.",
    steps: ["아이템 3개 선정", "전환 컷 촬영", "가격/브랜드 정보 mock 표시"],
    relatedTrendIds: ["trend-003"],
    isSaved: false,
  },
];
