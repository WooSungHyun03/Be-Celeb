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

type ToastState = {
  message: string;
  tone: "success" | "error" | "info";
};

type ProductionBoardCardProps = {
  item: ProductionBoardItem;
  isMoving: boolean;
  isActiveDragItem: boolean;
  onEditMemo: (item: ProductionBoardItem) => void;
  onOpenChecklist: (item: ProductionBoardItem) => void;
  onMoveNext: (item: ProductionBoardItem) => void;
};

function ProductionBoardCard({ item, isMoving, isActiveDragItem, onEditMemo, onOpenChecklist, onMoveNext }: ProductionBoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { status: item.status },
    disabled: isMoving,
  });
  const label = PRODUCTION_BOARD_STATUS_LABELS[item.status];
  const nextStatus = NEXT_STATUS_MAP[item.status];
  const nextLabel = nextStatus ? PRODUCTION_BOARD_STATUS_LABELS[nextStatus] : null;
  const visibleTags = item.hashtags.slice(0, 4);
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
        <h2 className="mt-3 text-base font-bold leading-6 text-ink">{item.title}</h2>
        {item.hook ? <p className="mt-3 rounded-md bg-violet-50 px-3 py-2 text-sm font-semibold leading-6 text-violet-800">{item.hook}</p> : null}
        {visibleTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={tag}>
                {normalizeHashtag(tag)}
              </span>
            ))}
          </div>
        ) : null}
        {item.recommendationId ? (
          <Link
            className="mt-4 inline-flex text-sm font-bold text-violet-700 hover:text-violet-900"
            href={`/recommendations/${item.recommendationId}`}
            onPointerDown={(event) => event.stopPropagation()}
          >
            추천 상세 보기
          </Link>
        ) : null}
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase text-slate-500">메모</span>
            {memoText ? <Badge tone="info">메모 있음</Badge> : null}
          </div>
          {memoText ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">{memoText}</p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-500">제작하면서 참고할 내용을 남겨보세요.</p>
          )}
          <Button
            className="mt-3 w-full"
            onClick={() => onEditMemo(item)}
            onPointerDown={(event) => event.stopPropagation()}
            variant="ghost"
          >
            {memoText ? "메모 수정" : "메모 추가"}
          </Button>
        </div>
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase text-slate-500">체크리스트</span>
            <span className="text-xs font-bold text-slate-600">
              {checklistTotal > 0 ? `${checklistDone}/${checklistTotal} 완료` : "없음"}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${checklistProgress}%` }} />
          </div>
          <Button
            className="mt-3 w-full"
            onClick={() => onOpenChecklist(item)}
            onPointerDown={(event) => event.stopPropagation()}
            variant="ghost"
          >
            {checklistTotal > 0 ? "체크리스트" : "체크리스트 추가"}
          </Button>
        </div>
        {nextStatus && nextLabel ? (
          <Button
            className="mt-4 w-full"
            disabled={isMoving}
            onClick={() => onMoveNext(item)}
            onPointerDown={(event) => event.stopPropagation()}
            variant="secondary"
          >
            {isMoving ? "이동 중" : `${nextLabel}으로 이동`}
          </Button>
        ) : null}
      </Card>
    </div>
  );
}

type ProductionBoardColumnProps = {
  column: { status: ProductionBoardStatus; label: string };
  items: ProductionBoardItem[];
  activeId: string | null;
  movingId: string | null;
  onEditMemo: (item: ProductionBoardItem) => void;
  onOpenChecklist: (item: ProductionBoardItem) => void;
  onMoveNext: (item: ProductionBoardItem) => void;
};

function ProductionBoardColumn({ column, items, activeId, movingId, onEditMemo, onOpenChecklist, onMoveNext }: ProductionBoardColumnProps) {
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
              onEditMemo={onEditMemo}
              onOpenChecklist={onOpenChecklist}
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

type MemoDialogProps = {
  item: ProductionBoardItem | null;
  value: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

function MemoDialog({ item, value, isSaving, onChange, onClose, onSave }: MemoDialogProps) {
  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" role="presentation">
      <div
        aria-modal="true"
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <div>
          <Badge tone="brand">Production note</Badge>
          <h2 className="mt-3 text-xl font-bold text-ink">메모 작성</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">이 콘텐츠를 제작하면서 참고할 내용을 적어보세요.</p>
          <p className="mt-4 line-clamp-2 text-sm font-semibold leading-6 text-slate-800">{item.title}</p>
        </div>
        <textarea
          className="mt-5 min-h-44 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
          maxLength={1000}
          onChange={(event) => onChange(event.target.value)}
          placeholder="예: 첫 장면은 조회수 그래프 화면으로 시작하고, 마지막에 댓글 질문 넣기"
          value={value}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-500">{value.length} / 1000</p>
          <div className="flex justify-end gap-2">
            <Button disabled={isSaving} onClick={onClose} variant="secondary">
              취소
            </Button>
            <Button disabled={isSaving} onClick={onSave}>
              {isSaving ? "저장 중" : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ChecklistDialogProps = {
  item: ProductionBoardItem | null;
  checklistItems: ProductionBoardChecklistItem[];
  inputValue: string;
  isLoading: boolean;
  isAdding: boolean;
  busyId: string | null;
  onAdd: () => void;
  onAddTemplate: () => void;
  onChangeInput: (value: string) => void;
  onClose: () => void;
  onDelete: (checklistItem: ProductionBoardChecklistItem) => void;
  onToggle: (checklistItem: ProductionBoardChecklistItem) => void;
};

function ChecklistDialog({
  item,
  checklistItems,
  inputValue,
  isLoading,
  isAdding,
  busyId,
  onAdd,
  onAddTemplate,
  onChangeInput,
  onClose,
  onDelete,
  onToggle,
}: ChecklistDialogProps) {
  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" role="presentation">
      <div
        aria-modal="true"
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge tone="brand">Production tasks</Badge>
            <h2 className="mt-3 text-xl font-bold text-ink">체크리스트</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">이 콘텐츠를 제작하기 위해 필요한 작업을 관리하세요.</p>
            <p className="mt-4 line-clamp-2 text-sm font-semibold leading-6 text-slate-800">{item.title}</p>
          </div>
          <Button disabled={isAdding || isLoading} onClick={onAddTemplate} variant="secondary">
            기본 체크리스트 추가
          </Button>
        </div>

        <div className="mt-5 max-h-80 overflow-y-auto rounded-md border border-slate-200">
          {isLoading ? (
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
                    disabled={busyId === checklistItem.id}
                    onChange={() => onToggle(checklistItem)}
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
                  <Button disabled={busyId === checklistItem.id} onClick={() => onDelete(checklistItem)} variant="ghost">
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
            disabled={isAdding || isLoading}
            maxLength={200}
            onChange={(event) => onChangeInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAdd();
              }
            }}
            placeholder="새 할 일 추가"
            value={inputValue}
          />
          <Button disabled={isAdding || isLoading || !inputValue.trim()} onClick={onAdd}>
            {isAdding ? "추가 중" : "추가"}
          </Button>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            닫기
          </Button>
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [memoItem, setMemoItem] = useState<ProductionBoardItem | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [memoSavingId, setMemoSavingId] = useState<string | null>(null);
  const [checklistItem, setChecklistItem] = useState<ProductionBoardItem | null>(null);
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
    setMovingId(item.id);
    setToast(null);
    setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, status: targetStatus } : currentItem)));
    try {
      const updatedItem = await updateProductionBoardItemStatus(item.id, targetStatus);
      setItems((current) => current.map((currentItem) => (currentItem.id === updatedItem.id ? mergeBoardItemUpdate(currentItem, updatedItem) : currentItem)));
      setToast({ message: successMessage, tone: "success" });
    } catch {
      setItems(previousItems);
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

  function handleOpenMemo(item: ProductionBoardItem) {
    setMemoItem(item);
    setMemoDraft(item.memo ?? "");
  }

  function handleCloseMemo() {
    if (memoSavingId) {
      return;
    }
    setMemoItem(null);
    setMemoDraft("");
  }

  async function handleSaveMemo() {
    if (!memoItem) {
      return;
    }

    const previousItems = items;
    const memo = memoDraft;
    setMemoSavingId(memoItem.id);
    setToast(null);
    setItems((current) => current.map((item) => (item.id === memoItem.id ? { ...item, memo } : item)));
    try {
      const updatedItem = await updateProductionBoardItemMemo(memoItem.id, memo);
      setItems((current) => current.map((item) => (item.id === updatedItem.id ? mergeBoardItemUpdate(item, updatedItem) : item)));
      setToast({ message: "메모가 저장되었습니다.", tone: "success" });
      setMemoItem(null);
      setMemoDraft("");
    } catch {
      setItems(previousItems);
      setToast({ message: "메모 저장에 실패했습니다.", tone: "error" });
    } finally {
      setMemoSavingId(null);
    }
  }

  function syncChecklistSummary(boardItemId: string, nextChecklistItems: ProductionBoardChecklistItem[]) {
    setItems((current) =>
      current.map((item) =>
        item.id === boardItemId
          ? {
              ...item,
              checklistTotal: nextChecklistItems.length,
              checklistDone: nextChecklistItems.filter((checklistItem) => checklistItem.isDone).length,
            }
          : item,
      ),
    );
  }

  async function handleOpenChecklist(item: ProductionBoardItem) {
    setChecklistItem(item);
    setChecklistItems([]);
    setChecklistInput("");
    setChecklistStatus("loading");
    try {
      const loadedItems = await getProductionBoardChecklist(item.id);
      setChecklistItems(loadedItems);
      syncChecklistSummary(item.id, loadedItems);
    } catch {
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistStatus("ready");
    }
  }

  function handleCloseChecklist() {
    if (checklistAdding || checklistBusyId) {
      return;
    }
    setChecklistItem(null);
    setChecklistItems([]);
    setChecklistInput("");
    setChecklistStatus("idle");
  }

  async function handleAddChecklistItem() {
    if (!checklistItem) {
      return;
    }
    const text = checklistInput.trim();
    if (!text) {
      return;
    }

    setChecklistAdding(true);
    setToast(null);
    try {
      const createdItem = await createProductionBoardChecklistItem(checklistItem.id, text);
      const nextItems = [...checklistItems, createdItem].sort((left, right) => left.sortOrder - right.sortOrder);
      setChecklistItems(nextItems);
      syncChecklistSummary(checklistItem.id, nextItems);
      setChecklistInput("");
      setToast({ message: "체크리스트가 추가되었습니다.", tone: "success" });
    } catch {
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistAdding(false);
    }
  }

  async function handleAddDefaultChecklist() {
    if (!checklistItem) {
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
        createdItems.push(await createProductionBoardChecklistItem(checklistItem.id, text));
      }
      const nextItems = [...checklistItems, ...createdItems].sort((left, right) => left.sortOrder - right.sortOrder);
      setChecklistItems(nextItems);
      syncChecklistSummary(checklistItem.id, nextItems);
      setToast({ message: "체크리스트가 추가되었습니다.", tone: "success" });
    } catch {
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistAdding(false);
    }
  }

  async function handleToggleChecklistItem(item: ProductionBoardChecklistItem) {
    if (!checklistItem) {
      return;
    }

    const previousItems = checklistItems;
    const nextItems = checklistItems.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, isDone: !item.isDone } : currentItem));
    setChecklistBusyId(item.id);
    setChecklistItems(nextItems);
    syncChecklistSummary(checklistItem.id, nextItems);
    setToast(null);
    try {
      const updatedItem = await updateProductionBoardChecklistItem(item.id, { isDone: !item.isDone });
      const reconciledItems = nextItems.map((currentItem) => (currentItem.id === updatedItem.id ? updatedItem : currentItem));
      setChecklistItems(reconciledItems);
      syncChecklistSummary(checklistItem.id, reconciledItems);
      setToast({ message: "체크리스트가 업데이트되었습니다.", tone: "success" });
    } catch {
      setChecklistItems(previousItems);
      syncChecklistSummary(checklistItem.id, previousItems);
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistBusyId(null);
    }
  }

  async function handleDeleteChecklistItem(item: ProductionBoardChecklistItem) {
    if (!checklistItem) {
      return;
    }

    const previousItems = checklistItems;
    const nextItems = checklistItems.filter((currentItem) => currentItem.id !== item.id);
    setChecklistBusyId(item.id);
    setChecklistItems(nextItems);
    syncChecklistSummary(checklistItem.id, nextItems);
    setToast(null);
    try {
      await deleteProductionBoardChecklistItem(item.id);
      setToast({ message: "체크리스트가 삭제되었습니다.", tone: "success" });
    } catch {
      setChecklistItems(previousItems);
      syncChecklistSummary(checklistItem.id, previousItems);
      setToast({ message: "체크리스트 처리에 실패했습니다.", tone: "error" });
    } finally {
      setChecklistBusyId(null);
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
                onEditMemo={handleOpenMemo}
                onOpenChecklist={(item) => void handleOpenChecklist(item)}
                onMoveNext={handleMoveNext}
              />
            ))}
          </div>
        </DndContext>
      )}
      <MemoDialog
        isSaving={Boolean(memoSavingId)}
        item={memoItem}
        onChange={setMemoDraft}
        onClose={handleCloseMemo}
        onSave={() => void handleSaveMemo()}
        value={memoDraft}
      />
      <ChecklistDialog
        busyId={checklistBusyId}
        checklistItems={checklistItems}
        inputValue={checklistInput}
        isAdding={checklistAdding}
        isLoading={checklistStatus === "loading"}
        item={checklistItem}
        onAdd={() => void handleAddChecklistItem()}
        onAddTemplate={() => void handleAddDefaultChecklist()}
        onChangeInput={setChecklistInput}
        onClose={handleCloseChecklist}
        onDelete={(item) => void handleDeleteChecklistItem(item)}
        onToggle={(item) => void handleToggleChecklistItem(item)}
      />
    </div>
  );
}
