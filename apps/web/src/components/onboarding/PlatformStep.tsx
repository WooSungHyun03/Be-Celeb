// Renders the platform selection step for onboarding.
import { PLATFORMS } from "@/constants/platforms";

export function PlatformStep() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">1단계: 운영 플랫폼</h2>
        <p className="mt-2 text-sm text-slate-500">현재 운영 중이거나 집중하고 싶은 숏폼 플랫폼을 선택하세요.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PLATFORMS.map((platform, index) => (
          <button
            key={platform.id}
            className={`rounded-lg border p-4 text-left text-sm font-semibold transition ${
              index === 0 ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-ink hover:border-violet-300"
            }`}
          >
            {platform.label}
            <span className="mt-2 block text-xs font-normal text-slate-500">숏폼 성과와 반응을 추적합니다.</span>
          </button>
        ))}
      </div>
    </section>
  );
}
