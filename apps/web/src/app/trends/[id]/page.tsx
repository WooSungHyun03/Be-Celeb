// Renders a mock trend detail page from route params.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { mockTrends } from "@/mocks/mockTrends";
import { ROUTES } from "@/constants/routes";

type TrendDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrendDetailPage({ params }: TrendDetailPageProps) {
  const { id } = await params;
  const trend = mockTrends.find((item) => item.id === id) ?? mockTrends[0];

  return (
    <div className="space-y-8">
      <Link
        href={ROUTES.trends}
        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
      >
        ← 간단한 보기
      </Link>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-semibold text-ink">{trend.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="brand">{trend.category}</Badge>
            {trend.platforms.map((platform) => (
              <Badge key={platform}>{platform}</Badge>
            ))}
          </div>
        </div>

        <Card className="rounded-3xl border-slate-200">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-ink">총 설명</h2>
              <p className="mt-3 leading-7 text-slate-600">{trend.description}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-ink">추세 스쿀어</h2>
              <p className="mt-3 text-4xl font-bold text-emerald-600">{trend.score}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="rounded-xl bg-slate-50">
                <p className="text-sm text-slate-500">Today</p>
                <p className="mt-2 text-lg font-semibold text-ink">+12</p>
              </Card>
              <Card className="rounded-xl bg-slate-50">
                <p className="text-sm text-slate-500">This week</p>
                <p className="mt-2 text-lg font-semibold text-ink">+48</p>
              </Card>
            </div>

            <p className="text-sm text-slate-500">실시닜냈오 추세 분석, 근거 콘테늤, 내링 스차트는 녉 오닫다는 균희</p>
          </div>
        </Card>

        <Button className="w-full">AI 추천 미래보기</Button>
      </div>
    </div>
  );
}
