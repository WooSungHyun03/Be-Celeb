"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { collectNow } from "@/lib/api/admin";
import type { AdminCollectionLog, AdminCollectionSummary } from "@/types/admin";

type CollectionManagerProps = {
  logs: AdminCollectionLog[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

const collectionSteps = [
  { title: "채널 목록 확인", description: "활성화된 YouTube 채널과 카테고리를 불러오는 중입니다." },
  { title: "최근 영상 수집", description: "최근 24시간 내 업로드된 영상 데이터를 YouTube API로 확인합니다." },
  { title: "영상 데이터 저장", description: "조회수, 좋아요, 댓글, 썸네일 정보를 데이터베이스에 반영합니다." },
  { title: "자막/음성 분석", description: "공개 자막을 우선 확인하고, 필요하면 Whisper 분석을 시도합니다." },
  { title: "수집 결과 정리", description: "분석 성공, 스킵, 오류 사유를 수집 로그에 정리합니다." },
];

export function CollectionManager({ logs, onChanged, onError }: CollectionManagerProps) {
  const [result, setResult] = useState<AdminCollectionSummary | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const progress = useMemo(() => {
    if (result) {
      return 100;
    }
    if (!isCollecting) {
      return 0;
    }
    return Math.min(92, Math.round(((activeStep + 1) / collectionSteps.length) * 100));
  }, [activeStep, isCollecting, result]);

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

  async function handleCollectNow() {
    setIsCollecting(true);
    setResult(null);
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
                <p className="text-sm font-bold text-violet-950">{result ? "수집 완료" : collectionSteps[activeStep].title}</p>
                <p className="mt-1 text-sm text-violet-700">
                  {result ? "최신 수집 결과가 반영되었습니다." : collectionSteps[activeStep].description}
                </p>
              </div>
              <Badge tone={result ? "brand" : "info"}>{progress}%</Badge>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-violet-600 transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              {collectionSteps.map((step, index) => {
                const isDone = result || index < activeStep;
                const isActive = !result && index === activeStep;
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
          <div className="mt-5 grid gap-3 sm:grid-cols-4 xl:grid-cols-7">
            <Badge tone="info">channels {result.channelsChecked}</Badge>
            <Badge tone="info">found {result.videosFoundLast24h}</Badge>
            <Badge tone="brand">upserted {result.videosUpserted}</Badge>
            <Badge tone="brand">analyzed {result.videosAnalyzed}</Badge>
            <Badge tone={result.videosAnalysisSkipped ? "warning" : "brand"}>skipped {result.videosAnalysisSkipped}</Badge>
            <Badge tone={result.videoAnalysisErrors.length ? "warning" : "brand"}>analysis errors {result.videoAnalysisErrors.length}</Badge>
            <Badge tone={result.errors.length ? "warning" : "brand"}>errors {result.errors.length}</Badge>
          </div>
        ) : null}
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
