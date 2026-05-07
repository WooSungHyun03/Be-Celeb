// Renders the recommendation list page.
import { Badge } from "@/components/common/Badge";
import { GenerateRecommendationPanel } from "@/components/recommendation/GenerateRecommendationPanel";
import { RecommendationList } from "@/components/recommendation/RecommendationList";
import { CATEGORIES } from "@/constants/categories";
import { PLATFORMS } from "@/constants/platforms";
import { mockRecommendations } from "@/mocks/mockRecommendations";

export default function RecommendationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-ink">콘텐츠 추천</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">계정 유형과 목표에 맞춘 첫 3초 훅, 구성안, 해시태그를 확인하세요.</p>
      </div>
      <GenerateRecommendationPanel />
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700">카테고리 필터</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">전체</Badge>
            {CATEGORIES.map((category) => <Badge key={category.id}>{category.label}</Badge>)}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700">플랫폼 필터</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">전체 플랫폼</Badge>
            {PLATFORMS.map((platform) => <Badge key={platform.id}>{platform.label}</Badge>)}
          </div>
        </div>
      </div>
      <RecommendationList recommendations={mockRecommendations} title="추천하는 콘텐츠 전략" />
    </div>
  );
}
