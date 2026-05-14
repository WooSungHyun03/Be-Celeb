// Provides loading and skeleton placeholders for async UI states.
import { cn } from "@/utils/cn";

type LoadingProps = {
  label?: string;
  className?: string;
};

export function Loading({ label = "데이터를 불러오는 중입니다.", className }: LoadingProps) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500", className)}>
      <div className="flex items-center gap-3">
        <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600" />
        {label}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-3 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 flex gap-2">
        <div className="h-6 w-16 animate-pulse rounded bg-slate-100" />
        <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
