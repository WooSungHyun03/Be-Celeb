"use client";

import { useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { deleteRecommendation } from "@/lib/client/admin-api";
import type { AdminAnalysis, AdminRecommendation, AdminRecommendationOption } from "@/types/admin";

type RecommendationManagerProps = {
  analyses: AdminAnalysis[];
  recommendations: AdminRecommendation[];
  options: AdminRecommendationOption[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

export function RecommendationManager({ analyses, recommendations, options, onChanged, onError }: RecommendationManagerProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(recommendation: AdminRecommendation) {
    if (!window.confirm("이 추천 결과를 삭제할까요?")) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteRecommendation(recommendation.id);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "추천 결과를 삭제하지 못했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="user_channel_analyses">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2">채널</th>
                <th className="px-3 py-2">카테고리</th>
                <th className="px-3 py-2">최근 영상</th>
                <th className="px-3 py-2">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analyses.map((analysis) => (
                <tr key={analysis.id}>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{analysis.channel_title}</p>
                    <p className="mt-1 max-w-[360px] truncate text-xs text-slate-500">{analysis.channel_url}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone="info">{analysis.selected_category ?? "-"}</Badge>
                    {analysis.inferred_category ? <Badge className="ml-2">{analysis.inferred_category}</Badge> : null}
                  </td>
                  <td className="px-3 py-3">{analysis.recent_videos?.length ?? 0}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{analysis.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="recommendation_options">
        <div className="grid gap-3">
          {options.map((option) => (
            <details className="rounded-md border border-slate-200 p-3" key={option.id}>
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                {option.option_id} · {option.selected_category}
              </summary>
              <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                {JSON.stringify(option.option_payload, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </Card>

      <Card title="content_recommendations">
        <div className="grid gap-3">
          {recommendations.map((recommendation) => (
            <details className="rounded-md border border-slate-200 p-3" key={recommendation.id}>
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                {recommendation.selected_category} · {recommendation.created_at}
              </summary>
              <div className="mt-3 flex justify-end">
                <Button disabled={isDeleting} onClick={() => handleDelete(recommendation)} variant="danger">
                  추천 삭제
                </Button>
              </div>
              <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                {JSON.stringify({ input: recommendation.input_payload, llm: recommendation.llm_response }, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
