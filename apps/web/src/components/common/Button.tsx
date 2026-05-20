"use client";

// Provides a reusable button skeleton for interactive UI controls.
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-violet-600 text-white shadow-sm shadow-violet-200 hover:bg-violet-700",
  secondary: "border border-slate-300 bg-white text-ink shadow-sm hover:border-violet-300 hover:bg-violet-50",
  ghost: "text-slate-700 hover:bg-violet-50 hover:text-violet-700",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
