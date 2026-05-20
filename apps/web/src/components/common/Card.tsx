// Provides a reusable card container for repeated UI sections.
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, children, className }: CardProps) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70", className)}>
      {title ? <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2> : null}
      {children}
    </section>
  );
}
