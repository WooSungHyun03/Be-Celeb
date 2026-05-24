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
import { getRecommendationQueueStatus, recommendContent } from "@/lib/api/recommendations";
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
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isLoading) {
      setQueueMessage(null);
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function refreshQueueStatus() {
      try {
        const status = await getRecommendationQueueStatus(controller.signal);
        if (!active) {
          return;
        }
        if (status.state === "queued" && status.position && status.position > 0) {
          setQueueMessage(`요청 대기 중입니다. 현재 대기 순번은 ${status.position}번째입니다.`);
          return;
        }
        if (status.state === "processing") {
          setQueueMessage("추천 요청을 처리 중입니다. 곧 결과 화면으로 이동합니다.");
          return;
        }
        if (status.isProcessing || status.pendingCount > 0) {
          setQueueMessage("앞선 추천 요청이 끝나면 순서대로 처리됩니다.");
          return;
        }
        setQueueMessage(null);
      } catch {
        if (active) {
          setQueueMessage(null);
        }
      }
    }

    void refreshQueueStatus();
    const timer = window.setInterval(() => {
      void refreshQueueStatus();
    }, 2500);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) {
      return;
    }
    setError(null);
    setQueueMessage("추천 요청을 등록하는 중입니다.");
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

      {isLoading ? <LoadingSteps activeIndex={stageIndex} steps={loadingSteps} /> : null}

      {isLoading ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 shadow-sm shadow-amber-100">
          <p className="font-bold">{queueMessage || "분석에 시간이 걸릴 수 있습니다."}</p>
          <p className="mt-1">
            local LLM 과부하를 막기 위해 추천 생성은 순서대로 처리됩니다. 창을 닫지 말고 잠시만 기다려 주세요.
          </p>
        </div>
      ) : null}

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

      {error ? <ErrorState message={error} /> : null}
    </div>
  );
}
