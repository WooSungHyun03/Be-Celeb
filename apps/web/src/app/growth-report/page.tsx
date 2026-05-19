"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTES } from "@/constants/routes";
import { getGrowthReport, refreshGrowthReport, type GrowthReportResponse, type GrowthSnapshot } from "@/lib/api/growth";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("ko-KR");
}

function formatDelta(value: number) {
  if (value > 0) {
    return `+${formatNumber(value)}`;
  }
  return formatNumber(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function snapshotLabel(snapshot: GrowthSnapshot) {
  return new Date(snapshot.collectedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function GrowthReportPage() {
  const [report, setReport] = useState<GrowthReportResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const maxViews = useMemo(() => {
    return Math.max(...(report?.trend ?? []).map((snapshot) => snapshot.viewCount), 1);
  }, [report]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadReport() {
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
        const data = await getGrowthReport(controller.signal);
        if (active) {
          setReport(data);
          setStatus("ready");
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "성장 리포트를 불러오지 못했습니다.");
        }
      }
    }

    void loadReport();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setMessage("");
    try {
      const data = await refreshGrowthReport();
      setReport(data);
      setStatus("ready");
      setMessage(data.latest ? "최신 YouTube 지표를 저장했습니다." : "저장된 채널 설정이 없어 갱신하지 않았습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "성장 리포트 갱신에 실패했습니다.");
    } finally {
      setRefreshing(false);
    }
  }

  if (status === "loading") {
    return <Loading label="성장 리포트를 불러오는 중입니다." />;
  }

  if (status === "unauthorized") {
    return (
      <EmptyState
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
        description="채널 성장 지표는 로그인 후 확인할 수 있습니다."
        title="로그인이 필요합니다"
      />
    );
  }

  if (status === "error") {
    return <EmptyState title="성장 리포트를 불러오지 못했습니다" description={message || "잠시 후 다시 시도해 주세요."} />;
  }

  const latest = report?.latest ?? null;
  const deltas = report?.deltas ?? { subscriberCount: 0, viewCount: 0, videoCount: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <Button disabled={refreshing} onClick={() => void handleRefresh()}>
            {refreshing ? "갱신 중" : "지금 갱신"}
          </Button>
        }
        description="저장된 YouTube 채널 URL을 기준으로 구독자, 조회수, 영상 수와 최근 영상 성과를 추적합니다."
        eyebrow={<Badge tone="brand">YouTube Growth</Badge>}
        title="성장 리포트"
      />

      {message ? <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</p> : null}

      {!report?.hasChannelSettings ? (
        <EmptyState
          action={
            <Link href={ROUTES.dashboard}>
              <Button>대시보드에서 채널 설정</Button>
            </Link>
          }
          description="대시보드에서 YouTube 채널 URL을 입력해 추천을 생성하면 채널 설정이 저장됩니다."
          title="저장된 채널이 없습니다"
        />
      ) : null}

      {report?.hasChannelSettings && !latest ? (
        <EmptyState
          action={
            <Button disabled={refreshing} onClick={() => void handleRefresh()}>
              {refreshing ? "갱신 중" : "첫 스냅샷 저장"}
            </Button>
          }
          description="아직 저장된 성장 스냅샷이 없습니다. 지금 갱신을 눌러 현재 YouTube 지표를 저장하세요."
          title="성장 데이터가 없습니다"
        />
      ) : null}

      {latest ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-sm font-bold text-slate-500">구독자 수</p>
              <p className="mt-2 text-3xl font-bold text-ink">{formatNumber(latest.subscriberCount)}</p>
              <p className="mt-2 text-sm font-semibold text-violet-700">이전 대비 {formatDelta(deltas.subscriberCount)}</p>
            </Card>
            <Card>
              <p className="text-sm font-bold text-slate-500">전체 조회수</p>
              <p className="mt-2 text-3xl font-bold text-ink">{formatNumber(latest.viewCount)}</p>
              <p className="mt-2 text-sm font-semibold text-violet-700">이전 대비 {formatDelta(deltas.viewCount)}</p>
            </Card>
            <Card>
              <p className="text-sm font-bold text-slate-500">영상 수</p>
              <p className="mt-2 text-3xl font-bold text-ink">{formatNumber(latest.videoCount)}</p>
              <p className="mt-2 text-sm font-semibold text-violet-700">이전 대비 {formatDelta(deltas.videoCount)}</p>
            </Card>
          </section>

          <Card title="채널 정보">
            <div className="grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
              <p>
                <span className="font-bold text-ink">채널 ID</span>
                <br />
                {latest.youtubeChannelId}
              </p>
              <p>
                <span className="font-bold text-ink">최근 수집</span>
                <br />
                {formatDate(latest.collectedAt)}
              </p>
              {latest.channelUrl ? (
                <a className="font-semibold text-violet-700 hover:underline md:col-span-2" href={latest.channelUrl} rel="noreferrer" target="_blank">
                  {latest.channelUrl}
                </a>
              ) : null}
            </div>
          </Card>

          <Card title="성장 추이">
            {report?.trend.length ? (
              <div className="grid gap-3">
                {report.trend.map((snapshot) => (
                  <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)_120px]" key={snapshot.id}>
                    <span className="text-sm font-semibold text-slate-500">{snapshotLabel(snapshot)}</span>
                    <div className="h-7 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max((snapshot.viewCount / maxViews) * 100, 4)}%` }} />
                    </div>
                    <span className="text-right text-sm font-bold text-ink">{formatNumber(snapshot.viewCount)} views</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">추이 데이터가 없습니다.</p>
            )}
          </Card>

          <Card title="최근 영상 성과">
            {latest.recentVideoStats.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {latest.recentVideoStats.map((video) => (
                  <article className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto]" key={video.youtubeVideoId}>
                    <div>
                      <h3 className="font-bold leading-6 text-ink">{video.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(video.publishedAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600 md:justify-end">
                      <span className="rounded bg-slate-100 px-2 py-1">조회 {formatNumber(video.viewCount)}</span>
                      <span className="rounded bg-slate-100 px-2 py-1">좋아요 {formatNumber(video.likeCount)}</span>
                      <span className="rounded bg-slate-100 px-2 py-1">댓글 {formatNumber(video.commentCount)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">최근 영상 통계가 없습니다.</p>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
