// Provides a compact status/category badge component.
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type BadgeProps = {
  children: ReactNode;
  tone?: "default" | "brand" | "signal";
};

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "bg-slate-100 text-slate-700",
  brand: "bg-emerald-50 text-emerald-700",
  signal: "bg-rose-50 text-rose-700",
};

export function Badge({ children, tone = "default" }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium", toneClasses[tone])}>
      {children}
    </span>
  );
}
