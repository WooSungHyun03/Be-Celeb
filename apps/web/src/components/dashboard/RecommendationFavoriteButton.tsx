"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/common/Button";
import { addFavorite, deleteFavoriteByTarget, getFavorites } from "@/lib/api/favorites";
import type { RecommendationDetailResponse } from "@/types/content-recommendation";

type RecommendationFavoriteButtonProps = {
  result: RecommendationDetailResponse;
};

export function RecommendationFavoriteButton({ result }: RecommendationFavoriteButtonProps) {
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "idle" | "saving" | "error">("checking");
  const [message, setMessage] = useState("");
  const isFavorited = Boolean(favoriteId);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setStatus("checking");
    setMessage("");
    getFavorites({ type: "recommendation", targetId: result.recommendationId }, controller.signal)
      .then((items) => {
        if (!active) {
          return;
        }
        setFavoriteId(items[0]?.id ?? null);
        setStatus("idle");
      })
      .catch((error) => {
        if (!active || controller.signal.aborted) {
          return;
        }
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "찜 상태를 불러오지 못했습니다.");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [result.recommendationId]);

  async function handleToggle() {
    setStatus("saving");
    setMessage("");

    try {
      if (isFavorited) {
        await deleteFavoriteByTarget("recommendation", result.recommendationId);
        setFavoriteId(null);
        setStatus("idle");
        return;
      }

      const favorite = await addFavorite({
        targetType: "recommendation",
        targetId: result.recommendationId,
        title: result.recommendation.title,
      });
      setFavoriteId(favorite.id);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "찜 처리에 실패했습니다.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button disabled={status === "checking" || status === "saving"} onClick={handleToggle} variant={isFavorited ? "secondary" : "primary"}>
        {status === "checking" ? "찜 상태 확인 중" : status === "saving" ? "저장 중" : isFavorited ? "찜 해제" : "찜하기"}
      </Button>
      {message ? <p className="text-xs font-semibold text-rose-600">{message}</p> : null}
    </div>
  );
}
