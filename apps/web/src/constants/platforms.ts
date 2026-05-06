// Lists supported short-form SNS platforms for mock analysis.
import type { Platform } from "@/types/trend";

export type PlatformDefinition = {
  id: Platform;
  label: string;
};

export const PLATFORMS: PlatformDefinition[] = [
  { id: "instagram-reels", label: "Instagram Reels" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube-shorts", label: "YouTube Shorts" },
];
