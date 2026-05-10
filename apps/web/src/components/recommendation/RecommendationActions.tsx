"use client";

// Provides copy, save, and download-style action feedback for recommendations.
import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Toast } from "@/components/common/Toast";
import type { Recommendation } from "@/types/recommendation";

type RecommendationActionsProps = {
  recommendation: Recommendation;
};

export function RecommendationActions({ recommendation }: RecommendationActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(recommendation.isSaved);

  const copyText = [
    recommendation.title,
    `훅: ${recommendation.hook}`,
    ...recommendation.outline,
    recommendation.hashtags.join(" "),
  ].join("\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setMessage("추천 결과를 클립보드에 복사했습니다.");
    } catch {
      setMessage("복사 권한을 확인해주세요.");
    }
  }

  function handleSave() {
    setSaved((current) => !current);
    setMessage(saved ? "저장을 해제했습니다." : "추천 콘텐츠를 저장했습니다.");
  }

  return (
    <Card title="작업">
      <div className="space-y-3">
        {message ? <Toast message={message} tone={message.includes("확인") ? "error" : "success"} /> : null}
        <Button className="w-full" onClick={handleCopy}>추천 결과 복사</Button>
        <Button className="w-full" variant={saved ? "secondary" : "primary"} onClick={handleSave}>
          {saved ? "저장됨" : "추천 저장"}
        </Button>
        <Button className="w-full" variant="secondary">카드 다운로드</Button>
      </div>
    </Card>
  );
}
