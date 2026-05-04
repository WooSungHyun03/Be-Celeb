// Provides a simple loading placeholder for future async UI states.
export function Loading() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
      데이터를 불러오는 중입니다. TODO: 실제 Suspense/loading 상태와 연결 예정
    </div>
  );
}
