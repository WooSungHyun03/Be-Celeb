// Renders the pricing page.
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";

const plans = [
  {
    name: "Starter",
    price: "0원",
    description: "혼자 시작하는 크리에이터용 기본 플랜",
    features: ["트렌드 목록 조회", "추천 콘텐츠 10개 저장", "기본 카테고리 필터"],
  },
  {
    name: "Creator",
    price: "19,000원",
    description: "꾸준히 성장하는 채널을 위한 추천 플랜",
    features: ["AI 추천 생성 확대", "추천 결과 복사/저장", "점수와 해시태그 분석", "우선 업데이트"],
    highlighted: true,
  },
  {
    name: "Team",
    price: "문의",
    description: "브랜드와 팀 협업을 위한 운영 플랜",
    features: ["팀 멤버 관리", "관리자 대시보드", "성과 리포트", "전용 지원"],
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <Badge tone="brand">Pricing</Badge>
        <h1 className="mt-3 text-4xl font-bold text-ink">가격제와 구독 플랜</h1>
        <p className="mt-3 text-base text-slate-600">크리에이터의 현재 단계에 맞춰 가볍게 시작하고 필요한 만큼 확장하세요.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.highlighted ? "border-violet-300 ring-2 ring-violet-100" : ""}>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold text-ink">{plan.name}</h2>
                  {plan.highlighted ? <Badge tone="brand">추천</Badge> : null}
                </div>
                <p className="mt-3 text-3xl font-bold text-ink">{plan.price}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{plan.description}</p>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-slate-600">
                    <span className="font-bold text-violet-600">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.highlighted ? "primary" : "secondary"}>선택하기</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
