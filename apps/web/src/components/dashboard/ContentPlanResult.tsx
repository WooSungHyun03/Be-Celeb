import { Badge } from "@/components/common/Badge";
import { Card } from "@/components/common/Card";
import type { GenerateContentPlanResponse } from "@/types/content-recommendation";

type ContentPlanResultProps = {
  result: GenerateContentPlanResponse;
};

export function ContentPlanResult({ result }: ContentPlanResultProps) {
  const { plan } = result;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-ink">최종 콘텐츠 계획</h2>
        <p className="mt-2 text-sm text-slate-600">선택한 아이디어를 실행 가능한 제목, 콘티, 업로드 팁으로 확장했습니다.</p>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{plan.format}</Badge>
          {plan.hashtags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
        <h3 className="mt-4 text-2xl font-bold leading-8 text-ink">{plan.title}</h3>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-slate-500">썸네일 아이디어</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{plan.thumbnailIdea}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">타겟 시청자</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{plan.targetAudience}</p>
          </div>
          <div className="lg:col-span-2">
            <p className="text-sm font-bold text-slate-500">Hook</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{plan.hook}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-bold text-ink">콘티</p>
          <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {plan.storyboard.map((scene) => (
              <div className="grid gap-2 p-3 text-sm md:grid-cols-[80px_1fr_1fr]" key={`${result.selectedOptionId}-${scene.scene}`}>
                <p className="font-bold text-violet-700">{scene.duration}</p>
                <p className="text-slate-700">{scene.description}</p>
                <p className="text-slate-500">{scene.caption}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-bold text-ink">업로드 팁</p>
          <ul className="mt-3 grid gap-2">
            {plan.uploadTips.map((tip) => (
              <li className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700" key={tip}>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </section>
  );
}
