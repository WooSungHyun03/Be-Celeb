"use client";

// Provides a reusable labeled input for auth and onboarding placeholders.
import type { InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText?: string;
};

export function Input({ className, label, helperText, id, ...props }: InputProps) {
  const inputId = id ?? label.replace(/\s+/g, "-").toLowerCase();

  return (
    <label className="block text-sm font-semibold text-slate-700" htmlFor={inputId}>
      <span>{label}</span>
      <input
        className={cn(
          "mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink",
          "placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100",
          className,
        )}
        id={inputId}
        {...props}
      />
      {helperText ? <span className="mt-1 block text-xs font-normal text-slate-500">{helperText}</span> : null}
    </label>
  );
}
