"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTES } from "@/constants/routes";
import { getGrowthVideoReport, type GrowthVideoReportResponse } from "@/lib/api/growth";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import { compactNumber, formatInteger } from "@/lib/common/format";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function pointLabel(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function metricLabel(value: unknown) {
  return compactNumber(typeof value === "number" ? value : Number(value));
}

export default function GrowthVideoReportPage() {
  const params = useParams<{ videoId: string }>();
  const videoId = decodeURIComponent(params.videoId);
  const [report, setReport] = useState<GrowthVideoReportResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");

  const chartData = useMemo(() => {
    return (report?.trend ?? []).map((point) => ({
      period: pointLabel(point.collectedAt),
      collectedAt: point.collectedAt,
      viewCount: point.viewCount,
      likeCount: point.likeCount,
      commentCount: point.commentCount,
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
        const data = await getGrowthVideoReport(videoId, controller.signal);
        if (active) {
          setReport(data);
          setStatus("ready");
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "영상 성장 추이를 불러오지 못했습니다.");
        }
      }
    }

    void loadReport();

    return () => {
      active = false;
      controller.abort();
    };
  }, [videoId]);

  if (status === "loading") {
    return <Loading label="영상 성장 추이를 불러오는 중입니다." />;
  }

  if (status === "unauthorized") {
    return (
      <EmptyState
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
        description="영상별 성장 추이는 로그인 후 확인할 수 있습니다."
        title="로그인이 필요합니다"
      />
    );
  }

  if (status === "error") {
    return <EmptyState title="영상 성장 추이를 불러오지 못했습니다" description={message || "잠시 후 다시 시도해 주세요."} />;
  }

  const video = report?.video ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <Link href={ROUTES.growthReport}>
            <Button variant="secondary">성장 리포트로 돌아가기</Button>
          </Link>
        }
        description="매일 저장된 채널 스냅샷을 기준으로 영상별 조회수, 좋아요, 댓글 변화를 보여줍니다."
        eyebrow={<Badge tone="brand">Video Growth</Badge>}
        title={video?.title || "영상 성장 추이"}
      />

      {!video ? (
        <EmptyState
          action={
            <Link href={ROUTES.growthReport}>
              <Button>최근 영상 성과 보기</Button>
            </Link>
          }
          description="이 영상의 저장된 추이 데이터가 아직 없습니다. 일일 갱신 이후 다시 확인해 주세요."
          title="영상 추이 데이터가 없습니다"
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-sm font-bold text-slate-500">조회수</p>
              <p className="mt-2 text-3xl font-black text-ink">{formatInteger(video.viewCount)}</p>
            </Card>
            <Card>
              <p className="text-sm font-bold text-slate-500">좋아요</p>
              <p className="mt-2 text-3xl font-black text-ink">{formatInteger(video.likeCount)}</p>
            </Card>
            <Card>
              <p className="text-sm font-bold text-slate-500">댓글</p>
              <p className="mt-2 text-3xl font-black text-ink">{formatInteger(video.commentCount)}</p>
            </Card>
          </section>

          <Card title="영상 정보">
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="aspect-video overflow-hidden rounded-lg bg-slate-100">
                {video.thumbnailUrl ? (
                  <img alt="" className="h-full w-full object-cover" src={video.thumbnailUrl} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">No image</div>
                )}
              </div>
              <div className="grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
                <p>
                  <span className="font-bold text-ink">영상 ID</span>
                  <br />
                  {video.youtubeVideoId}
                </p>
                <p>
                  <span className="font-bold text-ink">최근 수집</span>
                  <br />
                  {formatDate(video.collectedAt)}
                </p>
                <p>
                  <span className="font-bold text-ink">게시일</span>
                  <br />
                  {formatDate(video.publishedAt)}
                </p>
                {video.youtubeChannelId ? (
                  <p>
                    <span className="font-bold text-ink">채널 ID</span>
                    <br />
                    {video.youtubeChannelId}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <Card title="조회수, 좋아요, 댓글 추이">
            {chartData.length > 1 ? (
              <div className="h-80 min-w-0">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={chartData} margin={{ bottom: 8, left: 0, right: 16, top: 8 }}>
                    <CartesianGrid stroke="#ede9fe" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} tickMargin={8} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={metricLabel} width={48} />
                    <Tooltip formatter={(value, name) => [metricLabel(value), name]} labelFormatter={(_, payload) => formatDate(payload?.[0]?.payload?.collectedAt)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="viewCount" dot={false} name="조회수" stroke="#7c3aed" strokeWidth={2.5} type="monotone" />
                    <Line dataKey="likeCount" dot={false} name="좋아요" stroke="#2563eb" strokeWidth={2.5} type="monotone" />
                    <Line dataKey="commentCount" dot={false} name="댓글" stroke="#059669" strokeWidth={2.5} type="monotone" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                description="영상별 추이 그래프는 최소 2개 이상의 일일 스냅샷이 필요합니다."
                title="추이 데이터가 더 필요합니다"
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
