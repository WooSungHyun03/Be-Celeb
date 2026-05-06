// Renders the pricing placeholder page for future product planning.
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";

const plans = [
  {
    name: "Starter",
    description: "크리에이터용 기본 분석 패키지",
    features: ["모든 카테고리 분석", "콘텐츠 10개 저장", "기본 추천"]
  },
  {
    name: "Creator",
    description: "성장중인 채널을 위한 프리미엄",
    features: ["우선 분석", "콘텐츠 무제한 저장", "AI 추천 2배 증가"]
  },
  {
    name: "Team",
    description: "팀 협업을 위한 엔터프라이즈",
    features: ["실시간 공유", "팀 멤버 추가", "우선 지원"]
  }
];

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-ink">간단한 가격</h1>
        <p className="mt-3 text-base text-slate-600">모든 크리에이터가 시작하기 쉽도록 만들었습니다.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className="rounded-3xl border-slate-200">
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-ink">{plan.name}</h2>
                <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-sm text-slate-600">
                    <span className="mr-2 text-emerald-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full">선택하기</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
