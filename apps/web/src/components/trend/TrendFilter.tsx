// Renders a non-functional filter skeleton for future trend filtering.
import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import { CATEGORIES } from "@/constants/categories";
import { PLATFORMS } from "@/constants/platforms";

export function TrendFilter() {
  return (
    <Card title="필터 skeleton">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">카테고리</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Badge key={category.id}>{category.label}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">플랫폼</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => (
              <Badge key={platform.id}>{platform.label}</Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
