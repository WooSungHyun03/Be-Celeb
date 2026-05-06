// Renders mock onboarding steps for platform, category, and goal selection.
import { Card } from "@/components/common/Card";
import { CategoryStep } from "@/components/onboarding/CategoryStep";
import { GoalStep } from "@/components/onboarding/GoalStep";
import { PlatformStep } from "@/components/onboarding/PlatformStep";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">온보딩</h1>
        <p className="mt-2 text-slate-600">사용자 계정 유형 분석을 위한 입력 단계 skeleton입니다.</p>
      </div>
      <Card>
        <div className="grid gap-6 lg:grid-cols-3">
          <PlatformStep />
          <CategoryStep />
          <GoalStep />
        </div>
      </Card>
    </div>
  );
}
