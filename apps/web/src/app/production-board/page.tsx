"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Toast } from "@/components/common/Toast";
import { ROUTES } from "@/constants/routes";
import {
  createProductionBoardChecklistItem,
  deleteProductionBoardChecklistItem,
  deleteProductionBoardItem,
  getProductionBoardChecklist,
  getProductionBoardItems,
  updateProductionBoardChecklistItem,
  updateProductionBoardItemMemo,
  updateProductionBoardItemStatus,
} from "@/lib/api/production-board";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import {
  NEXT_STATUS_MAP,
  PRODUCTION_BOARD_COLUMNS,
  PRODUCTION_BOARD_STATUS_LABELS,
  VALID_PRODUCTION_BOARD_STATUSES,
  type ProductionBoardChecklistItem,
  type ProductionBoardItem,
  type ProductionBoardStatus,
} from "@/types/production-board";
import { cn } from "@/utils/cn";

const statusTone: Record<ProductionBoardStatus, "brand" | "info" | "warning" | "signal" | "default"> = {
  idea: "brand",
  script: "info",
  filming: "warning",
  editing: "signal",
  uploaded: "default",
};

const DEFAULT_CHECKLIST_ITEMS = [
  "대본 작성",
  "촬영 장소 정하기",
  "영상 촬영",
  "컷 편집",
  "자막 추가",
  "썸네일/커버 확인",
  "해시태그 확인",
  "업로드 완료",
];

function normalizeHashtag(tag: string) {
  return tag.startsWith("#") ? tag : `#${tag}`;
}

function memoPreview(memo: string | null) {
  return memo?.trim().split(/\r?\n/).filter(Boolean).join(" ") ?? "";
}

function mergeBoardItemUpdate(currentItem: ProductionBoardItem, updatedItem: ProductionBoardItem) {
  return {
    ...updatedItem,
    checklistTotal: currentItem.checklistTotal,
    checklistDone: currentItem.checklistDone,
  };
}

function getProductionBoardStatus(value: UniqueIdentifier | null | undefined): ProductionBoardStatus | null {
  if (typeof value !== "string") {
    return null;
  }
  return VALID_PRODUCTION_BOARD_STATUSES.includes(value as ProductionBoardStatus) ? (value as ProductionBoardStatus) : null;
}

function toDisplayText(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

function storyboardPreview(storyboard: unknown) {
  if (!Array.isArray(storyboard)) {
    return [];
  }

  return storyboard
    .map((scene, index) => {
      if (typeof scene !== "object" || scene === null) {
        return null;
      }
      const record = scene as Record<string, unknown>;
      const title = toDisplayText(record.title) ?? toDisplayText(record.scene) ?? `Scene ${index + 1}`;
      const description =
        toDisplayText(record.description) ??
        toDisplayText(record.visual) ??
        toDisplayText(record.shot) ??
        toDisplayText(record.script);
      return description ? `${title}: ${description}` : title;
    })
    .filter((value): value is string => Boolean(value));
}

type ToastState = {
  message: string;
  tone: "success" | "error" | "info";
};

type ProductionBoardCardProps = {
  item: ProductionBoardItem;
  isMoving: boolean;
  isActiveDragItem: boolean;
  onOpenDetail: (item: ProductionBoardItem) => void;
  onMoveNext: (item: ProductionBoardItem) => void;
};

function ProductionBoardCard({ item, isMoving, isActiveDragItem, onOpenDetail, onMoveNext }: ProductionBoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { status: item.status },
    disabled: isMoving,
  });
  const label = PRODUCTION_BOARD_STATUS_LABELS[item.status];
  const nextStatus = NEXT_STATUS_MAP[item.status];
  const nextLabel = nextStatus ? PRODUCTION_BOARD_STATUS_LABELS[nextStatus] : null;
  const visibleTags = item.hashtags.slice(0, 3);
  const hiddenTagCount = Math.max(item.hashtags.length - visibleTags.length, 0);
  const memoText = memoPreview(item.memo);
  const checklistTotal = item.checklistTotal ?? 0;
  const checklistDone = item.checklistDone ?? 0;
  const checklistProgress = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const dragging = isDragging || isActiveDragItem;
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    zIndex: dragging ? 30 : undefined,
  };

  return (
    <div
      className={cn(
        "touch-none rounded-lg outline-none transition-[opacity,box-shadow] duration-100",
        dragging ? "opacity-80 shadow-lg ring-2 ring-violet-300 ring-offset-2 transition-none" : "",
      )}
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <Card className="cursor-grab p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[item.status]}>{label}</Badge>
            {item.category ? <Badge>{item.category}</Badge> : null}
          </div>
          {item.status === "uploaded" ? <Badge tone="signal">완료됨</Badge> : null}
        </div>
        <h2 className="mt-3 line-clamp-2 text-base font-bold leading-6 text-ink">{item.title}</h2>
        {item.hook ? <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{item.hook}</p> : null}
        {visibleTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={tag}>
                {normalizeHashtag(tag)}
              </span>
            ))}
            {hiddenTagCount > 0 ? (
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">+{hiddenTagCount}</span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span>{memoText ? "메모 있음" : "메모 없음"}</span>
            <span className="text-slate-300">·</span>
            <span>{checklistTotal > 0 ? `체크리스트 ${checklistDone}/${checklistTotal} 완료` : "체크리스트 없음"}</span>
          </div>
          {checklistTotal > 0 ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${checklistProgress}%` }} />
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2">
          <Button
            className="w-full"
            onClick={() => onOpenDetail(item)}
            onPointerDown={(event) => event.stopPropagation()}
            variant="ghost"
          >
            상세 보기
          </Button>
          {nextStatus && nextLabel ? (
            <Button
              className="w-full"
              disabled={isMoving}
              onClick={() => onMoveNext(item)}
              onPointerDown={(event) => event.stopPropagation()}
              variant="secondary"
            >
              {isMoving ? "이동 중" : `${nextLabel}으로 이동`}
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

type ProductionBoardColumnProps = {
  column: { status: ProductionBoardStatus; label: string };
  items: ProductionBoardItem[];
  activeId: string | null;
  movingId: string | null;
  onOpenDetail: (item: ProductionBoardItem) => void;
  onMoveNext: (item: ProductionBoardItem) => void;
};

function ProductionBoardColumn({ column, items, activeId, movingId, onOpenDetail, onMoveNext }: ProductionBoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: column.status });

  return (
    <section
      className={cn(
        "min-h-[280px] rounded-lg border border-slate-200 bg-slate-50 p-3 transition duration-200",
        isOver ? "border-violet-300 bg-violet-50/70 shadow-sm ring-2 ring-violet-100" : "",
      )}
      key={column.status}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">{column.label}</h2>
        <Badge>{items.length}</Badge>
      </div>
      {items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <ProductionBoardCard
              isActiveDragItem={activeId === item.id}
              isMoving={movingId === item.id}
              item={item}
              key={item.id}
              onOpenDetail={onOpenDetail}
              onMoveNext={onMoveNext}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm font-medium text-slate-500">
          대기 중인 카드가 없습니다.
        </p>
      )}
    </section>
  );
}

type ProductionBoardDetailDialogProps = {
  item: ProductionBoardItem | null;
  memoValue: string;
  isMemoSaving: boolean;
  checklistItems: ProductionBoardChecklistItem[];
  checklistInput: string;
  checklistStatus: "idle" | "loading" | "ready";
  checklistAdding: boolean;
  checklistBusyId: string | null;
  isDeleting: boolean;
  isMoving: boolean;
  onAddChecklistItem: () => void;
  onAddDefaultChecklist: () => void;
  onChangeChecklistInput: (value: string) => void;
  onChangeMemo: (value: string) => void;
  onClose: () => void;
  onDeleteChecklistItem: (checklistItem: ProductionBoardChecklistItem) => void;
  onDeleteItem: (item: ProductionBoardItem) => void;
  onMoveNext: (item: ProductionBoardItem) => void;
  onSaveMemo: () => void;
  onToggleChecklistItem: (checklistItem: ProductionBoardChecklistItem) => void;
};

function ProductionBoardDetailDialog({
  item,
  memoValue,
  isMemoSaving,
  checklistItems,
  checklistInput,
  checklistStatus,
  checklistAdding,
  checklistBusyId,
  isDeleting,
  isMoving,
  onAddChecklistItem,
  onAddDefaultChecklist,
  onChangeChecklistInput,
  onChangeMemo,
  onClose,
  onDeleteChecklistItem,
  onDeleteItem,
  onMoveNext,
  onSaveMemo,
  onToggleChecklistItem,
}: ProductionBoardDetailDialogProps) {
  if (!item) {
    return null;
  }

  const label = PRODUCTION_BOARD_STATUS_LABELS[item.status];
  const nextStatus = NEXT_STATUS_MAP[item.status];
  const nextLabel = nextStatus ? PRODUCTION_BOARD_STATUS_LABELS[nextStatus] : null;
  const checklistTotal = checklistItems.length || item.checklistTotal || 0;
  const checklistDone =
    checklistItems.length > 0 ? checklistItems.filter((checklistItem) => checklistItem.isDone).length : item.checklistDone || 0;
  const checklistProgress = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const storyboardLines = storyboardPreview(item.storyboard);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" role="presentation">
      <div
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone[item.status]}>{label}</Badge>
                {item.category ? <Badge>{item.category}</Badge> : null}
                {item.status === "uploaded" ? <Badge tone="signal">완료됨</Badge> : null}
              </div>
              <h2 className="mt-3 text-xl font-bold leading-7 text-ink">{item.title}</h2>
            </div>
            <Button disabled={isMemoSaving || checklistAdding || Boolean(checklistBusyId) || isDeleting} onClick={onClose} variant="secondary">
              닫기
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <section className="space-y-4">
            {item.hook ? (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-500">후킹 문장</h3>
                <p className="mt-2 rounded-md bg-violet-50 px-3 py-2 text-sm font-semibold leading-6 text-violet-800">{item.hook}</p>
              </div>
            ) : null}

            {item.reason ? (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-500">추천 이유</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.reason}</p>
              </div>
            ) : null}

            {item.hashtags.length > 0 ? (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-500">해시태그</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.hashtags.map((tag) => (
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={tag}>
                      {normalizeHashtag(tag)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {storyboardLines.length > 0 ? (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-500">콘티</h3>
                <ol className="mt-2 space-y-2">
                  {storyboardLines.map((line, index) => (
                    <li className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700" key={`${line}-${index}`}>
                      {line}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {item.recommendationId ? (
              <Link className="inline-flex text-sm font-bold text-violet-700 hover:text-violet-900" href={`/recommendations/${item.recommendationId}`}>
                추천 상세 페이지로 이동
              </Link>
            ) : null}
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-ink">메모</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">제작하면서 참고할 내용을 적어두세요.</p>
              </div>
              <p className="text-xs font-medium text-slate-500">{memoValue.length} / 1000</p>
            </div>
            <textarea
              className="mt-3 min-h-32 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              disabled={isMemoSaving}
              maxLength={1000}
              onChange={(event) => onChangeMemo(event.target.value)}
              placeholder="예: 첫 장면은 조회수 그래프 화면으로 시작하고, 마지막에 댓글 질문 넣기"
              value={memoValue}
            />
            <div className="mt-3 flex justify-end">
              <Button disabled={isMemoSaving} onClick={onSaveMemo}>
                {isMemoSaving ? "저장 중" : "메모 저장"}
              </Button>
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">체크리스트</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">필요한 작업을 추가하고 완료 여부를 체크하세요.</p>
              </div>
              <div className="min-w-32">
                <p className="text-right text-xs font-bold text-slate-600">
                  {checklistTotal > 0 ? `${checklistDone}/${checklistTotal} 완료` : "체크리스트 없음"}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${checklistProgress}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button disabled={checklistAdding || checklistStatus === "loading"} onClick={onAddDefaultChecklist} variant="secondary">
                기본 체크리스트 추가
              </Button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto rounded-md border border-slate-200">
              {checklistStatus === "loading" ? (
                <p className="px-4 py-8 text-center text-sm font-medium text-slate-500">체크리스트를 불러오는 중입니다.</p>
              ) : checklistItems.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm font-medium text-slate-500">아직 추가된 할 일이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {checklistItems.map((checklistItem) => (
                    <li className="flex items-center gap-3 px-4 py-3" key={checklistItem.id}>
                      <input
                        checked={checklistItem.isDone}
                        className="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        disabled={checklistBusyId === checklistItem.id}
                        onChange={() => onToggleChecklistItem(checklistItem)}
                        type="checkbox"
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-sm leading-6 text-slate-700",
                          checklistItem.isDone ? "text-slate-400 line-through" : "",
                        )}
                      >
                        {checklistItem.text}
                      </span>
                      <Button
                        disabled={checklistBusyId === checklistItem.id}
                        onClick={() => onDeleteChecklistItem(checklistItem)}
                        variant="ghost"
                      >
                        삭제
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                disabled={checklistAdding || checklistStatus === "loading"}
                maxLength={200}
                onChange={(event) => onChangeChecklistInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onAddChecklistItem();
                  }
                }}
                placeholder="새 할 일 추가"
                value={checklistInput}
              />
              <Button disabled={checklistAdding || checklistStatus === "loading" || !checklistInput.trim()} onClick={onAddChecklistItem}>
                {checklistAdding ? "추가 중" : "추가"}
              </Button>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-between">
          <Button disabled={isMemoSaving || checklistAdding || Boolean(checklistBusyId) || isDeleting} onClick={() => onDeleteItem(item)} variant="danger">
            {isDeleting ? "삭제 중" : "카드 삭제"}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {nextStatus && nextLabel ? (
              <Button disabled={isMoving || isDeleting} onClick={() => onMoveNext(item)} variant="secondary">
                {isMoving ? "이동 중" : `${nextLabel}으로 이동`}
              </Button>
            ) : null}
            <Button disabled={isMemoSaving || checklistAdding || Boolean(checklistBusyId) || isDeleting} onClick={onClose} variant="secondary">
              닫기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductionBoardPage() {
  const [items, setItems] = useState<ProductionBoardItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [detailItem, setDetailItem] = useState<ProductionBoardItem | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [memoSavingId, setMemoSavingId] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<ProductionBoardChecklistItem[]>([]);
  const [checklistInput, setChecklistInput] = useState("");
  const [checklistStatus, setChecklistStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [checklistAdding, setChecklistAdding] = useState(false);
  const [checklistBusyId, setChecklistBusyId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadBoardItems() {
      try {
        const {
          data: { session },
        } = await getSupabaseBrowserClient().auth.getSession();

        if (!active) {
          return;
        }
        if (!session) {
          setStatus("unauthorized");
          return;
        }

        const productionItems = await getProductionBoardItems(controller.signal);
        if (active) {
          setItems(productionItems);
          setStatus("ready");
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "제작 보드를 불러오지 못했습니다.");
        }
      }
    }

    void loadBoardItems();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const itemsByStatus = useMemo(() => {
    return PRODUCTION_BOARD_COLUMNS.reduce<Record<ProductionBoardStatus, ProductionBoardItem[]>>(
      (grouped, column) => {
        grouped[column.status] = items.filter((item) => item.status === column.status);
        return grouped;
      },
      {
        idea: [],
        script: [],
        filming: [],
        editing: [],
        uploaded: [],
      },
    );
  }, [items]);

  async function moveItemToStatus(item: ProductionBoardItem, targetStatus: ProductionBoardStatus, successMessage: string) {
    if (movingId || item.status === targetStatus) {
      return;
    }

    const previousItems = items;
    const previousDetailItem = detailItem;
    setMovingId(item.id);
    setToast(null);
    setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, status: targetStatus } : currentItem)));
    setDetailItem((current) => (current?.id === item.id ? { ...current, status: targetStatus } : current));
    try {
      const updatedItem = await updateProductionBoardItemStatus(item.id, targetStatus);
      setItems((current) => current.map((currentItem) => (currentItem.id === updatedItem.id ? mergeBoardItemUpdate(currentItem, updatedItem) : currentItem)));
      setDetailItem((current) => (current?.id === updatedItem.id ? mergeBoardItemUpdate(current, updatedItem) : current));
      setToast({ message: successMessage, tone: "success" });
    } catch {
      setItems(previousItems);
      setDetailItem(previousDetailItem);
      setToast({ message: "상태 변경에 실패했습니다.", tone: "error" });
    } finally {
      setMovingId(null);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    const targetStatus = getProductionBoardStatus(event.over?.id);
    if (!targetStatus) {
      return;
    }

    const itemId = String(event.active.id);
    const item = items.find((currentItem) => currentItem.id === itemId);
    if (!item || item.status === targetStatus) {
      return;
    }

    await moveItemToStatus(item, targetStatus, "카드 상태가 변경되었습니다.");
  }

  function handleMoveNext(item: ProductionBoardItem) {
    const nextStatus = NEXT_STATUS_MAP[item.status];
    if (!nextStatus) {
      return;
    }

    void moveItemToStatus(item, nextStatus, "다음 단계로 이동했습니다.");
  }

  function syncChecklistSummary(boardItemId: string, nextChecklistItems: ProductionBoardChecklistItem[]) {
    const checklistTotal = nextChecklistItems.length;
    const checklistDone = nextChecklistItems.filter((checklistItem) => checklistItem.isDone).length;

    setItems((current) =>
      current.map((item) =>
        item.id === boardItemId
          ? {
              ...item,
              checklistTotal,
              checklistDone,
            }
          : item,
      ),
    );
    setDetailItem((current) => (current?.id === boardItemId ? { ...current, checklistTotal, checklistDone } : current));
  }

  async function handleOpenDetail(item: ProductionBoardItem) {
    const latestItem = items.find((currentItem) => currentItem.id === item.id) ?? item;
    setDetailItem(latestItem);
    setMemoDraft(latestItem.memo ?? "");
    setChecklistItems([]);
    setChecklistInput("");
    setChecklistStatus("loading");
    try {
      const loadedItems = await getProductionBoardChecklist(latestItem.id);
      setChecklistItems(loadedItems);
      syncChecklistSummary(latestItem.id, loadedItems);
    } catch {
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistStatus("ready");
    }
  }

  function handleCloseDetail() {
    if (memoSavingId || checklistAdding || checklistBusyId) {
      return;
    }
    setDetailItem(null);
    setMemoDraft("");
    setChecklistItems([]);
    setChecklistInput("");
    setChecklistStatus("idle");
  }

  async function handleSaveMemo() {
    if (!detailItem) {
      return;
    }

    const boardItemId = detailItem.id;
    const previousItems = items;
    const previousDetailItem = detailItem;
    const memo = memoDraft;
    setMemoSavingId(boardItemId);
    setToast(null);
    setItems((current) => current.map((item) => (item.id === boardItemId ? { ...item, memo } : item)));
    setDetailItem((current) => (current?.id === boardItemId ? { ...current, memo } : current));
    try {
      const updatedItem = await updateProductionBoardItemMemo(boardItemId, memo);
      setItems((current) => current.map((item) => (item.id === updatedItem.id ? mergeBoardItemUpdate(item, updatedItem) : item)));
      setDetailItem((current) => (current?.id === updatedItem.id ? mergeBoardItemUpdate(current, updatedItem) : current));
      setToast({ message: "메모가 저장되었습니다.", tone: "success" });
    } catch {
      setItems(previousItems);
      setDetailItem(previousDetailItem);
      setToast({ message: "메모 저장에 실패했습니다.", tone: "error" });
    } finally {
      setMemoSavingId(null);
    }
  }

  async function handleAddChecklistItem() {
    if (!detailItem) {
      return;
    }
    const text = checklistInput.trim();
    if (!text) {
      return;
    }

    setChecklistAdding(true);
    setToast(null);
    try {
      const createdItem = await createProductionBoardChecklistItem(detailItem.id, text);
      const nextItems = [...checklistItems, createdItem].sort((left, right) => left.sortOrder - right.sortOrder);
      setChecklistItems(nextItems);
      syncChecklistSummary(detailItem.id, nextItems);
      setChecklistInput("");
      setToast({ message: "체크리스트가 추가되었습니다.", tone: "success" });
    } catch {
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistAdding(false);
    }
  }

  async function handleAddDefaultChecklist() {
    if (!detailItem) {
      return;
    }

    const existingTexts = new Set(checklistItems.map((item) => item.text.trim().toLowerCase()));
    const itemsToAdd = DEFAULT_CHECKLIST_ITEMS.filter((text) => !existingTexts.has(text.toLowerCase()));
    if (itemsToAdd.length === 0) {
      setToast({ message: "이미 기본 체크리스트가 추가되어 있습니다.", tone: "info" });
      return;
    }

    setChecklistAdding(true);
    setToast(null);
    try {
      const createdItems: ProductionBoardChecklistItem[] = [];
      for (const text of itemsToAdd) {
        createdItems.push(await createProductionBoardChecklistItem(detailItem.id, text));
      }
      const nextItems = [...checklistItems, ...createdItems].sort((left, right) => left.sortOrder - right.sortOrder);
      setChecklistItems(nextItems);
      syncChecklistSummary(detailItem.id, nextItems);
      setToast({ message: "체크리스트가 추가되었습니다.", tone: "success" });
    } catch {
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistAdding(false);
    }
  }

  async function handleToggleChecklistItem(item: ProductionBoardChecklistItem) {
    if (!detailItem) {
      return;
    }

    const boardItemId = detailItem.id;
    const previousItems = checklistItems;
    const nextItems = checklistItems.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, isDone: !item.isDone } : currentItem));
    setChecklistBusyId(item.id);
    setChecklistItems(nextItems);
    syncChecklistSummary(boardItemId, nextItems);
    setToast(null);
    try {
      const updatedItem = await updateProductionBoardChecklistItem(item.id, { isDone: !item.isDone });
      const reconciledItems = nextItems.map((currentItem) => (currentItem.id === updatedItem.id ? updatedItem : currentItem));
      setChecklistItems(reconciledItems);
      syncChecklistSummary(boardItemId, reconciledItems);
      setToast({ message: "체크리스트가 업데이트되었습니다.", tone: "success" });
    } catch {
      setChecklistItems(previousItems);
      syncChecklistSummary(boardItemId, previousItems);
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistBusyId(null);
    }
  }

  async function handleDeleteChecklistItem(item: ProductionBoardChecklistItem) {
    if (!detailItem) {
      return;
    }

    const boardItemId = detailItem.id;
    const previousItems = checklistItems;
    const nextItems = checklistItems.filter((currentItem) => currentItem.id !== item.id);
    setChecklistBusyId(item.id);
    setChecklistItems(nextItems);
    syncChecklistSummary(boardItemId, nextItems);
    setToast(null);
    try {
      await deleteProductionBoardChecklistItem(item.id);
      setToast({ message: "체크리스트가 삭제되었습니다.", tone: "success" });
    } catch {
      setChecklistItems(previousItems);
      syncChecklistSummary(boardItemId, previousItems);
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistBusyId(null);
    }
  }

  async function handleDeleteItem(item: ProductionBoardItem) {
    if (deletingId || memoSavingId || checklistAdding || checklistBusyId) {
      return;
    }
    if (!window.confirm("이 제작 보드 카드를 삭제할까요?")) {
      return;
    }

    const previousItems = items;
    const previousDetailItem = detailItem;
    const previousChecklistItems = checklistItems;
    setDeletingId(item.id);
    setToast(null);
    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    setDetailItem(null);
    setChecklistItems([]);
    setChecklistInput("");
    setChecklistStatus("idle");
    try {
      await deleteProductionBoardItem(item.id);
      setToast({ message: "제작 보드 카드가 삭제되었습니다.", tone: "success" });
    } catch {
      setItems(previousItems);
      setDetailItem(previousDetailItem);
      setChecklistItems(previousChecklistItems);
      setToast({ message: "카드 삭제에 실패했습니다.", tone: "error" });
    } finally {
      setDeletingId(null);
    }
  }

  if (status === "loading") {
    return <Loading label="제작 보드를 불러오는 중입니다." />;
  }

  if (status === "unauthorized") {
    return (
      <EmptyState
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
        description="제작 보드는 로그인 후 사용할 수 있습니다."
        title="로그인이 필요합니다"
      />
    );
  }

  if (status === "error") {
    return <EmptyState title="제작 보드를 불러오지 못했습니다" description={message || "잠시 후 다시 시도해 주세요."} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <Link href={ROUTES.favorites}>
            <Button>찜한 아이디어 보기</Button>
          </Link>
        }
        description="찜한 추천 아이디어 중 실제로 제작할 콘텐츠만 모아두는 보드입니다."
        title="제작 보드"
      />

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

      {items.length === 0 ? (
        <EmptyState
          action={
            <Link href={ROUTES.favorites}>
              <Button>찜한 아이디어에서 추가하기</Button>
            </Link>
          }
          description="찜한 아이디어에서 제작 보드에 추가해보세요."
          title="아직 제작 보드에 추가된 아이디어가 없습니다"
        />
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={(event) => void handleDragEnd(event)}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <div className="grid gap-4 xl:grid-cols-5">
            {PRODUCTION_BOARD_COLUMNS.map((column) => (
              <ProductionBoardColumn
                activeId={activeId}
                column={column}
                items={itemsByStatus[column.status]}
                key={column.status}
                movingId={movingId}
                onOpenDetail={(item) => void handleOpenDetail(item)}
                onMoveNext={handleMoveNext}
              />
            ))}
          </div>
        </DndContext>
      )}
      <ProductionBoardDetailDialog
        checklistAdding={checklistAdding}
        checklistBusyId={checklistBusyId}
        checklistInput={checklistInput}
        checklistItems={checklistItems}
        checklistStatus={checklistStatus}
        isDeleting={Boolean(detailItem && deletingId === detailItem.id)}
        isMemoSaving={Boolean(memoSavingId)}
        isMoving={Boolean(detailItem && movingId === detailItem.id)}
        item={detailItem}
        memoValue={memoDraft}
        onAddChecklistItem={() => void handleAddChecklistItem()}
        onAddDefaultChecklist={() => void handleAddDefaultChecklist()}
        onChangeChecklistInput={setChecklistInput}
        onChangeMemo={setMemoDraft}
        onClose={handleCloseDetail}
        onDeleteChecklistItem={(item) => void handleDeleteChecklistItem(item)}
        onDeleteItem={(item) => void handleDeleteItem(item)}
        onMoveNext={handleMoveNext}
        onSaveMemo={() => void handleSaveMemo()}
        onToggleChecklistItem={(item) => void handleToggleChecklistItem(item)}
      />
    </div>
  );
}
