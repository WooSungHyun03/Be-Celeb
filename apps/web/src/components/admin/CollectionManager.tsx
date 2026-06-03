"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { backfillYoutube, collectNow, listCollectionLogs } from "@/lib/api/admin";
import type { AdminCollectionLog, AdminCollectionSummary, AdminYoutubeBackfillSummary } from "@/types/admin";

type CollectionManagerProps = {
  logs: AdminCollectionLog[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

type CollectionProgress = {
  stage: string;
  message: string;
  channelsTotal: number;
  channelsDone: number;
  videosFound: number;
  videosUpserted: number;
  videosAnalyzed: number;
  videosSkipped: number;
  videosDeferred: number;
  pendingVideoAnalysisCount: number;
  errors: number;
  percent: number;
  updatedAt: string;
};

const collectionSteps = [
  { title: "채널 목록 확인", stage: "preparing" },
  { title: "최근 영상 수집", stage: "channel_collection" },
  { title: "영상 데이터 저장", stage: "channel_collection" },
  { title: "메타데이터 분석", stage: "channel_collection" },
  { title: "수집 결과 정리", stage: "finalizing" },
];

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readProgress(summary: Record<string, unknown> | null | undefined): CollectionProgress | null {
  const progress = summary?.progress;
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
    return null;
  }
  const value = progress as Record<string, unknown>;
  return {
    stage: stringFrom(value.stage),
    message: stringFrom(value.message),
    channelsTotal: numberFrom(value.channelsTotal),
    channelsDone: numberFrom(value.channelsDone),
    videosFound: numberFrom(value.videosFound),
    videosUpserted: numberFrom(value.videosUpserted),
    videosAnalyzed: numberFrom(value.videosAnalyzed),
    videosSkipped: numberFrom(value.videosSkipped),
    videosDeferred: numberFrom(value.videosDeferred),
    pendingVideoAnalysisCount: numberFrom(value.pendingVideoAnalysisCount),
    errors: numberFrom(value.errors),
    percent: Math.max(0, Math.min(100, numberFrom(value.percent))),
    updatedAt: stringFrom(value.updatedAt),
  };
}

export function CollectionManager({ logs, onChanged, onError }: CollectionManagerProps) {
  const [result, setResult] = useState<AdminCollectionSummary | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [liveProgress, setLiveProgress] = useState<CollectionProgress | null>(null);
  const [backfillStartDate, setBackfillStartDate] = useState("");
  const [backfillEndDate, setBackfillEndDate] = useState("");
  const [backfillResume, setBackfillResume] = useState(true);
  const [backfillResult, setBackfillResult] = useState<AdminYoutubeBackfillSummary | null>(null);

  const progress = useMemo(() => {
    if (result) {
      return 100;
    }
    if (liveProgress) {
      return liveProgress.percent;
    }
    if (!isCollecting) {
      return 0;
    }
    return Math.min(92, Math.round(((activeStep + 1) / collectionSteps.length) * 100));
  }, [activeStep, isCollecting, liveProgress, result]);

  const displayStepIndex = useMemo(() => {
    if (result) {
      return collectionSteps.length - 1;
    }
    if (liveProgress?.stage === "preparing") {
      return 0;
    }
    if (liveProgress?.stage === "finalizing") {
      return collectionSteps.length - 1;
    }
    if (liveProgress) {
      return Math.min(collectionSteps.length - 2, Math.max(1, Math.floor((liveProgress.percent / 100) * collectionSteps.length)));
    }
    return activeStep;
  }, [activeStep, liveProgress, result]);

  useEffect(() => {
    if (!isCollecting) {
      return;
    }
    setActiveStep(0);
    const timer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, collectionSteps.length - 1));
    }, 4500);
    return () => window.clearInterval(timer);
  }, [isCollecting]);

  useEffect(() => {
    if (!isCollecting) {
      return;
    }
    let cancelled = false;
    async function pollProgress() {
      try {
        const data = await listCollectionLogs({ limit: 1 });
        const latest = data.logs[0];
        const progressValue = readProgress(latest?.summary);
        if (!cancelled && latest?.status === "running" && progressValue) {
          setLiveProgress(progressValue);
        }
      } catch {
        // Progress polling is best-effort. The main collect request still owns the final result.
      }
    }
    void pollProgress();
    const timer = window.setInterval(pollProgress, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isCollecting]);

  async function handleCollectNow() {
    setIsCollecting(true);
    setResult(null);
    setLiveProgress(null);
    try {
      const data = await collectNow();
      setResult(data);
      setActiveStep(collectionSteps.length - 1);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "수동 수집을 실행하지 못했습니다.");
    } finally {
      setIsCollecting(false);
    }
  }

  async function handleBackfill(dryRun: boolean) {
    setIsBackfilling(true);
    setBackfillResult(null);
    try {
      const data = await backfillYoutube({
        startDate: backfillStartDate || undefined,
        endDate: backfillEndDate || undefined,
        dryRun,
        resume: backfillResume,
      });
      setBackfillResult(data);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "YouTube backfill을 실행하지 못했습니다.");
    } finally {
      setIsBackfilling(false);
    }
  }

  const progressTitle = result ? "수집 완료" : collectionSteps[displayStepIndex].title;
  const progressMessage = result ? "최신 수집 결과가 반영되었습니다." : liveProgress?.message ?? "수집 작업을 실행하고 있습니다.";

  return (
    <div className="space-y-5">
      <Card title="데이터 수집 관리">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm leading-6 text-slate-600">
              기본 자동 수집은 KST 매일 06:00, UTC 매일 21:00, cron `0 21 * * *` 기준입니다.
            </p>
            <p className="mt-1 text-sm text-slate-500">이 버튼은 `/api/admin/collect-now`를 호출해 즉시 영상 데이터 수집을 실행합니다.</p>
          </div>
          <Button disabled={isCollecting} onClick={handleCollectNow}>
            {isCollecting ? "수집 실행 중" : "지금 수동 수집 실행"}
          </Button>
        </div>

        {isCollecting || result ? (
          <div className="mt-5 rounded-lg border border-violet-100 bg-violet-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-violet-950">{progressTitle}</p>
                <p className="mt-1 text-sm text-violet-700">{progressMessage}</p>
              </div>
              <Badge tone={result ? "brand" : "info"}>{progress}%</Badge>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-violet-600 transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            {liveProgress ? (
              <div className="mt-4 grid gap-2 text-xs sm:grid-cols-6">
                <span className="rounded-md bg-white px-3 py-2 text-violet-900">채널 {liveProgress.channelsDone}/{liveProgress.channelsTotal}</span>
                <span className="rounded-md bg-white px-3 py-2 text-violet-900">발견 {liveProgress.videosFound}</span>
                <span className="rounded-md bg-white px-3 py-2 text-violet-900">저장 {liveProgress.videosUpserted}</span>
                <span className="rounded-md bg-white px-3 py-2 text-violet-900">분석 {liveProgress.videosAnalyzed}</span>
                <span className="rounded-md bg-white px-3 py-2 text-violet-900">보류 {liveProgress.videosDeferred}</span>
                <span className="rounded-md bg-white px-3 py-2 text-violet-900">정책 스킵 {liveProgress.videosSkipped}</span>
              </div>
            ) : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              {collectionSteps.map((step, index) => {
                const isDone = result || index < displayStepIndex;
                const isActive = !result && index === displayStepIndex;
                return (
                  <div
                    key={step.title}
                    className={`rounded-md border px-3 py-2 text-xs transition ${
                      isDone
                        ? "border-violet-200 bg-white text-violet-800"
                        : isActive
                          ? "border-violet-500 bg-white text-violet-950 shadow-sm"
                          : "border-transparent bg-white/55 text-slate-400"
                    }`}
                  >
                    <span className="font-bold">{index + 1}. </span>
                    {step.title}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-4 xl:grid-cols-8">
            <Badge tone="info">channels {result.channelsChecked}</Badge>
            <Badge tone="info">found {result.videosFoundLast24h}</Badge>
            <Badge tone="brand">upserted {result.videosUpserted}</Badge>
            <Badge tone="brand">analyzed {result.videosAnalyzed}</Badge>
            <Badge tone="info">already {result.videosAnalysisAlreadyPresent}</Badge>
            <Badge tone={result.videosAnalysisDeferred ? "warning" : "brand"}>deferred {result.videosAnalysisDeferred}</Badge>
            <Badge tone={result.pendingVideoAnalysisCount ? "warning" : "brand"}>pending {result.pendingVideoAnalysisCount}</Badge>
            <Badge tone={result.videosAnalysisSkipped ? "warning" : "brand"}>policy skipped {result.videosAnalysisSkipped}</Badge>
            <Badge tone={result.videoAnalysisErrors.length ? "warning" : "brand"}>analysis errors {result.videoAnalysisErrors.length}</Badge>
            <Badge tone={result.errors.length ? "warning" : "brand"}>errors {result.errors.length}</Badge>
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                시작일
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-violet-400"
                  onChange={(event) => setBackfillStartDate(event.target.value)}
                  type="date"
                  value={backfillStartDate}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                종료일
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-violet-400"
                  onChange={(event) => setBackfillEndDate(event.target.value)}
                  type="date"
                  value={backfillEndDate}
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 sm:col-span-2">
                <input
                  checked={backfillResume}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600"
                  onChange={(event) => setBackfillResume(event.target.checked)}
                  type="checkbox"
                />
                이전 partial checkpoint에서 이어서 실행
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isBackfilling} onClick={() => void handleBackfill(true)} variant="secondary">
                {isBackfilling ? "실행 중" : "Dry-run"}
              </Button>
              <Button disabled={isBackfilling} onClick={() => void handleBackfill(false)}>
                {isBackfilling ? "실행 중" : "30일 Backfill 실행"}
              </Button>
            </div>
          </div>

          {backfillResult ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-4 xl:grid-cols-8">
              <Badge tone={backfillResult.status === "completed" ? "brand" : "warning"}>{backfillResult.status}</Badge>
              <Badge tone="info">channels {backfillResult.channelsProcessed}/{backfillResult.channelsTotal}</Badge>
              <Badge tone="info">pages {backfillResult.pagesScanned}</Badge>
              <Badge tone="info">matched {backfillResult.videosMatchedWindow}</Badge>
              <Badge tone="brand">collected {backfillResult.collectedVideos}</Badge>
              <Badge tone={backfillResult.skippedDuplicates ? "warning" : "brand"}>duplicates {backfillResult.skippedDuplicates}</Badge>
              <Badge tone={backfillResult.pendingVideoAnalysisCount ? "warning" : "brand"}>pending {backfillResult.pendingVideoAnalysisCount}</Badge>
              <Badge tone={backfillResult.failedItems.length ? "warning" : "brand"}>failed {backfillResult.failedItems.length}</Badge>
            </div>
          ) : null}
        </div>
      </Card>

      <Card title="collection_logs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">시작</th>
                <th className="px-3 py-2">종료</th>
                <th className="px-3 py-2">요약</th>
                <th className="px-3 py-2">오류</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 py-3">
                    <Badge tone={log.status === "success" ? "brand" : log.status === "failed" ? "signal" : "warning"}>{log.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">{log.started_at}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{log.finished_at ?? "-"}</td>
                  <td className="px-3 py-3">
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-slate-500">summary</summary>
                      <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                        {JSON.stringify(log.summary, null, 2)}
                      </pre>
                    </details>
                  </td>
                  <td className="px-3 py-3 text-xs text-rose-600">{log.error_message ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
