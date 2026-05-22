export type ProductionBoardStatus = "idea" | "planned" | "filming" | "editing" | "scheduled" | "uploaded";

export type ProductionBoardPriority = "low" | "normal" | "high";

export type ProductionBoardItem = {
  id: string;
  userId: string;
  favoriteId: string | null;
  recommendationId: string | null;
  calendarEventId: string | null;
  title: string;
  description: string | null;
  hook: string | null;
  reason: string | null;
  hashtags: string[];
  storyboard: unknown;
  category: string | null;
  status: ProductionBoardStatus;
  priority: ProductionBoardPriority;
  memo: string | null;
  shootStartDate: string | null;
  shootEndDate: string | null;
  metadata: Record<string, unknown>;
  checklistTotal: number;
  checklistDone: number;
  dueDate: string | null;
  uploadScheduledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ProductionBoardChecklistItem = {
  id: string;
  boardItemId: string;
  userId: string;
  text: string;
  isDone: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string | null;
};

export const PRODUCTION_BOARD_STATUS_LABELS: Record<ProductionBoardStatus, string> = {
  idea: "아이디어",
  planned: "기획 완료",
  filming: "촬영 중",
  editing: "편집 중",
  scheduled: "업로드 예정",
  uploaded: "업로드 완료",
};

export const NEXT_STATUS_MAP: Partial<Record<ProductionBoardStatus, ProductionBoardStatus>> = {
  idea: "planned",
  planned: "filming",
  filming: "editing",
  editing: "scheduled",
  scheduled: "uploaded",
};

export const VALID_PRODUCTION_BOARD_STATUSES: ProductionBoardStatus[] = [
  "idea",
  "planned",
  "filming",
  "editing",
  "scheduled",
  "uploaded",
];

export const PRODUCTION_BOARD_COLUMNS: Array<{ status: ProductionBoardStatus; label: string }> = [
  { status: "idea", label: PRODUCTION_BOARD_STATUS_LABELS.idea },
  { status: "planned", label: PRODUCTION_BOARD_STATUS_LABELS.planned },
  { status: "filming", label: PRODUCTION_BOARD_STATUS_LABELS.filming },
  { status: "editing", label: PRODUCTION_BOARD_STATUS_LABELS.editing },
  { status: "scheduled", label: PRODUCTION_BOARD_STATUS_LABELS.scheduled },
  { status: "uploaded", label: PRODUCTION_BOARD_STATUS_LABELS.uploaded },
];

export const productionBoardColumns = PRODUCTION_BOARD_COLUMNS;
