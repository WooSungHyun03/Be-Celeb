export type TrendKeywordRange = "daily" | "weekly" | "monthly";

export type PopularTrendVideo = {
  category: string;
  youtubeVideoId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  tags: string[];
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt: string;
  youtubeUrl: string;
};

export type PopularVideosResponse = {
  videos: PopularTrendVideo[];
};

export type TrendKeywordCount = {
  keyword: string;
  count: number;
};

export type TrendKeywordSeriesPoint = {
  period: string;
  [keyword: string]: string | number;
};

export type TrendKeywordsResponse = {
  range: TrendKeywordRange;
  topKeywords: TrendKeywordCount[];
  seriesKeywords: string[];
  series: TrendKeywordSeriesPoint[];
};

export type NaverTrendTopKeyword = {
  keyword: string;
  ratio: number;
  trendDelta: number;
};

export type NaverTrendSeriesPoint = {
  period: string;
  [keyword: string]: string | number;
};

export type NaverTrendKeywordsResponse = {
  category: string;
  range: TrendKeywordRange;
  topKeywords: NaverTrendTopKeyword[];
  seriesKeywords: string[];
  series: NaverTrendSeriesPoint[];
};

export type CombinedTrendTag = {
  keyword: string;
  count: number;
  views: number;
};

export type CombinedTrendVideo = {
  youtubeVideoId: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  viewCount: number | null;
  publishedAt: string | null;
  tags: string[];
};

export type CombinedTrendKeywordScore = {
  keyword: string;
  score: number;
  youtubeCount: number;
  youtubeViews: number;
  naverRatio: number;
};

export type CombinedTrendsResponse = {
  category: string;
  range: TrendKeywordRange;
  youtube: {
    topTags: CombinedTrendTag[];
    topVideos: CombinedTrendVideo[];
  };
  naver: {
    topKeywords: NaverTrendTopKeyword[];
    seriesKeywords: string[];
    series: NaverTrendSeriesPoint[];
  };
  combined: {
    keywords: CombinedTrendKeywordScore[];
  };
};
