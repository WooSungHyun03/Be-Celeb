// Lists the single supported YouTube platform for analysis.
import type { Platform } from "@/types/trend";

export type PlatformDefinition = {
  id: Platform;
  label: string;
};

export const PLATFORMS: PlatformDefinition[] = [{ id: "youtube", label: "YouTube" }];
