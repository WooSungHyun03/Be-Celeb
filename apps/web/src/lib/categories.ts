import type { CategoryScore, CreatorCategoryName, YouTubeChannelAnalysis, YouTubeVideoAnalysis } from "@/types/content-recommendation";

export const CREATOR_CATEGORIES: CreatorCategoryName[] = [
  "게임",
  "운동",
  "IT",
  "노래",
  "OTT",
  "일상",
  "뷰티",
  "스터디",
  "코미디",
  "먹방",
  "춤",
];

export const CATEGORY_KEYWORDS: Record<CreatorCategoryName, string[]> = {
  게임: ["게임", "롤", "리그오브레전드", "발로란트", "마인크래프트", "로블록스", "배그", "플레이", "공략"],
  운동: ["헬스", "운동", "다이어트", "복근", "루틴", "pt", "피티", "홈트", "근력", "유산소"],
  IT: ["개발", "코딩", "ai", "노트북", "프로그래밍", "앱", "테크", "인공지능", "리뷰", "개발자"],
  노래: ["커버", "보컬", "노래", "플레이리스트", "라이브", "음악", "가창", "싱잉"],
  OTT: ["넷플릭스", "드라마", "영화", "리뷰", "디즈니", "티빙", "왓챠", "웨이브", "시리즈"],
  일상: ["브이로그", "일상", "하루", "루틴", "출근", "퇴근", "주말", "라이프", "vlog"],
  뷰티: ["메이크업", "화장품", "피부", "올리브영", "스킨케어", "grwm", "뷰티", "립", "쿠션"],
  스터디: ["공부", "시험", "대학생", "생산성", "플래너", "스터디", "독서", "자격증", "집중"],
  코미디: ["웃긴", "몰카", "개그", "상황극", "코미디", "예능", "패러디", "드립"],
  먹방: ["먹방", "맛집", "음식", "라면", "디저트", "요리", "레시피", "카페", "먹는"],
  춤: ["댄스", "안무", "커버댄스", "챌린지", "춤", "dance", "choreography", "Shorts댄스"],
};

export function normalizeCreatorCategory(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();
  return CREATOR_CATEGORIES.find((category) => category.toLowerCase() === normalized) ?? null;
}

function toSearchText(channel: YouTubeChannelAnalysis, videos: YouTubeVideoAnalysis[]) {
  return [
    channel.channelTitle,
    channel.description,
    ...videos.flatMap((video) => [video.title, video.description, ...video.tags]),
  ]
    .join(" ")
    .toLowerCase();
}

export function inferCreatorCategory(channel: YouTubeChannelAnalysis, videos: YouTubeVideoAnalysis[]) {
  const text = toSearchText(channel, videos);
  const scores: CategoryScore[] = CREATOR_CATEGORIES.map((category) => {
    const matchedKeywords = CATEGORY_KEYWORDS[category].filter((keyword) => text.includes(keyword.toLowerCase()));
    return {
      category,
      score: matchedKeywords.length,
      matchedKeywords,
    };
  }).sort((a, b) => b.score - a.score || CREATOR_CATEGORIES.indexOf(a.category) - CREATOR_CATEGORIES.indexOf(b.category));

  return {
    inferredCategory: scores[0]?.category ?? "일상",
    categoryScores: scores,
  };
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s#]/gu, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^#/, ""))
    .filter((token) => token.length >= 2);
}

export function getVideoTokens(video: Pick<YouTubeVideoAnalysis, "title" | "description" | "tags">) {
  return new Set(tokenize([video.title, video.description, ...video.tags].join(" ")));
}

export function getTokenOverlapScore(
  userVideo: Pick<YouTubeVideoAnalysis, "title" | "description" | "tags">,
  influencerVideo: Pick<YouTubeVideoAnalysis, "title" | "description" | "tags">,
) {
  const userTokens = getVideoTokens(userVideo);
  const influencerTokens = getVideoTokens(influencerVideo);

  if (userTokens.size === 0 || influencerTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  influencerTokens.forEach((token) => {
    if (userTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / Math.min(userTokens.size, influencerTokens.size);
}

export function filterDuplicateInfluencerVideos<T extends Pick<YouTubeVideoAnalysis, "title" | "description" | "tags">>(
  userVideos: Pick<YouTubeVideoAnalysis, "title" | "description" | "tags">[],
  influencerVideos: T[],
  threshold = 0.34,
) {
  const filtered: T[] = [];
  let duplicateCount = 0;

  influencerVideos.forEach((influencerVideo) => {
    const maxScore = userVideos.reduce((score, userVideo) => {
      return Math.max(score, getTokenOverlapScore(userVideo, influencerVideo));
    }, 0);

    if (maxScore >= threshold) {
      duplicateCount += 1;
      return;
    }

    filtered.push(influencerVideo);
  });

  return { filtered, duplicateCount };
}

