// Renders the pricing placeholder page for future product planning.
import { Card } from "@/components/common/Card";

const plans = ["Starter", "Creator", "Team"];

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">가격 정책</h1>
        <p className="mt-2 text-slate-600">MVP 이후 확장할 pricing skeleton입니다.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan} title={plan}>
            <p className="text-sm text-slate-600">TODO: 플랜별 분석량, 저장량, AI 호출량 정책 정의 예정</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
