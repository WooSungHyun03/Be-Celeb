"use client";

// Renders saved AI recommendation favorites.
import { useEffect, useState } from "react";
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
    hashtags: asStringArray(recommendation.hashtags).slice(0, 5),
  };
}

export default function SavedPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const recommendation = getSavedRecommendation(item);

            return (
              <Card className="flex h-full flex-col" key={item.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{recommendation.category}</Badge>
                  <Badge>{recommendation.channelTitle}</Badge>
                </div>
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
    </div>
  );
}
