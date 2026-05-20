// Provides a consistent title block for top-level app pages.
import type { ReactNode } from "react";
import { Badge } from "@/components/common/Badge";
import { cn } from "@/utils/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function PageHeader({ title, description, eyebrow, action, align = "left", className }: PageHeaderProps) {
  const isCentered = align === "center";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_54%,#f8fafc_100%)] p-6 shadow-sm shadow-violet-100/70",
        "flex flex-col justify-between gap-4",
        isCentered ? "items-center text-center" : "md:flex-row md:items-end",
        className,
      )}
    >
      <div className={cn(isCentered ? "mx-auto max-w-3xl" : "max-w-3xl")}>
        {typeof eyebrow === "string" ? <Badge tone="brand">{eyebrow}</Badge> : eyebrow}
        <h1 className={cn("text-3xl font-black tracking-tight text-ink sm:text-4xl", eyebrow ? "mt-3" : "")}>{title}</h1>
        {description ? <p className="mt-3 text-base leading-7 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className={cn(isCentered ? "mt-2" : "shrink-0")}>{action}</div> : null}
    </div>
  );
}
