"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import {
  collectNaverTrendsNow,
  createNaverKeywordGroup,
  deleteNaverKeywordGroup,
  updateNaverKeywordGroup,
} from "@/lib/api/admin";
import type {
  AdminCategory,
  AdminNaverCollectionLog,
  AdminNaverCollectionSummary,
  AdminNaverKeywordGroup,
} from "@/types/admin";

type NaverKeywordGroupManagerProps = {
  categories: AdminCategory[];
  groups: AdminNaverKeywordGroup[];
  logs: AdminNaverCollectionLog[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

type FormState = {
  categoryName: string;
  title: string;
  keywordsText: string;
  isActive: boolean;
};

const defaultCategory = "IT";
const initialForm: FormState = {
  categoryName: defaultCategory,
  title: "",
  keywordsText: "",
  isActive: true,
};

function parseKeywords(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function keywordsText(keywords: string[]) {
  return keywords.join(", ");
}

function statusTone(status: string) {
  if (status === "success") {
    return "brand";
  }
  if (status === "failed") {
    return "signal";
  }
  return "warning";
}

export function NaverKeywordGroupManager({ categories, groups, logs, onChanged, onError }: NaverKeywordGroupManagerProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<FormState>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionResult, setCollectionResult] = useState<AdminNaverCollectionSummary | null>(null);

  const categoryNames = useMemo(() => {
    const names = categories.map((category) => category.name);
    return names.length ? names : ["게임", "운동", "IT", "노래", "OTT", "일상", "뷰티", "스터디", "코미디", "먹방", "춤"];
  }, [categories]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keywords = parseKeywords(form.keywordsText);
    if (!form.categoryName || !form.title.trim() || keywords.length === 0) {
      return;
    }
    setIsSaving(true);
    try {
      await createNaverKeywordGroup({
        categoryName: form.categoryName,
        title: form.title.trim(),
        keywords,
        isActive: form.isActive,
      });
      setForm({ ...initialForm, categoryName: form.categoryName });
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Naver keyword group을 추가하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(group: AdminNaverKeywordGroup) {
    setEditingId(group.id);
    setEditingForm({
      categoryName: group.categoryName,
      title: group.title,
      keywordsText: keywordsText(group.keywords),
      isActive: group.isActive,
    });
  }

  async function handleUpdate(groupId: string) {
    const keywords = parseKeywords(editingForm.keywordsText);
    if (!editingForm.categoryName || !editingForm.title.trim() || keywords.length === 0) {
      return;
    }
    setIsSaving(true);
    try {
      await updateNaverKeywordGroup(groupId, {
        categoryName: editingForm.categoryName,
        title: editingForm.title.trim(),
        keywords,
        isActive: editingForm.isActive,
      });
      setEditingId(null);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Naver keyword group을 수정하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(group: AdminNaverKeywordGroup) {
    setIsSaving(true);
    try {
      await updateNaverKeywordGroup(group.id, { isActive: !group.isActive });
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "active 상태를 변경하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(group: AdminNaverKeywordGroup) {
    if (!window.confirm(`${group.categoryName} / ${group.title} keyword group을 삭제할까요? 저장된 daily points도 함께 삭제됩니다.`)) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteNaverKeywordGroup(group.id);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Naver keyword group을 삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCollectNow() {
    setIsCollecting(true);
    setCollectionResult(null);
    try {
      const result = await collectNaverTrendsNow();
      setCollectionResult(result);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Naver 트렌드 수집을 실행하지 못했습니다.");
    } finally {
      setIsCollecting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Naver Keyword Groups">
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm leading-6 text-slate-600">
              Naver DataLab 통합검색어 트렌드 API에 보낼 카테고리별 keyword group을 관리합니다.
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">ratio는 절대 검색량이 아니라 요청 기간과 그룹 기준의 상대 지표입니다.</p>
          </div>
          <Button disabled={isCollecting} onClick={handleCollectNow}>
            {isCollecting ? "수집 실행 중" : "네이버 트렌드 지금 수집"}
          </Button>
        </div>

        {collectionResult ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-4">
            <Badge tone="info">categories {collectionResult.categoriesChecked}</Badge>
            <Badge tone="info">groups {collectionResult.groupsChecked}</Badge>
            <Badge tone="brand">points {collectionResult.pointsUpserted}</Badge>
            <Badge tone={collectionResult.errors.length ? "warning" : "brand"}>errors {collectionResult.errors.length}</Badge>
          </div>
        ) : null}

        <form className="mb-6 grid gap-3 lg:grid-cols-[160px_1fr_1.5fr_auto]" onSubmit={handleCreate}>
          <label className="text-sm font-semibold text-slate-700">
            <span>카테고리</span>
            <select
              className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              onChange={(event) => setForm((current) => ({ ...current, categoryName: event.target.value }))}
              value={form.categoryName}
            >
              {categoryNames.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <Input label="그룹 제목" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="예: AI" value={form.title} />
          <Input
            helperText="쉼표 또는 줄바꿈으로 여러 keyword를 입력할 수 있습니다."
            label="Keywords"
            onChange={(event) => setForm((current) => ({ ...current, keywordsText: event.target.value }))}
            placeholder="AI, 인공지능"
            value={form.keywordsText}
          />
          <div className="flex items-end gap-3">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                checked={form.isActive}
                className="size-4 rounded border-slate-300"
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                type="checkbox"
              />
              active
            </label>
            <Button disabled={isSaving} type="submit">
              추가
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2">카테고리</th>
                <th className="px-3 py-2">제목</th>
                <th className="px-3 py-2">Keywords</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((group) => (
                <tr key={group.id}>
                  <td className="px-3 py-3">
                    {editingId === group.id ? (
                      <select
                        className="min-h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                        onChange={(event) => setEditingForm((current) => ({ ...current, categoryName: event.target.value }))}
                        value={editingForm.categoryName}
                      >
                        {categoryNames.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-semibold text-ink">{group.categoryName}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === group.id ? (
                      <input
                        className="min-h-9 w-full rounded-md border border-slate-300 px-3 py-1 text-sm"
                        onChange={(event) => setEditingForm((current) => ({ ...current, title: event.target.value }))}
                        value={editingForm.title}
                      />
                    ) : (
                      <span className="font-semibold text-ink">{group.title}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {editingId === group.id ? (
                      <input
                        className="min-h-9 w-full rounded-md border border-slate-300 px-3 py-1 text-sm"
                        onChange={(event) => setEditingForm((current) => ({ ...current, keywordsText: event.target.value }))}
                        value={editingForm.keywordsText}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {group.keywords.map((keyword) => (
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={keyword}>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={group.isActive ? "brand" : "warning"}>{group.isActive ? "active" : "inactive"}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === group.id ? (
                        <>
                          <Button disabled={isSaving} onClick={() => handleUpdate(group.id)} variant="secondary">
                            저장
                          </Button>
                          <Button onClick={() => setEditingId(null)} variant="ghost">
                            취소
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button disabled={isSaving} onClick={() => handleToggle(group)} variant="secondary">
                            {group.isActive ? "비활성화" : "활성화"}
                          </Button>
                          <Button onClick={() => startEdit(group)} variant="secondary">
                            수정
                          </Button>
                          <Button disabled={isSaving} onClick={() => handleDelete(group)} variant="danger">
                            삭제
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {groups.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={5}>
                    등록된 Naver keyword group이 없습니다. Supabase migration seed 또는 수동 추가를 확인하세요.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="naver_trend_collection_logs">
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
                    <Badge tone={statusTone(log.status)}>{log.status}</Badge>
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
              {logs.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={5}>
                    아직 Naver collection log가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
