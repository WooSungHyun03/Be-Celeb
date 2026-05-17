"use client";

import { useState } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { deleteVideo, updateVideo } from "@/lib/api/admin";
import type { AdminCategory, AdminInfluencerChannel, AdminVideo } from "@/types/admin";

type VideoDataManagerProps = {
  categories: AdminCategory[];
  channels: AdminInfluencerChannel[];
  videos: AdminVideo[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

function compactNumber(value: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }
  return Intl.NumberFormat("ko", { notation: "compact" }).format(value);
}

function normalizeTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim().replace(/^#/, "").toLowerCase()).filter(Boolean)));
}

export function VideoDataManager({ categories, channels, videos, onChanged, onError }: VideoDataManagerProps) {
  const [categoryId, setCategoryId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredVideos = videos.filter((video) => {
    const matchesCategory = !categoryId || video.categoryId === categoryId;
    const matchesChannel = !channelId || video.influencerChannelId === channelId;
    const text = [video.title, video.description, video.channel, ...video.tags].join(" ").toLowerCase();
    return matchesCategory && matchesChannel && text.includes(search.toLowerCase());
  });

  async function handleNormalize(video: AdminVideo) {
    setIsSaving(true);
    try {
      await updateVideo(video.id, { tags: normalizeTags(video.tags) });
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "태그를 정규화하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(video: AdminVideo) {
    if (!window.confirm(`${video.title} 영상을 삭제할까요?`)) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteVideo(video.id);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "영상을 삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card title="영상 데이터 관리">
      <div className="mb-4 grid gap-3 lg:grid-cols-[170px_220px_1fr]">
        <select
          className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setCategoryId(event.target.value)}
          value={categoryId}
        >
          <option value="">전체 카테고리</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setChannelId(event.target.value)}
          value={channelId}
        >
          <option value="">전체 채널</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.channelTitle ?? channel.channelUrl ?? channel.id}
            </option>
          ))}
        </select>
        <input
          className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="제목, 설명, 태그 검색"
          value={search}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">영상</th>
              <th className="px-3 py-2">카테고리</th>
              <th className="px-3 py-2">채널</th>
              <th className="px-3 py-2">성과</th>
              <th className="px-3 py-2">게시/수집</th>
              <th className="px-3 py-2 text-right">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredVideos.map((video) => (
              <tr key={video.id}>
                <td className="px-3 py-3">
                  <p className="max-w-[460px] font-semibold leading-6 text-ink">{video.title}</p>
                  <div className="mt-2 flex max-w-[460px] flex-wrap gap-1">
                    {video.tags.slice(0, 5).map((tag) => (
                      <Badge key={`${video.id}-${tag}`}>{tag}</Badge>
                    ))}
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-500">raw json 보기</summary>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                      {JSON.stringify(video.raw, null, 2)}
                    </pre>
                  </details>
                </td>
                <td className="px-3 py-3">{video.category}</td>
                <td className="px-3 py-3">{video.channel}</td>
                <td className="px-3 py-3 text-xs leading-6 text-slate-600">
                  조회 {compactNumber(video.viewCount)}
                  <br />
                  좋아요 {compactNumber(video.likeCount)}
                  <br />
                  댓글 {compactNumber(video.commentCount)}
                </td>
                <td className="px-3 py-3 text-xs leading-6 text-slate-500">
                  {video.publishedAt ?? "-"}
                  <br />
                  {video.collectedAt ?? "-"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    {video.youtubeUrl ? (
                      <a className="text-sm font-semibold text-violet-700" href={video.youtubeUrl} rel="noreferrer" target="_blank">
                        YouTube
                      </a>
                    ) : null}
                    <Button disabled={isSaving} onClick={() => handleNormalize(video)} variant="secondary">
                      태그 정규화
                    </Button>
                    <Button disabled={isSaving} onClick={() => handleDelete(video)} variant="danger">
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
