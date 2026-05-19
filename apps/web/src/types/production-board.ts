export type ProductionBoardStatus = "idea" | "script" | "filming" | "editing" | "uploaded";

export type ProductionBoardPriority = "low" | "normal" | "high";

export type ProductionBoardItem = {
  id: string;
  userId: string;
  favoriteId: string | null;
  recommendationId: string | null;
  title: string;
  hook: string | null;
  reason: string | null;
  hashtags: string[];
  storyboard: unknown;
  category: string | null;
  status: ProductionBoardStatus;
  priority: ProductionBoardPriority;
  memo: string | null;
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
  script: "대본 작성",
  filming: "촬영 예정",
  editing: "편집 중",
  uploaded: "업로드 완료",
};

export const NEXT_STATUS_MAP: Partial<Record<ProductionBoardStatus, ProductionBoardStatus>> = {
  idea: "script",
  script: "filming",
  filming: "editing",
  editing: "uploaded",
};

export const VALID_PRODUCTION_BOARD_STATUSES: ProductionBoardStatus[] = [
  "idea",
  "script",
  "filming",
  "editing",
  "uploaded",
];

export const PRODUCTION_BOARD_COLUMNS: Array<{ status: ProductionBoardStatus; label: string }> = [
  { status: "idea", label: PRODUCTION_BOARD_STATUS_LABELS.idea },
  { status: "script", label: PRODUCTION_BOARD_STATUS_LABELS.script },
  { status: "filming", label: PRODUCTION_BOARD_STATUS_LABELS.filming },
  { status: "editing", label: PRODUCTION_BOARD_STATUS_LABELS.editing },
  { status: "uploaded", label: PRODUCTION_BOARD_STATUS_LABELS.uploaded },
];

export const productionBoardColumns = PRODUCTION_BOARD_COLUMNS;
