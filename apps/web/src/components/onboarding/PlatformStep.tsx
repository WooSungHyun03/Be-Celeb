// Renders the YouTube channel setup step for onboarding.
import { PLATFORMS } from "@/constants/platforms";

export function PlatformStep() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">1단계: YouTube 채널</h2>
        <p className="mt-2 text-sm text-slate-500">분석하고 싶은 YouTube 채널 유형을 확인하세요.</p>
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
            <span className="mt-2 block text-xs font-normal text-slate-500">채널 영상 성과와 반응을 추적합니다.</span>
          </button>
        ))}
      </div>
    </section>
  );
}

