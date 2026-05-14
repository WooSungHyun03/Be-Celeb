"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { PageHeader } from "@/components/common/PageHeader";
import { ChannelInputForm } from "@/components/dashboard/ChannelInputForm";
import { ContentPlanResult } from "@/components/dashboard/ContentPlanResult";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { LoadingSteps } from "@/components/dashboard/LoadingSteps";
import { RecommendationOptionCards } from "@/components/dashboard/RecommendationOptionCards";
import { generateContentPlan, recommendOptions } from "@/lib/client/api";
import { CREATOR_CATEGORIES } from "@/lib/categories";
import type {
  GenerateContentPlanResponse,
  RecommendOptionsResponse,
  RecommendationOption,
} from "@/types/content-recommendation";

const optionLoadingSteps = ["채널 분석 중", "카테고리 선정 중", "인플루언서 데이터 분석 중", "AI가 아이디어 생성 중"];
const planLoadingSteps = ["선택한 아이디어 분석 중", "제목/해시태그/콘티 생성 중"];

type LoadingMode = "options" | "plan" | null;

export function DashboardRecommendationClient() {
  const [channelUrl, setChannelUrl] = useState("");
  const [category, setCategory] = useState("");
  const [loadingMode, setLoadingMode] = useState<LoadingMode>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [optionsResult, setOptionsResult] = useState<RecommendOptionsResponse | null>(null);
  const [planResult, setPlanResult] = useState<GenerateContentPlanResponse | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const isLoading = loadingMode !== null;
  const loadingSteps = loadingMode === "plan" ? planLoadingSteps : optionLoadingSteps;

  useEffect(() => {
    if (!loadingMode) {
      return;
    }

    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 1400);

    return () => window.clearInterval(timer);
  }, [loadingMode, loadingSteps.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOptionsResult(null);
    setPlanResult(null);
    setSelectedOptionId(null);
    setStageIndex(0);
    setLoadingMode("options");

    try {
      const data = await recommendOptions({
        channelUrl,
        category: category || null,
      });

      setOptionsResult(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "콘텐츠 아이디어를 생성하지 못했습니다.");
    } finally {
      setLoadingMode(null);
    }
  }

  async function handleSelectOption(option: RecommendationOption) {
    if (!optionsResult) {
      return;
    }

    setError(null);
    setPlanResult(null);
    setSelectedOptionId(option.optionId);
    setStageIndex(0);
    setLoadingMode("plan");

    try {
      const data = await generateContentPlan({
        analysisId: optionsResult.analysisId,
        option: {
          optionId: option.optionId,
          ideaTitle: option.ideaTitle,
          format: option.format,
          summary: option.summary,
        },
      });

      setPlanResult(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "콘텐츠 계획을 생성하지 못했습니다.");
    } finally {
      setLoadingMode(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<Badge tone="brand">YouTube AI 콘텐츠 추천</Badge>}
        title="대시보드"
        description="채널을 분석해 먼저 콘텐츠 아이디어 3개를 고르고, 선택한 아이디어를 실행 가능한 콘티로 확장합니다."
      />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card title="2단계 추천 흐름" className="shadow-none">
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <p>1단계에서는 채널 정보와 최근 업로드, 카테고리별 인플루언서 영상 데이터를 비교해 중복 가능성이 낮은 아이디어 3개만 생성합니다.</p>
            <p>2단계에서는 선택한 아이디어 하나를 기반으로 제목, 해시태그, 썸네일 방향, hook, 장면별 콘티와 업로드 팁을 생성합니다.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {CREATOR_CATEGORIES.slice(0, 6).map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        </Card>

        <ChannelInputForm
          category={category}
          channelUrl={channelUrl}
          isLoading={loadingMode === "options"}
          onCategoryChange={setCategory}
          onChannelUrlChange={setChannelUrl}
          onSubmit={handleSubmit}
        />
      </section>

      {isLoading ? <LoadingSteps activeIndex={stageIndex} steps={loadingSteps} /> : null}
      {error ? <ErrorState message={error} /> : null}

      {optionsResult ? (
        <RecommendationOptionCards
          isLoading={loadingMode === "plan"}
          onSelect={handleSelectOption}
          result={optionsResult}
          selectedOptionId={selectedOptionId}
        />
      ) : null}

      {planResult ? <ContentPlanResult result={planResult} /> : null}
    </div>
  );
}
