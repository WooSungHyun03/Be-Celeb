// Provides a reusable pricing/subscription plan card.
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { cn } from "@/utils/cn";

type PlanCardProps = {
  name: string;
  price: string;
  description?: string;
  features: string[];
  highlighted?: boolean;
  badgeLabel?: string;
  ctaLabel?: string;
  onSelect?: () => void;
  className?: string;
};

export function PlanCard({
  name,
  price,
  description,
  features,
  highlighted = false,
  badgeLabel = "추천",
  ctaLabel = "선택하기",
  onSelect,
  className,
}: PlanCardProps) {
  return (
    <article className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", highlighted && "border-violet-300 ring-2 ring-violet-100", className)}>
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-ink">{name}</h2>
            {highlighted ? <Badge tone="brand">{badgeLabel}</Badge> : null}
          </div>
          <p className="mt-3 text-3xl font-bold text-ink">{price}</p>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm text-slate-600">
              <span className="font-bold text-violet-600">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={onSelect} variant={highlighted ? "primary" : "secondary"}>
          {ctaLabel}
        </Button>
      </div>
    </article>
  );
}
