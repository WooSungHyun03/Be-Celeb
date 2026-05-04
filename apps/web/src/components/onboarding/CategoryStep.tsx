// Renders the mock account category selection step for onboarding.
import { Badge } from "@/components/common/Badge";
import { CATEGORIES } from "@/constants/categories";

export function CategoryStep() {
  return (
    <section>
      <h2 className="text-base font-semibold text-ink">2. 카테고리</h2>
      <p className="mt-2 text-sm text-slate-500">계정의 주 콘텐츠 카테고리를 정리합니다.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <Badge key={category.id}>{category.label}</Badge>
        ))}
      </div>
    </section>
  );
}
