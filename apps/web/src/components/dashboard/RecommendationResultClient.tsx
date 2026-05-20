"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { LoadingSteps } from "@/components/dashboard/LoadingSteps";
import { RecommendationFavoriteButton } from "@/components/dashboard/RecommendationFavoriteButton";
import { RecommendationResult } from "@/components/dashboard/RecommendationResult";
import { ROUTES } from "@/constants/routes";
import { getRecommendation } from "@/lib/api/recommendations";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import { hasSupabasePublicEnv } from "@/lib/config/env";
import type { RecommendationDetailResponse } from "@/types/content-recommendation";

type RecommendationResultClientProps = {
  recommendationId: string;
};

export function RecommendationResultClient({ recommendationId }: RecommendationResultClientProps) {
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [result, setResult] = useState<RecommendationDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadRecommendation() {
      try {
        if (!hasSupabasePublicEnv()) {
          setAuthStatus("authenticated");
          const data = await getRecommendation(recommendationId, controller.signal);
          if (active) {
            setResult(data);
          }
          return;
        }

        const {
          data: { session },
        } = await getSupabaseBrowserClient().auth.getSession();

        if (!active) {
          return;
        }

        if (!session) {
          setAuthStatus("unauthenticated");
          return;
        }

        setAuthStatus("authenticated");
        const data = await getRecommendation(recommendationId, controller.signal);
        if (active) {
          setResult(data);
        }
      } catch (caughtError) {
        if (active) {
          setAuthStatus("authenticated");
          setError(caughtError instanceof Error ? caughtError.message : "추천 결과를 불러오지 못했습니다.");
        }
      }
    }

    void loadRecommendation();

    return () => {
      active = false;
      controller.abort();
    };
  }, [recommendationId]);

  if (authStatus === "checking") {
    return <LoadingSteps activeIndex={0} steps={["추천 결과 불러오는 중"]} />;
  }

  if (authStatus === "unauthenticated") {
    return (
      <EmptyState
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
        description="저장된 추천 결과는 로그인 후 확인할 수 있습니다."
        title="로그인이 필요합니다"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Badge tone="brand">Recommendation</Badge>}
        title="콘텐츠 추천 결과"
        description="생성된 추천 결과를 저장된 recommendation ID 기준으로 불러왔습니다."
        action={
          <Link href={ROUTES.dashboard}>
            <Button variant="secondary">콘텐츠 다시 추천받기</Button>
          </Link>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {!error && !result ? <LoadingSteps activeIndex={0} steps={["추천 결과 불러오는 중"]} /> : null}
      {result ? (
        <RecommendationResult
          action={
            <>
              <RecommendationFavoriteButton result={result} />
              <Link href={ROUTES.favorites}>
                <Button variant="secondary">찜 목록</Button>
              </Link>
            </>
          }
          result={result}
        />
      ) : null}
    </div>
  );
}
