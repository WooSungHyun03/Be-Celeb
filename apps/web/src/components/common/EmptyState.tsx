// Provides a reusable empty state for pages.
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-violet-200 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_100%)] p-8 text-center shadow-sm shadow-violet-100/60">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-violet-50 text-xl font-black text-violet-600">+</div>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
