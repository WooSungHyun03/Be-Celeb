"use client";

// Provides a reusable save/favorite toggle.
import { useState } from "react";
import { cn } from "@/utils/cn";

type FavoriteButtonProps = {
  active?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  onChange?: (active: boolean) => void;
  className?: string;
};

export function FavoriteButton({
  active = false,
  activeLabel = "저장됨",
  inactiveLabel = "저장",
  onChange,
  className,
}: FavoriteButtonProps) {
  const [isActive, setIsActive] = useState(active);

  function handleClick() {
    const nextValue = !isActive;
    setIsActive(nextValue);
    onChange?.(nextValue);
  }

  return (
    <button
      aria-pressed={isActive}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition duration-200",
        isActive
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-300 bg-white text-ink hover:-translate-y-0.5 hover:bg-slate-50",
        className,
      )}
      onClick={handleClick}
      type="button"
    >
      {isActive ? activeLabel : inactiveLabel}
    </button>
  );
}
