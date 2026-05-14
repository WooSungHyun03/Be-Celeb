"use client";

import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { cn } from "@/utils/cn";

export type AdminSection =
  | "overview"
  | "categories"
  | "channels"
  | "videos"
  | "collection"
  | "recommendations"
  | "prompts"
  | "system"
  | "danger";

const sections: Array<{ id: AdminSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "categories", label: "카테고리" },
  { id: "channels", label: "인플루언서 채널" },
  { id: "videos", label: "영상 데이터" },
  { id: "collection", label: "수집 관리" },
  { id: "recommendations", label: "추천/분석" },
  { id: "prompts", label: "LLM Prompts" },
  { id: "system", label: "시스템" },
  { id: "danger", label: "위험 작업" },
];

type AdminLayoutProps = {
  activeSection: AdminSection;
  apiBaseUrl: string;
  onSectionChange: (section: AdminSection) => void;
  children: React.ReactNode;
};

export function AdminLayout({ activeSection, apiBaseUrl, onSectionChange, children }: AdminLayoutProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:self-start">
        <div className="mb-3 px-2">
          <p className="text-sm font-bold text-ink">Be-Celeb Admin</p>
          <p className="mt-1 break-all text-xs leading-5 text-slate-500">{apiBaseUrl}</p>
        </div>
        <nav className="grid gap-1">
          {sections.map((section) => (
            <button
              className={cn(
                "rounded-md px-3 py-2 text-left text-sm font-semibold transition",
                activeSection === section.id ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
              )}
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <Badge tone="info">UTC 21:00</Badge>
          <p className="mt-2 text-xs leading-5 text-slate-600">KST 매일 06:00 자동 수집 기준</p>
        </div>
      </aside>
      <section className="min-w-0 space-y-5">
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-bold text-ink">운영자 콘솔</p>
            <p className="mt-1 text-sm text-slate-500">YouTube 채널, 영상, 수집, 추천 데이터를 Render Backend API로 관리합니다.</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="secondary">
            새로고침
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
