import type { StoryboardScene } from "@/types/content-recommendation";

type StoryboardRendererProps = {
  scenes: StoryboardScene[];
};

export function StoryboardRenderer({ scenes }: StoryboardRendererProps) {
  if (scenes.length === 0) {
    return <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">콘티 정보가 없습니다.</p>;
  }

  return (
    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {scenes.map((scene) => (
        <article className="grid gap-3 p-4 md:grid-cols-[96px_minmax(0,1fr)]" key={`${scene.scene}-${scene.duration}`}>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Scene {scene.scene}</p>
            <p className="mt-1 text-sm font-bold text-violet-700">{scene.duration}</p>
          </div>
          <div className="grid gap-3 text-sm leading-6 text-slate-700">
            <div>
              <p className="font-semibold text-ink">화면 구성</p>
              <p className="mt-1 break-words">{scene.visual || scene.description || "화면 구성이 없습니다."}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="font-semibold text-ink">대사</p>
                <p className="mt-1 break-words">{scene.dialogue || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-ink">자막</p>
                <p className="mt-1 break-words">{scene.caption || "-"}</p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-ink">촬영 포인트</p>
              <p className="mt-1 break-words">{scene.shootingTip || "-"}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
