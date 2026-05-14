"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { deleteAllCollectionLogs, deleteAllVideos, deleteInactiveChannels, deleteVideosByCategory } from "@/lib/client/admin-api";
import type { AdminCategory } from "@/types/admin";

type DangerZoneProps = {
  categories: AdminCategory[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

type DangerAction = "delete-videos-by-category" | "delete-all-videos" | "delete-logs" | "delete-inactive-channels" | null;

export function DangerZone({ categories, onChanged, onError }: DangerZoneProps) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [confirmText, setConfirmText] = useState("");
  const [action, setAction] = useState<DangerAction>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function runDangerAction() {
    if (confirmText !== "DELETE") {
      onError('위험 작업은 "DELETE" 입력이 필요합니다.');
      return;
    }
    setIsRunning(true);
    try {
      if (action === "delete-videos-by-category") {
        await deleteVideosByCategory(categoryId, confirmText);
      }
      if (action === "delete-all-videos") {
        await deleteAllVideos(confirmText);
      }
      if (action === "delete-logs") {
        await deleteAllCollectionLogs(confirmText);
      }
      if (action === "delete-inactive-channels") {
        await deleteInactiveChannels(confirmText);
      }
      setAction(null);
      setConfirmText("");
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "위험 작업을 실행하지 못했습니다.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card title="위험 작업 구역">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="font-bold text-rose-900">특정 카테고리 영상 삭제</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">선택한 카테고리에 연결된 `influencer_videos`를 삭제합니다.</p>
          <select
            className="mt-4 min-h-10 w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Button className="mt-4" onClick={() => setAction("delete-videos-by-category")} variant="danger">
            카테고리 영상 삭제
          </Button>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="font-bold text-rose-900">inactive 채널 일괄 삭제</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">비활성 채널과 연결된 영상이 cascade 삭제될 수 있습니다.</p>
          <Button className="mt-4" onClick={() => setAction("delete-inactive-channels")} variant="danger">
            비활성 채널 삭제
          </Button>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="font-bold text-rose-900">전체 영상 데이터 삭제</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">모든 `influencer_videos`를 삭제합니다. 추천 DB는 유지됩니다.</p>
          <Button className="mt-4" onClick={() => setAction("delete-all-videos")} variant="danger">
            전체 영상 삭제
          </Button>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="font-bold text-rose-900">collection_logs 전체 삭제</p>
          <p className="mt-2 text-sm leading-6 text-rose-700">수집 로그 이력만 정리합니다. 영상 데이터는 삭제하지 않습니다.</p>
          <Button className="mt-4" onClick={() => setAction("delete-logs")} variant="danger">
            로그 전체 삭제
          </Button>
        </div>
      </div>

      <ConfirmModal
        confirmLabel={isRunning ? "실행 중" : "위험 작업 실행"}
        description='정말 실행하려면 아래 입력창에 "DELETE"를 입력하세요.'
        onClose={() => {
          setAction(null);
          setConfirmText("");
        }}
        onConfirm={runDangerAction}
        open={action !== null}
        title="위험 작업 확인"
        tone="danger"
      >
        <input
          className="min-h-10 w-full rounded-md border border-rose-300 px-3 py-2 text-sm"
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="DELETE"
          value={confirmText}
        />
      </ConfirmModal>
    </Card>
  );
}
