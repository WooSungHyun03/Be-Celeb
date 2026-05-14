// Provides a compact toast-like feedback message.
import { cn } from "@/utils/cn";

type ToastProps = {
  message: string;
  tone?: "success" | "error" | "info";
};

const toneClasses: Record<NonNullable<ToastProps["tone"]>, string> = {
  success: "border-violet-200 bg-violet-50 text-violet-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

export function Toast({ message, tone = "success" }: ToastProps) {
  return <p className={cn("rounded-md border px-3 py-2 text-sm font-medium", toneClasses[tone])}>{message}</p>;
}
