// Renders a mock trend detail page from route params.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
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
    <div className="space-y-6">
      <Link className="text-sm font-medium text-emerald-700" href={ROUTES.trends}>
        ← 트렌드 목록
      </Link>
      <Card title={trend.title}>
        <div className="space-y-4">
          <p className="text-slate-600">{trend.description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{trend.category}</Badge>
            {trend.platforms.map((platform) => (
              <Badge key={platform}>{platform}</Badge>
            ))}
          </div>
          <p className="text-sm text-slate-500">TODO: 실제 트렌드 상세 분석, 근거 콘텐츠, 예측 그래프 연결 예정</p>
        </div>
      </Card>
    </div>
  );
}
