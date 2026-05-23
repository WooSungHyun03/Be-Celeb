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
import { createCalendarEvent } from "@/lib/api/calendar";
import { deleteFavorite, getFavorites, type FavoriteItem } from "@/lib/api/favorites";
import { addFavoriteToProductionBoard, getProductionBoardItems, type ProductionBoardItem } from "@/lib/api/production-board";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import { ApiClientError } from "@/lib/client/api";

type FavoriteView = {
  title: string;
  reason: string;
  category: string;
  channelTitle: string;
  hashtags: string[];
  storyboardSummary: string[];
};

type ToastState = {
  message: string;
  tone: "success" | "error" | "info";
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function storyboardSummary(item: FavoriteItem) {
  const scenes = Array.isArray(item.storyboard) ? item.storyboard : [];
  return scenes
    .slice(0, 3)
    .map((scene, index) => {
      const record = asRecord(scene);
      return asString(record.visual, asString(record.description, `Scene ${index + 1}`));
    })
    .filter(Boolean);
}

function getFavoriteView(item: FavoriteItem): FavoriteView {
  const metadata = asRecord(item.metadata);
  const source = asRecord(item.source);
  const recommendation = asRecord(metadata.recommendation ?? source.recommendation);
  const channel = asRecord(metadata.channel ?? source.channel);

  return {
    title: asString(item.title, asString(recommendation.title, "저장한 추천 콘텐츠")),
    reason: asString(item.reason, asString(recommendation.reason, "추천 이유 정보가 없습니다.")),
    category: asString(metadata.selectedCategory, asString(source.selectedCategory, "추천")),
    channelTitle: asString(channel.title, "YouTube 채널"),
    hashtags: (item.hashtags?.length ? item.hashtags : asStringArray(recommendation.hashtags)).slice(0, 6),
    storyboardSummary: storyboardSummary(item),
  };
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function findBoardItemForFavorite(item: FavoriteItem, boardItems: ProductionBoardItem[]) {
  const recommendationId = item.recommendationId ?? item.targetId;
  return boardItems.find((boardItem) => {
    const matchesRecommendation = Boolean(recommendationId && boardItem.recommendationId === recommendationId);
    const matchesFavorite = Boolean(boardItem.favoriteId && boardItem.favoriteId === item.id);
    return matchesRecommendation || matchesFavorite;
  });
}

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [boardItems, setBoardItems] = useState<ProductionBoardItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [boardAddingId, setBoardAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [scheduleDates, setScheduleDates] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => getFavoriteView(item).category)))
      .filter((category) => category !== "추천")
      .sort((left, right) => left.localeCompare(right, "ko-KR"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const favorite = getFavoriteView(item);
      const matchesCategory = selectedCategory === "all" || favorite.category === selectedCategory;
      const searchable = [favorite.title, favorite.reason, favorite.category, favorite.channelTitle, favorite.hashtags.join(" ")].join(" ").toLowerCase();
      return matchesCategory && (!query || searchable.includes(query));
    });
  }, [items, searchQuery, selectedCategory]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadFavorites() {
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

        const [favorites, productionBoardItems] = await Promise.all([
          getFavorites({ type: "recommendation" }, controller.signal),
          getProductionBoardItems(controller.signal),
        ]);
        if (active) {
          setItems(favorites);
          setBoardItems(productionBoardItems);
          setStatus("ready");
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "즐겨찾기를 불러오지 못했습니다.");
        }
      }
    }

    void loadFavorites();

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

  async function handleDelete(favoriteId: string) {
    setDeletingId(favoriteId);
    setMessage("");
    try {
      await deleteFavorite(favoriteId);
      setItems((current) => current.filter((item) => item.id !== favoriteId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "즐겨찾기 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSchedule(item: FavoriteItem) {
    const date = scheduleDates[item.id] || todayIsoDate();
    const favorite = getFavoriteView(item);
    setSchedulingId(item.id);
    setMessage("");
    try {
      await createCalendarEvent({
        favoriteId: item.id,
        title: favorite.title,
        description: favorite.reason,
        scheduledDate: date,
        status: "planned",
        platform: "youtube",
        metadata: {
          recommendationId: item.recommendationId ?? item.targetId,
          source: "favorites",
        },
      });
      setMessage(`${date} 일정으로 추가했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "캘린더 일정 추가에 실패했습니다.");
    } finally {
      setSchedulingId(null);
    }
  }

  async function handleAddToBoard(item: FavoriteItem) {
    const recommendationId = item.recommendationId ?? item.targetId;
    if (!recommendationId) {
      setToast({ message: "제작 보드에 추가할 추천 ID를 찾지 못했습니다.", tone: "error" });
      return;
    }

    setBoardAddingId(item.id);
    setMessage("");
    try {
      const boardItem = await addFavoriteToProductionBoard({
        favoriteId: item.id,
        recommendationId,
      });
      setBoardItems((current) => (current.some((existing) => existing.id === boardItem.id) ? current : [boardItem, ...current]));
      setToast({ message: "제작 보드에 추가했습니다.", tone: "success" });
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "ALREADY_ADDED") {
        setToast({ message: "이미 제작 보드에 추가된 아이디어입니다.", tone: "info" });
        try {
          setBoardItems(await getProductionBoardItems());
        } catch {
          // Duplicate state is already enough for the user.
        }
        return;
      }
      setToast({ message: "제작 보드 추가에 실패했습니다.", tone: "error" });
    } finally {
      setBoardAddingId(null);
    }
  }

  if (status === "loading") {
    return <Loading label="즐겨찾기를 불러오는 중입니다." />;
  }

  if (status === "unauthorized") {
    return (
      <EmptyState
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
        description="즐겨찾기한 추천 콘텐츠는 로그인 후 확인할 수 있습니다."
        title="로그인이 필요합니다"
      />
    );
  }

  if (status === "error") {
    return <EmptyState title="즐겨찾기를 불러오지 못했습니다" description={message || "잠시 후 다시 시도해 주세요."} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.productionBoard}>
              <Button variant="secondary">제작 보드</Button>
            </Link>
            <Link href={ROUTES.dashboard}>
              <Button>새 추천 생성</Button>
            </Link>
          </div>
        }
        description="추천 결과에서 저장한 콘텐츠 아이디어를 모아보고 업로드 일정이나 제작 보드로 바로 연결할 수 있습니다."
        title="즐겨찾기"
      />

      {toast || message ? (
        <div className="grid gap-2">
          {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
          {message ? <p className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</p> : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          action={
            <Link href={ROUTES.dashboard}>
              <Button>추천 생성하기</Button>
            </Link>
          }
          description="대시보드에서 추천 결과를 만든 뒤 결과 페이지에서 즐겨찾기 추가를 눌러보세요."
          title="즐겨찾기한 추천 콘텐츠가 없습니다"
        />
      ) : (
        <>
          <section className="grid gap-3 rounded-xl border border-violet-100 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_auto] lg:items-end">
            <label className="block text-sm font-semibold text-slate-700">
              <span>검색</span>
              <input
                className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="제목, 이유, 해시태그 검색"
                value={searchQuery}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              <span>카테고리</span>
              <select
                className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setSelectedCategory(event.target.value)}
                value={selectedCategory}
              >
                <option value="all">전체 카테고리</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm font-bold text-slate-500 lg:text-right">
              {filteredItems.length} / {items.length}개
            </p>
          </section>

          {filteredItems.length === 0 ? (
            <EmptyState title="조건에 맞는 즐겨찾기가 없습니다" description="검색어와 카테고리 필터를 조정해 보세요." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredItems.map((item) => {
                const favorite = getFavoriteView(item);
                const detailId = item.recommendationId ?? item.targetId;
                const boardItem = findBoardItemForFavorite(item, boardItems);
                return (
                  <Card className="flex h-full flex-col" key={item.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{favorite.category}</Badge>
                      <Badge>{favorite.channelTitle}</Badge>
                    </div>
                    <h2 className="mt-4 text-xl font-black leading-7 text-ink">{favorite.title}</h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{favorite.reason}</p>
                    {favorite.hashtags.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {favorite.hashtags.map((tag) => (
                          <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700" key={tag}>
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {favorite.storyboardSummary.length > 0 ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-bold uppercase text-slate-500">콘티 요약</p>
                        <ul className="mt-2 grid gap-1 text-sm leading-6 text-slate-700">
                          {favorite.storyboardSummary.map((summary) => (
                            <li className="line-clamp-1" key={summary}>
                              {summary}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="mt-auto pt-5">
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <input
                          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          onChange={(event) => setScheduleDates((current) => ({ ...current, [item.id]: event.target.value }))}
                          type="date"
                          value={scheduleDates[item.id] ?? todayIsoDate()}
                        />
                        <Button disabled={schedulingId === item.id} onClick={() => void handleSchedule(item)} variant="secondary">
                          {schedulingId === item.id ? "추가 중..." : "캘린더에 추가"}
                        </Button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.targetType === "recommendation" ? (
                          boardItem ? (
                            <Link href={ROUTES.productionBoard}>
                              <Button variant="secondary">보드에서 보기</Button>
                            </Link>
                          ) : (
                            <Button disabled={boardAddingId === item.id} onClick={() => void handleAddToBoard(item)}>
                              {boardAddingId === item.id ? "추가 중..." : "제작 보드에 추가"}
                            </Button>
                          )
                        ) : null}
                        {detailId ? (
                          <Link href={`/recommendations/${detailId}`}>
                            <Button variant="secondary">상세 보기</Button>
                          </Link>
                        ) : null}
                        <Button disabled={deletingId === item.id} onClick={() => void handleDelete(item.id)} variant="ghost">
                          {deletingId === item.id ? "삭제 중..." : "삭제"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
