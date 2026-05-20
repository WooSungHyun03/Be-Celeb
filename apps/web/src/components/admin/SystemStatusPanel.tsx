"use client";

import { useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { testLLM, testShop, testYouTube } from "@/lib/api/admin";
import type { AdminSystemStatus, AdminTestResult } from "@/types/admin";

type SystemStatusPanelProps = {
  status: AdminSystemStatus | null;
  apiBaseUrl: string;
  onError: (message: string) => void;
};

export function SystemStatusPanel({ status, apiBaseUrl, onError }: SystemStatusPanelProps) {
  const [youtubeResult, setYoutubeResult] = useState<AdminTestResult | null>(null);
  const [llmResult, setLlmResult] = useState<AdminTestResult | null>(null);
  const [shopResult, setShopResult] = useState<AdminTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  async function runTest(type: "youtube" | "llm" | "shop") {
    setIsTesting(true);
    try {
      const result = type === "youtube" ? await testYouTube() : type === "llm" ? await testLLM() : await testShop();
      if (type === "youtube") {
        setYoutubeResult(result);
      } else if (type === "llm") {
        setLlmResult(result);
      } else {
        setShopResult(result);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "시스템 테스트를 실행하지 못했습니다.");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="시스템 설정/상태">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">Frontend API base URL</p>
            <p className="mt-1 break-all text-sm font-bold text-ink">{apiBaseUrl}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Backend environment</p>
            <p className="mt-1 text-sm font-bold text-ink">{status?.environment ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Supabase 연결</p>
            <Badge tone={status?.supabaseConnected ? "brand" : "signal"}>
              {status?.supabaseConnected ? "connected" : "not connected"}
            </Badge>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(status?.env ?? {}).map(([name, configured]) => (
            <div className="rounded-md border border-slate-200 p-3" key={name}>
              <p className="break-all text-xs font-semibold text-slate-500">{name}</p>
              <Badge className="mt-2" tone={configured ? "brand" : "warning"}>
                configured: {String(configured)}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card title="외부 API 테스트">
        <div className="flex flex-wrap gap-3">
          <Button disabled={isTesting} onClick={() => runTest("youtube")}>
            YouTube API 테스트
          </Button>
          <Button disabled={isTesting} onClick={() => runTest("llm")} variant="secondary">
            Local LLM API 테스트
          </Button>
          <Button disabled={isTesting} onClick={() => runTest("shop")} variant="secondary">
            Naver Shopping API 테스트
          </Button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {[youtubeResult, llmResult, shopResult].map((result, index) =>
            result ? (
              <div className="rounded-md border border-slate-200 p-3" key={`${result.message}-${index}`}>
                <Badge tone={result.ok ? "brand" : "signal"}>{result.ok ? "ok" : "failed"}</Badge>
                <p className="mt-2 text-sm leading-6 text-slate-700">{result.message}</p>
                {result.detail ? <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(result.detail, null, 2)}</pre> : null}
              </div>
            ) : null,
          )}
        </div>
      </Card>
    </div>
  );
}
