"use client";

// Simulates recommendation generation UI states until the API is connected.
import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { ErrorState } from "@/components/common/ErrorState";
import { Loading } from "@/components/common/Loading";
import { Toast } from "@/components/common/Toast";

type Status = "idle" | "loading" | "success" | "error";

export function GenerateRecommendationPanel() {
  const [status, setStatus] = useState<Status>("idle");

  function handleGenerate() {
    setStatus("loading");
    window.setTimeout(() => {
      setStatus("success");
    }, 700);
  }

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-700">AI 추천 생성</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">현재 트렌드로 다음 콘텐츠 만들기</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={status === "loading"}>추천 생성</Button>
          <Button variant="ghost" onClick={() => setStatus("error")}>상태 확인</Button>
        </div>
      </div>
      <div className="mt-4">
        {status === "loading" ? <Loading label="추천 결과를 생성하는 중입니다." /> : null}
        {status === "success" ? <Toast message="추천 생성이 완료되었습니다. 아래 추천 목록을 확인하세요." /> : null}
        {status === "error" ? <ErrorState title="추천 생성 실패" description="네트워크 상태 또는 API 설정을 확인해주세요." /> : null}
      </div>
    </Card>
  );
}
