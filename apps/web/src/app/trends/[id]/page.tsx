// Renders a trend detail page from route params.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { GenerateRecommendationPanel } from "@/components/recommendation/GenerateRecommendationPanel";
import { ROUTES } from "@/constants/routes";
import { mockTrends } from "@/mocks/mockTrends";
import { formatDate } from "@/utils/format-date";

type TrendDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrendDetailPage({ params }: TrendDetailPageProps) {
  const { id } = await params;
  const trend = mockTrends.find((item) => item.id === id) ?? mockTrends[0];

  return (
    <div className="space-y-8">
      <Link href={ROUTES.trends} className="inline-flex text-sm font-semibold text-violet-700 hover:text-violet-800">
        트렌드 목록으로
      </Link>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-ink">{trend.title}</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">{trend.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{trend.category}</Badge>
              <Badge tone={trend.direction === "rising" ? "signal" : trend.direction === "stable" ? "info" : "warning"}>
                {trend.direction}
              </Badge>
              {trend.platforms.map((platform) => (
                <Badge key={platform}>{platform}</Badge>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">트렌드 점수</p>
                <p className="mt-2 text-3xl font-bold text-violet-700">{trend.score}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">상승률</p>
                <p className="mt-2 text-3xl font-bold text-rose-600">+{trend.growthRate}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">예상 피크</p>
                <p className="mt-2 text-lg font-bold text-ink">{formatDate(trend.predictedPeak)}</p>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">관련 키워드</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {trend.tags.map((tag) => (
                  <Badge key={tag} tone="info">#{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="상승률 차트">
          <div className="space-y-4">
            {[42, 58, 63, 78, 87].map((value, index) => (
              <div key={value} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{index + 1}주차</span>
                  <span>{value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-violet-500" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <GenerateRecommendationPanel />
    </div>
  );
}
