// Renders the mock creator goal selection step for onboarding.
const goals = ["성장", "브랜딩", "커뮤니티", "전환"];

export function GoalStep() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">3단계: 목표</h2>
        <p className="mt-2 text-sm text-slate-500">추천 전략의 우선순위를 결정할 목표를 선택하세요.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {goals.map((goal) => (
          <button key={goal} className="rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-emerald-500 hover:bg-emerald-50">
            {goal}
          </button>
        ))}
      </div>
    </section>
  );
}
