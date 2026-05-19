"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Toast } from "@/components/common/Toast";
import { ROUTES } from "@/constants/routes";
import { getProductionBoardItems, updateProductionBoardItemStatus } from "@/lib/api/production-board";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import {
  NEXT_STATUS_MAP,
  PRODUCTION_BOARD_STATUS_LABELS,
  productionBoardColumns,
  type ProductionBoardItem,
  type ProductionBoardStatus,
} from "@/types/production-board";

const statusTone: Record<ProductionBoardStatus, "brand" | "info" | "warning" | "signal" | "default"> = {
  idea: "brand",
  script: "info",
  filming: "warning",
  editing: "signal",
  uploaded: "default",
};

function normalizeHashtag(tag: string) {
  return tag.startsWith("#") ? tag : `#${tag}`;
}

type ToastState = {
  message: string;
  tone: "success" | "error" | "info";
};

type ProductionBoardCardProps = {
  item: ProductionBoardItem;
  isMoving: boolean;
  onMoveNext: (item: ProductionBoardItem) => void;
};

function ProductionBoardCard({ item, isMoving, onMoveNext }: ProductionBoardCardProps) {
  const label = PRODUCTION_BOARD_STATUS_LABELS[item.status];
  const nextStatus = NEXT_STATUS_MAP[item.status];
  const nextLabel = nextStatus ? PRODUCTION_BOARD_STATUS_LABELS[nextStatus] : null;
  const visibleTags = item.hashtags.slice(0, 4);

  return (
    <Card className="p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
        <Link className="mt-4 inline-flex text-sm font-bold text-violet-700 hover:text-violet-900" href={`/recommendations/${item.recommendationId}`}>
          추천 상세 보기
        </Link>
      ) : null}
      {nextStatus && nextLabel ? (
        <Button className="mt-4 w-full" disabled={isMoving} onClick={() => onMoveNext(item)} variant="secondary">
          {isMoving ? "이동 중" : `${nextLabel}으로 이동`}
        </Button>
      ) : null}
    </Card>
  );
}

export default function ProductionBoardPage() {
  const [items, setItems] = useState<ProductionBoardItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

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
    return productionBoardColumns.reduce<Record<ProductionBoardStatus, ProductionBoardItem[]>>(
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

  async function handleMoveNext(item: ProductionBoardItem) {
    const nextStatus = NEXT_STATUS_MAP[item.status];
    if (!nextStatus) {
      return;
    }

    setMovingId(item.id);
    setToast(null);
    try {
      const updatedItem = await updateProductionBoardItemStatus(item.id, nextStatus);
      setItems((current) => current.map((currentItem) => (currentItem.id === updatedItem.id ? updatedItem : currentItem)));
      setToast({ message: "다음 단계로 이동했습니다.", tone: "success" });
    } catch (error) {
      const detail = error instanceof Error && error.message.trim() ? error.message : "";
      setToast({ message: detail ? `상태 변경에 실패했습니다. ${detail}` : "상태 변경에 실패했습니다.", tone: "error" });
    } finally {
      setMovingId(null);
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
        <div className="grid gap-4 xl:grid-cols-5">
          {productionBoardColumns.map((column) => {
            const columnItems = itemsByStatus[column.status];
            return (
              <section className="min-h-[280px] rounded-lg border border-slate-200 bg-slate-50 p-3" key={column.status}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-ink">{column.label}</h2>
                  <Badge>{columnItems.length}</Badge>
                </div>
                {columnItems.length > 0 ? (
                  <div className="grid gap-3">
                    {columnItems.map((item) => (
                      <ProductionBoardCard isMoving={movingId === item.id} item={item} key={item.id} onMoveNext={handleMoveNext} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm font-medium text-slate-500">
                    대기 중인 카드가 없습니다.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
