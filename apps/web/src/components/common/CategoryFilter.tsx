"use client";

// Provides a segmented category filter control.
import { cn } from "@/utils/cn";

export type CategoryFilterOption = {
  id: string;
  label: string;
  count?: number;
};

type CategoryFilterProps = {
  categories: CategoryFilterOption[];
  selectedId?: string;
  allLabel?: string;
  onChange?: (categoryId: string) => void;
  className?: string;
};

export function CategoryFilter({ categories, selectedId = "all", allLabel = "전체", onChange, className }: CategoryFilterProps) {
  const options = [{ id: "all", label: allLabel }, ...categories];

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((category) => {
        const active = category.id === selectedId;

        return (
          <button
            className={cn(
              "inline-flex min-h-10 items-center gap-1 rounded-lg border px-4 py-2 text-sm font-semibold transition duration-200",
              active
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700",
            )}
            key={category.id}
            onClick={() => onChange?.(category.id)}
            type="button"
          >
            <span>{category.label}</span>
            {typeof category.count === "number" ? <span className="text-xs opacity-70">{category.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
