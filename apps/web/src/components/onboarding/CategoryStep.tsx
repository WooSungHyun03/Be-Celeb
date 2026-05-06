// Renders the mock account category selection step for onboarding.
import { Badge } from "@/components/common/Badge";
import { CATEGORIES } from "@/constants/categories";

export function CategoryStep() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">2단계: 카테고리</h2>
        <p className="mt-2 text-sm text-slate-500">계정의 주 콘텐츠 카테고리를 선택하세요.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {CATEGORIES.map((category) => (
          <button key={category.id} className="rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-emerald-500 hover:bg-emerald-50">
            {category.label}
          </button>
        ))}
      </div>
    </section>
  );
}
