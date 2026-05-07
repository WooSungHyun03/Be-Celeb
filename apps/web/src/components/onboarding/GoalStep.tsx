// Renders the creator goal selection step for onboarding.
const goals = [
  { label: "성장", description: "조회수와 팔로워 증가를 우선합니다." },
  { label: "브랜딩", description: "계정의 메시지와 톤을 선명하게 만듭니다." },
  { label: "커뮤니티", description: "댓글, 저장, 공유 같은 참여를 높입니다." },
  { label: "수익화", description: "광고, 협찬, 상품 판매 연결을 준비합니다." },
];

export function GoalStep() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">3단계: 우선 목표</h2>
        <p className="mt-2 text-sm text-slate-500">추천 전략의 우선순위를 결정할 목표를 선택하세요.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {goals.map((goal, index) => (
          <button
            key={goal.label}
            className={`rounded-lg border p-4 text-left transition ${
              index === 0 ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-white hover:border-violet-300"
            }`}
          >
            <span className="text-sm font-semibold text-ink">{goal.label}</span>
            <span className="mt-2 block text-xs leading-5 text-slate-500">{goal.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
