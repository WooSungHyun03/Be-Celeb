import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import type { RecommendOptionsResponse, RecommendationOption } from "@/types/content-recommendation";

type RecommendationOptionCardsProps = {
  result: RecommendOptionsResponse;
  selectedOptionId?: string | null;
  isLoading: boolean;
  onSelect: (option: RecommendationOption) => void;
};

export function RecommendationOptionCards({
  result,
  selectedOptionId,
  isLoading,
  onSelect,
}: RecommendationOptionCardsProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">추천 옵션 3개</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {result.channel.title} 채널과 {result.selectedCategory} 카테고리 데이터를 바탕으로 생성했습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">선택 {result.selectedCategory}</Badge>
          {result.inferredCategory ? <Badge tone="info">추론 {result.inferredCategory}</Badge> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {result.options.map((option, index) => (
          <Card className="flex min-h-[320px] flex-col shadow-none" key={option.optionId}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">옵션 {index + 1}</Badge>
              <Badge>{option.format}</Badge>
            </div>
            <h3 className="mt-4 text-xl font-bold leading-7 text-ink">{option.ideaTitle}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{option.summary}</p>
            <div className="mt-4 grid gap-3 text-sm">
              <div>
                <p className="font-bold text-slate-500">추천 이유</p>
                <p className="mt-1 leading-6 text-slate-700">{option.reason}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500">중복 제외 근거</p>
                <p className="mt-1 leading-6 text-slate-700">{option.whyNotDuplicate}</p>
              </div>
              <div>
                <p className="font-bold text-slate-500">예상 시청자</p>
                <p className="mt-1 leading-6 text-slate-700">{option.expectedAudience}</p>
              </div>
            </div>
            <div className="mt-auto pt-5">
              <Button
                className="w-full"
                disabled={isLoading}
                onClick={() => onSelect(option)}
                variant={selectedOptionId === option.optionId ? "secondary" : "primary"}
              >
                {selectedOptionId === option.optionId && isLoading ? "콘티 생성 중" : "이 아이디어로 콘티 만들기"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
