// Lists supported creator categories for mock strategy planning.
import type { TrendCategory } from "@/types/trend";

export type CategoryDefinition = {
  id: TrendCategory;
  label: string;
  description: string;
};

export const CATEGORIES: CategoryDefinition[] = [
  { id: "mukbang", label: "먹방", description: "음식, 맛집, 식사 리액션 중심 계정" },
  { id: "ai-video", label: "AI 영상", description: "AI 생성 영상과 자동화 콘텐츠 계정" },
  { id: "dance", label: "댄스", description: "챌린지와 퍼포먼스 중심 계정" },
  { id: "beauty", label: "뷰티", description: "메이크업, 스킨케어, 리뷰 중심 계정" },
  { id: "fashion", label: "패션", description: "코디, 쇼핑, 스타일링 중심 계정" },
  { id: "daily", label: "일상", description: "브이로그와 라이프스타일 중심 계정" },
];
