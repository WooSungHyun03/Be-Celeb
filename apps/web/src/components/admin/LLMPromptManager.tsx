"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { activateLLMPrompt, createLLMPrompt, deleteLLMPrompt, updateLLMPrompt } from "@/lib/client/admin-api";
import type { AdminPromptTemplate } from "@/types/admin";

const variableGuide = ["{{user_channel}}", "{{user_recent_videos}}", "{{selected_category}}", "{{category_database_videos}}", "{{duplicate_guidelines}}"];

const defaultSystemPrompt = "You are Be-Celeb's Korean YouTube content strategist. Return valid JSON only.";

const defaultUserPromptTemplate = `You are a YouTube content strategy analyst.
Analyze the user channel and category influencer database.
Recommend exactly one content idea the user has not uploaded yet.
Return valid JSON only.

Selected category:
{{selected_category}}

User channel:
{{user_channel}}

User recent videos:
{{user_recent_videos}}

Category influencer database videos:
{{category_database_videos}}

Duplicate guidelines:
{{duplicate_guidelines}}`;

type LLMPromptManagerProps = {
  prompts: AdminPromptTemplate[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

export function LLMPromptManager({ prompts, onChanged, onError }: LLMPromptManagerProps) {
  const [editing, setEditing] = useState<AdminPromptTemplate | null>(null);
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [userPromptTemplate, setUserPromptTemplate] = useState(defaultUserPromptTemplate);
  const [preview, setPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activePrompt = useMemo(() => prompts.find((prompt) => prompt.isActive), [prompts]);

  function startEdit(prompt: AdminPromptTemplate) {
    setEditing(prompt);
    setName(prompt.name);
    setSystemPrompt(prompt.systemPrompt);
    setUserPromptTemplate(prompt.userPromptTemplate);
    setPreview("");
  }

  function resetForm() {
    setEditing(null);
    setName("");
    setSystemPrompt(defaultSystemPrompt);
    setUserPromptTemplate(defaultUserPromptTemplate);
    setPreview("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name,
        type: "content_recommendation",
        systemPrompt,
        userPromptTemplate,
        isActive: editing?.isActive ?? false,
        variables: { variables: variableGuide },
      };
      if (editing) {
        await updateLLMPrompt(editing.id, payload);
      } else {
        await createLLMPrompt(payload);
      }
      resetForm();
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "LLM prompt를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleActivate(prompt: AdminPromptTemplate) {
    setIsSaving(true);
    try {
      await activateLLMPrompt(prompt.id);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "active prompt를 지정하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(prompt: AdminPromptTemplate) {
    if (!window.confirm(`${prompt.name} prompt를 삭제할까요?`)) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteLLMPrompt(prompt.id);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "LLM prompt를 삭제하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  function handlePreview() {
    setPreview(
      userPromptTemplate
        .replace("{{selected_category}}", "IT")
        .replace("{{user_channel}}", '{"title":"예시 채널","description":"AI와 개발 콘텐츠"}')
        .replace("{{user_recent_videos}}", '[{"title":"이미 올린 영상"}]')
        .replace("{{category_database_videos}}", '[{"title":"인플루언서 인기 영상"}]')
        .replace("{{duplicate_guidelines}}", "기존 영상과 유사한 주제를 피한다."),
    );
  }

  return (
    <div className="space-y-5">
      <Card title="LLM Prompt 관리">
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge tone="brand">active: {activePrompt?.name ?? "fallback"}</Badge>
          {variableGuide.map((variable) => (
            <Badge key={variable}>{variable}</Badge>
          ))}
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input label="Prompt name" onChange={(event) => setName(event.target.value)} required value={name} />
          <label className="block text-sm font-semibold text-slate-700">
            <span>System prompt</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setSystemPrompt(event.target.value)}
              value={systemPrompt}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            <span>User prompt template</span>
            <textarea
              className="mt-2 min-h-64 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setUserPromptTemplate(event.target.value)}
              value={userPromptTemplate}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} type="submit">
              {editing ? "Prompt 수정" : "Prompt 생성"}
            </Button>
            <Button onClick={handlePreview} type="button" variant="secondary">
              Preview
            </Button>
            {editing ? (
              <Button onClick={resetForm} type="button" variant="ghost">
                취소
              </Button>
            ) : null}
          </div>
        </form>
        {preview ? <pre className="mt-5 max-h-72 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">{preview}</pre> : null}
      </Card>

      <Card title="Prompt 목록">
        <div className="grid gap-3">
          {prompts.map((prompt) => (
            <div className="rounded-md border border-slate-200 p-4" key={prompt.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <p className="font-bold text-ink">{prompt.name}</p>
                    {prompt.isActive ? <Badge tone="brand">active</Badge> : <Badge>inactive</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{prompt.type}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => startEdit(prompt)} variant="secondary">
                    수정
                  </Button>
                  <Button disabled={isSaving || prompt.isActive} onClick={() => handleActivate(prompt)} variant="secondary">
                    활성화
                  </Button>
                  <Button disabled={isSaving} onClick={() => handleDelete(prompt)} variant="danger">
                    삭제
                  </Button>
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500">template 보기</summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                  {prompt.userPromptTemplate}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
