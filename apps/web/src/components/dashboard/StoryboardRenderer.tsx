import type { StoryboardScene } from "@/types/content-recommendation";

type StoryboardRendererProps = {
  scenes: StoryboardScene[];
};

export function StoryboardRenderer({ scenes }: StoryboardRendererProps) {
  if (scenes.length === 0) {
    return <p className="rounded-xl border border-dashed border-violet-200 bg-violet-50 px-4 py-4 text-sm text-slate-600">콘티 정보가 없습니다.</p>;
  }

  return (
    <div className="grid gap-4">
      {scenes.map((scene) => (
        <article
          className="overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_100%)] shadow-sm shadow-violet-100/70"
          key={`${scene.scene}-${scene.duration}`}
        >
          <div className="grid gap-0 md:grid-cols-[132px_minmax(0,1fr)]">
            <div className="flex flex-row items-center justify-between gap-3 border-b border-violet-100 bg-violet-600 px-4 py-4 text-white md:flex-col md:items-start md:justify-start md:border-b-0 md:border-r">
              <div>
                <p className="text-xs font-bold uppercase text-violet-100">Scene</p>
                <p className="mt-1 text-3xl font-black leading-none">{scene.scene}</p>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white shadow-inner">
                {scene.duration}
              </span>
            </div>

            <div className="grid gap-4 p-5 text-sm leading-6 text-slate-700">
              <div className="rounded-xl border border-violet-100 bg-white p-4">
                <p className="text-xs font-black uppercase text-violet-700">화면 구성</p>
                <p className="mt-2 break-words font-medium text-ink">{scene.visual || scene.description || "화면 구성이 없습니다."}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-500">대사</p>
                  <p className="mt-2 break-words">{scene.dialogue || "-"}</p>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-500">자막</p>
                  <p className="mt-2 break-words">{scene.caption || "-"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-xs font-black uppercase text-slate-500">촬영 포인트</p>
                <p className="mt-2 break-words">{scene.shootingTip || "-"}</p>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
