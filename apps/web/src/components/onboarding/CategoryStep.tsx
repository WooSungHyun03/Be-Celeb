// Renders the account category selection step for onboarding.
import { CATEGORIES } from "@/constants/categories";

export function CategoryStep() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">2단계: 콘텐츠 카테고리</h2>
        <p className="mt-2 text-sm text-slate-500">계정의 주제와 가장 가까운 카테고리를 골라주세요.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((category, index) => (
          <button
            key={category.id}
            className={`rounded-lg border p-4 text-left transition ${
              index === 1 ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-white hover:border-violet-300"
            }`}
          >
            <span className="text-sm font-semibold text-ink">{category.label}</span>
            <span className="mt-2 block text-xs leading-5 text-slate-500">{category.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
