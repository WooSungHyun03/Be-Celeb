// Provides a reusable error state for failed API and interaction states.
import { Button } from "@/components/common/Button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
};

export function ErrorState({
  title = "문제가 발생했습니다",
  description = "잠시 후 다시 시도해주세요.",
  actionLabel = "다시 시도",
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
      <h2 className="text-base font-semibold text-rose-900">{title}</h2>
      <p className="mt-2 text-sm text-rose-700">{description}</p>
      <Button className="mt-4" variant="secondary">{actionLabel}</Button>
    </div>
  );
}
