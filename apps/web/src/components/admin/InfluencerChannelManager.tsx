"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import {
  createInfluencerChannel,
  deleteInfluencerChannel,
  syncInfluencerChannel,
  updateInfluencerChannel,
} from "@/lib/api/admin";
import type { AdminCategory, AdminInfluencerChannel } from "@/types/admin";

type InfluencerChannelManagerProps = {
  categories: AdminCategory[];
  channels: AdminInfluencerChannel[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

export function InfluencerChannelManager({ categories, channels, onChanged, onError }: InfluencerChannelManagerProps) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [channelUrl, setChannelUrl] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredChannels = channels.filter((channel) => {
    const matchesCategory = !filterCategoryId || channel.categoryId === filterCategoryId;
    const text = [channel.channelTitle, channel.channelUrl, channel.youtubeChannelId, channel.category].join(" ").toLowerCase();
    return matchesCategory && text.includes(search.toLowerCase());
  });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryId || !channelUrl.trim()) {
      return;
    }
    setIsSaving(true);
    try {
      await createInfluencerChannel({ categoryId, channelUrl, isActive: true });
      setChannelUrl("");
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "인플루언서 채널을 추가하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(channel: AdminInfluencerChannel) {
    setIsSaving(true);
    try {
      await updateInfluencerChannel(channel.id, { isActive: !channel.isActive });
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "채널 상태를 변경하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSync(channel: AdminInfluencerChannel) {
    setIsSaving(true);
    try {
      await syncInfluencerChannel(channel.id);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "YouTube 채널 정보를 동기화하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(channel: AdminInfluencerChannel) {
    if (!window.confirm(`${channel.channelTitle ?? channel.channelUrl ?? "채널"}을 삭제할까요? 연결 영상도 함께 삭제될 수 있습니다.`)) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteInfluencerChannel(channel.id);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "채널을 삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card title="카테고리별 인플루언서 채널 관리">
      <form className="mb-5 grid gap-3 lg:grid-cols-[180px_1fr_auto]" onSubmit={handleCreate}>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-channel-category">
          <span>카테고리</span>
          <select
            className="mt-2 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="admin-channel-category"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="YouTube 채널 URL"
          onChange={(event) => setChannelUrl(event.target.value)}
          placeholder="https://www.youtube.com/@creator"
          value={channelUrl}
        />
        <div className="self-end">
          <Button disabled={isSaving || !categories.length} type="submit">
            채널 추가
          </Button>
        </div>
      </form>

      <div className="mb-4 grid gap-3 md:grid-cols-[180px_1fr]">
        <select
          className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setFilterCategoryId(event.target.value)}
          value={filterCategoryId}
        >
          <option value="">전체 카테고리</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="채널명, URL, YouTube ID 검색"
          value={search}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">채널</th>
              <th className="px-3 py-2">카테고리</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">영상</th>
              <th className="px-3 py-2">최근 수집</th>
              <th className="px-3 py-2 text-right">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredChannels.map((channel) => (
              <tr key={channel.id}>
                <td className="px-3 py-3">
                  <p className="font-semibold text-ink">{channel.channelTitle ?? "채널명 없음"}</p>
                  <p className="mt-1 max-w-[420px] truncate text-xs text-slate-500">{channel.channelUrl ?? channel.youtubeChannelId}</p>
                </td>
                <td className="px-3 py-3">{channel.category}</td>
                <td className="px-3 py-3">
                  <Badge tone={channel.isActive ? "brand" : "default"}>{channel.isActive ? "활성" : "비활성"}</Badge>
                </td>
                <td className="px-3 py-3">{channel.videoCount}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{channel.lastCollectedAt ?? "-"}</td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    <Button disabled={isSaving} onClick={() => handleToggle(channel)} variant="secondary">
                      {channel.isActive ? "비활성" : "활성"}
                    </Button>
                    <Button disabled={isSaving} onClick={() => handleSync(channel)} variant="secondary">
                      Sync
                    </Button>
                    <Button disabled={isSaving} onClick={() => handleDelete(channel)} variant="danger">
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
