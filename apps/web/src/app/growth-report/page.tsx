"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTES } from "@/constants/routes";
import { getGrowthReport, refreshGrowthReport, type GrowthReportResponse, type GrowthSnapshot } from "@/lib/api/growth";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import { compactNumber, formatInteger } from "@/lib/common/format";

function formatDelta(value: number) {
  if (value > 0) {
    return `+${formatInteger(value)}`;
  }
  return formatInteger(value);
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

function metricLabel(value: unknown) {
  return compactNumber(typeof value === "number" ? value : Number(value));
}

export default function GrowthReportPage() {
  const [report, setReport] = useState<GrowthReportResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const chartData = useMemo(() => {
    return (report?.trend ?? []).map((snapshot) => ({
      period: snapshotLabel(snapshot),
      subscriberCount: snapshot.subscriberCount,
      viewCount: snapshot.viewCount,
      videoCount: snapshot.videoCount,
    }));
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
            {refreshing ? "갱신 중..." : "지금 갱신"}
          </Button>
        }
        description="저장된 YouTube 채널 URL을 기준으로 구독자, 조회수, 영상 수와 최근 영상 성과를 추적합니다."
        eyebrow={<Badge tone="brand">YouTube Growth</Badge>}
        title="성장 리포트"
      />

      {message ? <p className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</p> : null}

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
              {refreshing ? "갱신 중..." : "첫 스냅샷 저장"}
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
              <p className="mt-2 text-3xl font-black text-ink">{formatInteger(latest.subscriberCount)}</p>
              <p className="mt-2 text-sm font-semibold text-violet-700">이전 대비 {formatDelta(deltas.subscriberCount)}</p>
            </Card>
            <Card>
              <p className="text-sm font-bold text-slate-500">전체 조회수</p>
              <p className="mt-2 text-3xl font-black text-ink">{formatInteger(latest.viewCount)}</p>
              <p className="mt-2 text-sm font-semibold text-violet-700">이전 대비 {formatDelta(deltas.viewCount)}</p>
            </Card>
            <Card>
              <p className="text-sm font-bold text-slate-500">영상 수</p>
              <p className="mt-2 text-3xl font-black text-ink">{formatInteger(latest.videoCount)}</p>
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
            {chartData.length > 1 ? (
              <div className="grid gap-6">
                <div>
                  <p className="mb-3 text-sm font-bold text-slate-500">구독자 수 추이</p>
                  <div className="h-72 min-w-0">
                    <ResponsiveContainer height="100%" width="100%">
                      <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 16, top: 8 }}>
                        <CartesianGrid stroke="#ede9fe" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} tickMargin={8} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={metricLabel} width={48} />
                        <Tooltip formatter={(value) => [metricLabel(value), "구독자"]} />
                        <Line dataKey="subscriberCount" dot={false} name="구독자" stroke="#7c3aed" strokeWidth={2.5} type="monotone" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="h-72 min-w-0 rounded-xl border border-violet-100 p-3">
                    <p className="mb-3 text-sm font-bold text-slate-500">전체 조회수 추이</p>
                    <ResponsiveContainer height="88%" width="100%">
                      <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 16, top: 8 }}>
                        <CartesianGrid stroke="#ede9fe" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} tickMargin={8} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={metricLabel} width={48} />
                        <Tooltip formatter={(value) => [metricLabel(value), "조회수"]} />
                        <Line dataKey="viewCount" dot={false} name="조회수" stroke="#2563eb" strokeWidth={2.5} type="monotone" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-72 min-w-0 rounded-xl border border-violet-100 p-3">
                    <p className="mb-3 text-sm font-bold text-slate-500">영상 수 추이</p>
                    <ResponsiveContainer height="88%" width="100%">
                      <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 16, top: 8 }}>
                        <CartesianGrid stroke="#ede9fe" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} tickMargin={8} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickFormatter={metricLabel} width={48} />
                        <Tooltip formatter={(value) => [metricLabel(value), "영상 수"]} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line dataKey="videoCount" dot={false} name="영상 수" stroke="#059669" strokeWidth={2.5} type="monotone" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                description="성장 추이를 그래프로 보려면 최소 2개 이상의 스냅샷이 필요합니다. 하루 뒤 다시 갱신하거나 운영 일정을 확인하세요."
                title="추이 데이터가 더 필요합니다"
              />
            )}
          </Card>

          <Card title="최근 영상 성과">
            {latest.recentVideoStats.length > 0 ? (
              <div className="divide-y divide-violet-100">
                {latest.recentVideoStats.map((video) => (
                  <Link
                    className="grid gap-3 py-4 transition hover:bg-violet-50/60 sm:grid-cols-[96px_minmax(0,1fr)] md:grid-cols-[96px_minmax(0,1fr)_auto]"
                    href={`${ROUTES.growthReport}/videos/${encodeURIComponent(video.youtubeVideoId)}`}
                    key={video.youtubeVideoId}
                  >
                    <div className="aspect-video overflow-hidden rounded-md bg-slate-100">
                      {video.thumbnailUrl ? (
                        <img alt="" className="h-full w-full object-cover" src={video.thumbnailUrl} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">No image</div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold leading-6 text-ink">{video.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(video.publishedAt)} · 상세 추이 보기</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600 sm:col-start-2 md:col-start-auto md:justify-end">
                      <span className="rounded-md bg-violet-50 px-2 py-1 text-violet-700">조회 {formatInteger(video.viewCount)}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-1">좋아요 {formatInteger(video.likeCount)}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-1">댓글 {formatInteger(video.commentCount)}</span>
                    </div>
                  </Link>
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
