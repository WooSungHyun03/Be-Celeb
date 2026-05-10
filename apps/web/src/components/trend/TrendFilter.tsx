// Renders category and platform filters for trend discovery.
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { CATEGORIES } from "@/constants/categories";
import { PLATFORMS } from "@/constants/platforms";

export function TrendFilter() {
  return (
    <Card title="필터">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700">카테고리</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">전체</Badge>
            {CATEGORIES.map((category) => (
              <button key={category.id} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
                {category.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700">플랫폼</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">전체 플랫폼</Badge>
            {PLATFORMS.map((platform) => (
              <button key={platform.id} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-sky-50 hover:text-sky-700">
                {platform.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
