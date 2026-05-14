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
