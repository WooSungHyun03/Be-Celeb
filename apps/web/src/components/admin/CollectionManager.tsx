"use client";

import { useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { collectNow } from "@/lib/api/admin";
import type { AdminCollectionLog, AdminCollectionSummary } from "@/types/admin";

type CollectionManagerProps = {
  logs: AdminCollectionLog[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

export function CollectionManager({ logs, onChanged, onError }: CollectionManagerProps) {
  const [result, setResult] = useState<AdminCollectionSummary | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  async function handleCollectNow() {
    setIsCollecting(true);
    setResult(null);
    try {
      const data = await collectNow();
      setResult(data);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "수동 수집을 실행하지 못했습니다.");
    } finally {
      setIsCollecting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="데이터 수집 관리">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm leading-6 text-slate-600">
              기본 자동 수집은 KST 매일 06:00, UTC 매일 21:00, cron `0 21 * * *` 기준입니다.
            </p>
            <p className="mt-1 text-sm text-slate-500">이 버튼은 `/api/admin/collect-now`를 호출해 즉시 수집을 실행합니다.</p>
          </div>
          <Button disabled={isCollecting} onClick={handleCollectNow}>
            {isCollecting ? "수집 실행 중" : "지금 수동 수집 실행"}
          </Button>
        </div>
        {result ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Badge tone="info">channels {result.channelsChecked}</Badge>
            <Badge tone="info">found {result.videosFoundLast24h}</Badge>
            <Badge tone="brand">upserted {result.videosUpserted}</Badge>
            <Badge tone={result.errors.length ? "warning" : "brand"}>errors {result.errors.length}</Badge>
          </div>
        ) : null}
      </Card>

      <Card title="collection_logs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">시작</th>
                <th className="px-3 py-2">종료</th>
                <th className="px-3 py-2">요약</th>
                <th className="px-3 py-2">에러</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 py-3">
                    <Badge tone={log.status === "success" ? "brand" : log.status === "failed" ? "signal" : "warning"}>{log.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">{log.started_at}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{log.finished_at ?? "-"}</td>
                  <td className="px-3 py-3">
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-slate-500">summary</summary>
                      <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                        {JSON.stringify(log.summary, null, 2)}
                      </pre>
                    </details>
                  </td>
                  <td className="px-3 py-3 text-xs text-rose-600">{log.error_message ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
