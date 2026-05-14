"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { createCategory, deleteCategory, updateCategory } from "@/lib/client/admin-api";
import type { AdminCategory } from "@/types/admin";

type CategoryManagerProps = {
  categories: AdminCategory[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

export function CategoryManager({ categories, onChanged, onError }: CategoryManagerProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newName.trim()) {
      return;
    }
    setIsSaving(true);
    try {
      await createCategory(newName);
      setNewName("");
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "카테고리를 추가하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(categoryId: string) {
    if (!editingName.trim()) {
      return;
    }
    setIsSaving(true);
    try {
      await updateCategory(categoryId, editingName);
      setEditingId(null);
      setEditingName("");
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "카테고리를 수정하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category: AdminCategory) {
    if (!window.confirm(`${category.name} 카테고리를 삭제할까요? 연결된 채널/영상이 있으면 backend가 차단합니다.`)) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteCategory(category.id);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "카테고리를 삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card title="카테고리 관리">
      <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleCreate}>
        <Input label="새 카테고리" onChange={(event) => setNewName(event.target.value)} placeholder="예: IT" value={newName} />
        <div className="self-end">
          <Button disabled={isSaving} type="submit">
            추가
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">채널</th>
              <th className="px-3 py-2">영상</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2 text-right">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-3 py-3">
                  {editingId === category.id ? (
                    <input
                      className="min-h-9 w-full rounded-md border border-slate-300 px-3 py-1 text-sm"
                      onChange={(event) => setEditingName(event.target.value)}
                      value={editingName}
                    />
                  ) : (
                    <span className="font-semibold text-ink">{category.name}</span>
                  )}
                </td>
                <td className="px-3 py-3">{category.channelCount}</td>
                <td className="px-3 py-3">{category.videoCount}</td>
                <td className="px-3 py-3">
                  <Badge tone={category.channelCount || category.videoCount ? "warning" : "brand"}>
                    {category.channelCount || category.videoCount ? "연결 데이터 있음" : "삭제 가능"}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-2">
                    {editingId === category.id ? (
                      <>
                        <Button disabled={isSaving} onClick={() => handleUpdate(category.id)} variant="secondary">
                          저장
                        </Button>
                        <Button onClick={() => setEditingId(null)} variant="ghost">
                          취소
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            setEditingId(category.id);
                            setEditingName(category.name);
                          }}
                          variant="secondary"
                        >
                          수정
                        </Button>
                        <Button disabled={isSaving} onClick={() => handleDelete(category)} variant="danger">
                          삭제
                        </Button>
                      </>
                    )}
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
