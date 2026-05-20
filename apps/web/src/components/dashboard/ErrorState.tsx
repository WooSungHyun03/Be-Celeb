import { Button } from "@/components/common/Button";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
      <p className="text-sm font-semibold leading-6 text-rose-700">{message}</p>
      {onRetry ? (
        <Button className="mt-3" onClick={onRetry} variant="secondary">
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}
