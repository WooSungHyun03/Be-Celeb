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
  dueDate: string | null;
  uploadScheduledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const productionBoardColumns: Array<{ status: ProductionBoardStatus; label: string }> = [
  { status: "idea", label: "아이디어" },
  { status: "script", label: "대본 작성" },
  { status: "filming", label: "촬영 예정" },
  { status: "editing", label: "편집 중" },
  { status: "uploaded", label: "업로드 완료" },
];
