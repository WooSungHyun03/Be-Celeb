import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { AdminOverview } from "@/types/admin";

type OverviewCardsProps = {
  overview: AdminOverview | null;
};

const metricLabels: Array<{ key: keyof AdminOverview; label: string }> = [
  { key: "totalCategories", label: "카테고리" },
  { key: "totalInfluencerChannels", label: "인플루언서 채널" },
  { key: "activeChannels", label: "활성 채널" },
  { key: "inactiveChannels", label: "비활성 채널" },
  { key: "totalVideos", label: "저장 영상" },
  { key: "videosCollectedLast24h", label: "최근 24시간 수집" },
  { key: "recommendationCount", label: "추천 생성" },
];

export function OverviewCards({ overview }: OverviewCardsProps) {
  if (!overview) {
    return (
      <Card>
        <p className="text-sm text-slate-500">운영 지표를 불러오는 중입니다.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricLabels.map((metric) => (
          <Card className="shadow-none" key={metric.key}>
            <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
            <p className="mt-2 text-3xl font-bold text-ink">{String(overview[metric.key] ?? 0)}</p>
          </Card>
        ))}
      </div>
      <Card title="최근 수집 상태">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={overview.latestCollectionStatus === "success" ? "brand" : "warning"}>
            {overview.latestCollectionStatus ?? "로그 없음"}
          </Badge>
          <span className="text-sm text-slate-500">{overview.latestCollectionFinishedAt ?? "finished_at 없음"}</span>
        </div>
        {overview.recentErrors.length > 0 ? (
          <div className="mt-4 grid gap-2">
            {overview.recentErrors.slice(0, 4).map((error, index) => (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" key={`${String(error.id ?? index)}-${index}`}>
                {String(error.message ?? error.status ?? "Unknown collection error")}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">최근 에러 로그가 없습니다.</p>
        )}
      </Card>
    </div>
  );
}
