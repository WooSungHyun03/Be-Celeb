// Renders the mock platform selection step for onboarding.
import { Badge } from "@/components/common/Badge";
import { PLATFORMS } from "@/constants/platforms";

export function PlatformStep() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">1단계: 플랫폼</h2>
        <p className="mt-2 text-sm text-slate-500">운영 중인 숏폼 플랫폼을 선택하세요. 여러 개 선택 가능합니다.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {PLATFORMS.map((platform) => (
          <button key={platform.id} className="rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-emerald-500 hover:bg-emerald-50">
            {platform.label}
          </button>
        ))}
      </div>
    </section>
  );
}
