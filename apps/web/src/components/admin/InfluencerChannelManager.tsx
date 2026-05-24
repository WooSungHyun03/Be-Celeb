"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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

type SyncMessage = {
  tone: "success" | "error" | "info";
  message: string;
};

type ChannelCategoryFields = AdminInfluencerChannel & {
  categories?: Array<{ id?: unknown; name?: unknown; slug?: unknown }> | string[] | null;
  categoryName?: string | null;
  categorySlug?: string | null;
};

function normalizeFilterValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeCompactValue(value: unknown) {
  return normalizeFilterValue(value).replace(/\s+/g, "");
}

function compactUnique(values: unknown[]) {
  return Array.from(new Set(values.map(normalizeFilterValue).filter(Boolean)));
}

function getCategoryMatchValues(category: AdminCategory) {
  const flexibleCategory = category as AdminCategory & { slug?: string | null; value?: string | null };
  return compactUnique([category.id, category.name, flexibleCategory.slug, flexibleCategory.value]);
}

function getChannelCategoryMatchValues(channel: AdminInfluencerChannel) {
  const flexibleChannel = channel as ChannelCategoryFields;
  const values: unknown[] = [
    channel.categoryId,
    channel.category,
    flexibleChannel.categoryName,
    flexibleChannel.categorySlug,
    ...(channel.categoryIds ?? []),
    ...(channel.categoryNames ?? []),
  ];

  if (Array.isArray(flexibleChannel.categories)) {
    flexibleChannel.categories.forEach((category) => {
      if (typeof category === "string") {
        values.push(category);
        return;
      }
      values.push(category.id, category.name, category.slug);
    });
  }

  return compactUnique(values);
}

function channelMatchesCategory(channel: AdminInfluencerChannel, category: AdminCategory | undefined) {
  if (!category) {
    return true;
  }
  const channelValues = new Set(getChannelCategoryMatchValues(channel));
  return getCategoryMatchValues(category).some((value) => channelValues.has(value));
}

function channelDisplayName(channel: AdminInfluencerChannel) {
  return channel.channelTitle?.trim() || "채널명없음";
}

function isMissingChannelName(channel: AdminInfluencerChannel) {
  const title = normalizeCompactValue(channel.channelTitle);
  return !title || title === "채널명없음" || title === "unknown" || title === "unknownchannel" || title === "untitled";
}

export function InfluencerChannelManager({ categories, channels, onChanged, onError }: InfluencerChannelManagerProps) {
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [channelUrl, setChannelUrl] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [syncingChannelId, setSyncingChannelId] = useState<string | null>(null);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<SyncMessage | null>(null);

  useEffect(() => {
    if (categoryIds.length === 0 && categories[0]?.id) {
      setCategoryIds([categories[0].id]);
    }
  }, [categories, categoryIds.length]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === filterCategoryId),
    [categories, filterCategoryId],
  );
  const busy = isSaving || isBulkSyncing || Boolean(syncingChannelId);
  const missingNameChannels = useMemo(() => channels.filter(isMissingChannelName), [channels]);
  const filteredChannels = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return channels.filter((channel) => {
      const matchesCategory = channelMatchesCategory(channel, selectedCategory);
      const text = [
        channelDisplayName(channel),
        channel.channelUrl,
        channel.youtubeChannelId,
        channel.category,
        ...(channel.categoryNames ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return matchesCategory && text.includes(normalizedSearch);
    });
  }, [channels, search, selectedCategory]);

  function getEditableCategoryIds(channel: AdminInfluencerChannel) {
    const validCategoryIds = new Set(categories.map((category) => category.id));
    const directIds = ((channel.categoryIds ?? []).length > 0 ? channel.categoryIds : channel.categoryId ? [channel.categoryId] : []).filter((id) =>
      validCategoryIds.has(id),
    );
    if (directIds.length > 0) {
      return directIds;
    }
    return categories.filter((category) => channelMatchesCategory(channel, category)).map((category) => category.id);
  }

  function toggleCreateCategory(nextCategoryId: string) {
    setCategoryIds((current) => {
      if (current.includes(nextCategoryId)) {
        return current.length > 1 ? current.filter((id) => id !== nextCategoryId) : current;
      }
      return [...current, nextCategoryId];
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (categoryIds.length === 0 || !channelUrl.trim()) {
      return;
    }
    setSyncMessage(null);
    setIsSaving(true);
    try {
      await createInfluencerChannel({ categoryIds, channelUrl, isActive: true });
      setChannelUrl("");
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "인플루언서 채널을 추가하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(channel: AdminInfluencerChannel) {
    setSyncMessage(null);
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
    setSyncMessage(null);
    setSyncingChannelId(channel.id);
    try {
      await syncInfluencerChannel(channel.id);
      setSyncMessage({ tone: "success", message: `${channelDisplayName(channel)} Sync가 완료되었습니다.` });
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "YouTube 채널 정보를 동기화하지 못했습니다.");
    } finally {
      setSyncingChannelId(null);
    }
  }

  async function handleBulkSyncMissingNames() {
    const targets = missingNameChannels;
    if (targets.length === 0) {
      setSyncMessage({ tone: "info", message: "채널명없음 상태인 채널이 없습니다." });
      return;
    }

    setIsBulkSyncing(true);
    setSyncMessage({ tone: "info", message: `채널명없음 ${targets.length}개 채널을 Sync하는 중입니다.` });

    let successCount = 0;
    let failureCount = 0;
    for (const channel of targets) {
      try {
        await syncInfluencerChannel(channel.id);
        successCount += 1;
      } catch {
        failureCount += 1;
      }
    }

    try {
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Sync 후 채널 목록을 갱신하지 못했습니다.");
    } finally {
      setIsBulkSyncing(false);
      setSyncMessage({
        tone: failureCount > 0 ? "error" : "success",
        message: `채널명없음 일괄 Sync 완료: 성공 ${successCount}개, 실패 ${failureCount}개`,
      });
    }
  }

  async function handleDelete(channel: AdminInfluencerChannel) {
    if (!window.confirm(`${channelDisplayName(channel) || channel.channelUrl || "채널"}을 삭제할까요? 연결 영상도 함께 삭제될 수 있습니다.`)) {
      return;
    }
    setSyncMessage(null);
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

  async function handleCategoryToggle(channel: AdminInfluencerChannel, nextCategoryId: string) {
    const currentIds = getEditableCategoryIds(channel);
    const nextIds = currentIds.includes(nextCategoryId)
      ? currentIds.filter((id) => id !== nextCategoryId)
      : [...currentIds, nextCategoryId];
    if (nextIds.length === 0) {
      onError("채널에는 최소 1개 카테고리가 필요합니다.");
      return;
    }
    setSyncMessage(null);
    setIsSaving(true);
    try {
      await updateInfluencerChannel(channel.id, { categoryIds: nextIds });
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "채널 카테고리를 변경하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card title="카테고리별 인플루언서 채널 관리">
      <form className="mb-5 grid gap-4 xl:grid-cols-[minmax(280px,420px)_minmax(260px,1fr)_auto]" onSubmit={handleCreate}>
        <fieldset className="block rounded-md border border-slate-200 p-3 text-sm font-semibold text-slate-700">
          <span>카테고리</span>
          <div className="mt-2 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-2">
            {categories.map((category) => (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600" key={category.id}>
                <input
                  checked={categoryIds.includes(category.id)}
                  className="size-4 rounded border-slate-300 text-violet-600"
                  onChange={() => toggleCreateCategory(category.id)}
                  type="checkbox"
                />
                {category.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Input
          label="YouTube 채널 URL"
          onChange={(event) => setChannelUrl(event.target.value)}
          placeholder="https://www.youtube.com/@creator"
          value={channelUrl}
        />
        <div className="self-end">
          <Button disabled={busy || !categories.length} type="submit">
            채널 추가
          </Button>
        </div>
      </form>

      <div className="mb-4 grid gap-3 lg:grid-cols-[220px_minmax(240px,1fr)_auto]">
        <div className="grid gap-1">
          <label className="text-xs font-bold text-slate-500" htmlFor="influencer-category-filter">
            카테고리 필터
          </label>
          <select
            className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="influencer-category-filter"
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
        </div>
        <div className="grid gap-1">
          <label className="text-xs font-bold text-slate-500" htmlFor="influencer-channel-search">
            채널 검색
          </label>
          <input
            className="min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="influencer-channel-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="채널명, URL, YouTube ID 검색"
            value={search}
          />
        </div>
        <div className="flex flex-wrap items-end justify-start gap-2 lg:justify-end">
          <Button disabled={busy || missingNameChannels.length === 0} onClick={() => void handleBulkSyncMissingNames()} variant="secondary">
            {isBulkSyncing ? "일괄 Sync 중" : `채널명없음 일괄 Sync (${missingNameChannels.length})`}
          </Button>
        </div>
      </div>

      {syncMessage ? (
        <div className="mb-4">
          <Badge tone={syncMessage.tone === "success" ? "brand" : syncMessage.tone === "error" ? "signal" : "info"}>
            {syncMessage.message}
          </Badge>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
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
                  <p className="font-semibold text-ink">{channelDisplayName(channel)}</p>
                  <p className="mt-1 max-w-[420px] truncate text-xs text-slate-500">{channel.channelUrl ?? channel.youtubeChannelId}</p>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="max-h-28 min-w-[260px] overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-2">
                    <div className="flex flex-wrap gap-1.5">
                    {categories.map((category) => {
                      const channelCategoryIds = getEditableCategoryIds(channel);
                      return (
                        <label
                          className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm"
                          key={`${channel.id}-${category.id}`}
                        >
                          <input
                            checked={channelCategoryIds.includes(category.id)}
                            className="size-3 rounded border-slate-300 text-violet-600"
                            disabled={busy}
                            onChange={() => handleCategoryToggle(channel, category.id)}
                            type="checkbox"
                          />
                          {category.name}
                        </label>
                      );
                    })}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Badge tone={channel.isActive ? "brand" : "default"}>{channel.isActive ? "활성" : "비활성"}</Badge>
                </td>
                <td className="px-3 py-3">{channel.videoCount}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{channel.lastCollectedAt ?? "-"}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button disabled={busy} onClick={() => handleToggle(channel)} variant="secondary">
                      {channel.isActive ? "비활성" : "활성"}
                    </Button>
                    <Button disabled={busy} onClick={() => handleSync(channel)} variant="secondary">
                      {syncingChannelId === channel.id ? "Sync 중" : "Sync"}
                    </Button>
                    <Button disabled={busy} onClick={() => handleDelete(channel)} variant="danger">
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredChannels.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                  조건에 맞는 인플루언서 채널이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
