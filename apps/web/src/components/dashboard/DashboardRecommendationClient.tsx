"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ChannelAnalysisCard } from "@/components/dashboard/ChannelAnalysisCard";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { LoadingSteps } from "@/components/dashboard/LoadingSteps";
import { ROUTES } from "@/constants/routes";
import { recommendContent } from "@/lib/api/recommendations";
import { getUserChannelSettings } from "@/lib/api/users";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import type { RecommendationFieldOptions } from "@/types/content-recommendation";

const loadingSteps = ["채널 분석 중", "카테고리 데이터 분석 중", "AI 콘텐츠 추천 생성 중"];
const defaultRecommendationOptions: RecommendationFieldOptions = {
  reason: true,
  hashtags: true,
  storyboard: true,
  hook: false,
  thumbnailIdea: false,
  uploadTips: false,
};

export function DashboardRecommendationClient() {
  const router = useRouter();
  const [channelUrl, setChannelUrl] = useState("");
  const [category, setCategory] = useState("");
  const [options, setOptions] = useState<RecommendationFieldOptions>(defaultRecommendationOptions);
  const [stageIndex, setStageIndex] = useState(0);
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSessionAndSettings() {
      try {
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
        const settings = await getUserChannelSettings();
        if (!active || !settings) {
          return;
        }
        setChannelUrl(settings.channelUrl ?? "");
        setCategory(settings.category ?? "");
      } catch (caughtError) {
        if (active) {
          setAuthStatus("authenticated");
          setError(caughtError instanceof Error ? caughtError.message : "저장된 채널 설정을 불러오지 못했습니다.");
        }
      }
    }

    void loadSessionAndSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 1400);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStageIndex(0);
    setIsLoading(true);

    try {
      const data = await recommendContent({ channelUrl, category: category || null, options });
      setCategory(data.selectedCategory);
      router.push(`/dashboard/result/${data.recommendationId}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "콘텐츠 추천을 생성하지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  if (authStatus === "checking") {
    return <LoadingSteps activeIndex={0} steps={["로그인 상태 확인 중"]} />;
  }

  if (authStatus === "unauthenticated") {
    return (
      <EmptyState
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
        description="대시보드 추천과 채널 설정 저장은 로그인 후 사용할 수 있습니다."
        title="로그인이 필요합니다"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Badge tone="brand">YouTube AI 콘텐츠 추천</Badge>}
        title="대시보드"
        description="저장된 채널 설정을 불러오거나 새로운 URL을 입력해 콘텐츠 추천 결과를 생성합니다."
      />

      <ChannelAnalysisCard
        category={category}
        channelUrl={channelUrl}
        isLoading={isLoading}
        onCategoryChange={setCategory}
        onChannelUrlChange={setChannelUrl}
        onOptionsChange={setOptions}
        onSubmit={handleSubmit}
        options={options}
      />

      {isLoading ? <LoadingSteps activeIndex={stageIndex} steps={loadingSteps} /> : null}
      {error ? <ErrorState message={error} /> : null}
    </div>
  );
}
