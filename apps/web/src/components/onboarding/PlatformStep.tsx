// Renders the mock platform selection step for onboarding.
import { Badge } from "@/components/common/Badge";
import { PLATFORMS } from "@/constants/platforms";

export function PlatformStep() {
  return (
    <section>
      <h2 className="text-base font-semibold text-ink">1. 플랫폼</h2>
      <p className="mt-2 text-sm text-slate-500">운영 중인 숏폼 플랫폼을 선택하는 단계입니다.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => (
          <Badge key={platform.id}>{platform.label}</Badge>
        ))}
      </div>
    </section>
  );
}
