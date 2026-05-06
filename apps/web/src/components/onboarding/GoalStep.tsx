// Renders the mock creator goal selection step for onboarding.
import { Badge } from "@/components/common/Badge";

const goals = ["성장", "브랜딩", "커뮤니티", "전환"];

export function GoalStep() {
  return (
    <section>
      <h2 className="text-base font-semibold text-ink">3. 목표</h2>
      <p className="mt-2 text-sm text-slate-500">추천 전략의 우선순위를 결정할 목표입니다.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {goals.map((goal) => (
          <Badge key={goal}>{goal}</Badge>
        ))}
      </div>
    </section>
  );
}
