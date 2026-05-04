// Provides a reusable empty state for mock pages.
type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
