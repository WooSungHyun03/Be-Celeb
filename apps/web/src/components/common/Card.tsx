// Provides a reusable card container for repeated UI sections.
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type CardProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, action, children, className }: CardProps) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70", className)}>
      {title || action ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {title ? <h2 className="text-lg font-bold text-ink">{title}</h2> : <span />}
          {action ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
