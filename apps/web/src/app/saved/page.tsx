"use client";

// Renders saved AI recommendation favorites.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTES } from "@/constants/routes";
import { deleteFavorite, getFavorites, type FavoriteItem } from "@/lib/api/favorites";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

type SavedRecommendation = {
  title: string;
  reason: string;
  hook: string;
  category: string;
  channelTitle: string;
  channelUrl: string;
  hashtags: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function getSavedRecommendation(item: FavoriteItem): SavedRecommendation {
  const metadata = asRecord(item.metadata);
  const recommendation = asRecord(metadata.recommendation);
  const channel = asRecord(metadata.channel);

  return {
    title: asString(item.title, asString(recommendation.title, "저장한 추천 콘텐츠")),
    reason: asString(recommendation.reason, "추천 결과 상세에서 전체 내용을 확인할 수 있습니다."),
    hook: asString(recommendation.hook),
    category: asString(metadata.selectedCategory, "추천"),
    channelTitle: asString(channel.title, "YouTube 채널"),
    channelUrl: asString(channel.channelUrl),
    hashtags: asStringArray(recommendation.hashtags).slice(0, 5),
  };
}

export default function SavedPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => getSavedRecommendation(item).category)))
      .filter((category) => category !== "추천")
      .sort((left, right) => left.localeCompare(right, "ko-KR"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const recommendation = getSavedRecommendation(item);
      const matchesCategory = selectedCategory === "all" || recommendation.category === selectedCategory;
      const searchableText = [
        recommendation.title,
        recommendation.reason,
        recommendation.hook,
        recommendation.category,
        recommendation.channelTitle,
        recommendation.channelUrl,
        recommendation.hashtags.join(" "),
      ].join(" ").toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);

      return matchesCategory && matchesSearch;
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

        const favorites = await getFavorites({ type: "recommendation" }, controller.signal);
        if (active) {
          setItems(favorites);
          setStatus("ready");
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "저장한 추천 콘텐츠를 불러오지 못했습니다.");
        }
      }
    }

    void loadFavorites();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  async function handleDelete(favoriteId: string) {
    setDeletingId(favoriteId);
    setMessage("");

    try {
      await deleteFavorite(favoriteId);
      setItems((current) => current.filter((item) => item.id !== favoriteId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "찜 해제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  if (status === "loading") {
    return <Loading label="저장한 추천 콘텐츠를 불러오는 중입니다." />;
  }

  if (status === "unauthorized") {
    return (
      <EmptyState
        title="로그인이 필요합니다"
        description="찜한 추천 콘텐츠는 로그인 후 확인할 수 있습니다."
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
      />
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="저장 목록을 불러오지 못했습니다"
        description={message || "잠시 후 다시 시도해 주세요."}
        action={
          <Link href={ROUTES.dashboard}>
            <Button variant="secondary">대시보드로 이동</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="저장한 추천 콘텐츠"
        description="대시보드에서 생성한 AI 추천 중 찜해둔 아이디어를 다시 확인하세요."
        action={
          <Link href={ROUTES.dashboard}>
            <Button>새 추천 생성</Button>
          </Link>
        }
      />

      {message ? <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{message}</p> : null}

      {items.length === 0 ? (
        <EmptyState
          title="찜한 추천 콘텐츠가 없습니다"
          description="대시보드에서 추천 결과를 생성한 뒤 결과 페이지에서 찜하기를 눌러보세요."
          action={
            <Link href={ROUTES.dashboard}>
              <Button>추천 생성하기</Button>
            </Link>
          }
        />
      ) : (
        <>
          <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_auto] lg:items-end">
            <label className="block text-sm font-semibold text-slate-700">
              <span>검색</span>
              <input
                className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="채널 URL, 채널명, 제목, 해시태그 검색"
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
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <p className="text-xs font-bold text-slate-500">
                {filteredItems.length} / {items.length}개
              </p>
              <Button
                disabled={selectedCategory === "all" && !searchQuery}
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                variant="secondary"
              >
                초기화
              </Button>
            </div>
          </section>

          {filteredItems.length === 0 ? (
            <EmptyState
              title="조건에 맞는 찜이 없습니다"
              description="검색어를 바꾸거나 카테고리 필터를 초기화해 보세요."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                >
                  필터 초기화
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredItems.map((item) => {
                const recommendation = getSavedRecommendation(item);

                return (
                  <Card className="flex h-full flex-col" key={item.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{recommendation.category}</Badge>
                      <Badge>{recommendation.channelTitle}</Badge>
                    </div>
                    {recommendation.channelUrl ? (
                      <a
                        className="mt-3 line-clamp-1 break-all text-xs font-semibold text-violet-700 hover:underline"
                        href={recommendation.channelUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {recommendation.channelUrl}
                      </a>
                    ) : null}
                    <h2 className="mt-4 line-clamp-2 text-xl font-bold leading-7 text-ink">{recommendation.title}</h2>
                    {recommendation.hook ? (
                      <p className="mt-3 rounded-md bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800">{recommendation.hook}</p>
                    ) : null}
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{recommendation.reason}</p>
                    {recommendation.hashtags.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {recommendation.hashtags.map((tag) => (
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={tag}>
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={`/recommendations/${item.targetId}`}>
                        <Button variant="secondary">상세 보기</Button>
                      </Link>
                      <Button disabled={deletingId === item.id} onClick={() => void handleDelete(item.id)} variant="ghost">
                        {deletingId === item.id ? "해제 중" : "찜 해제"}
                      </Button>
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
