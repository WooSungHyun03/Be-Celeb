"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTES } from "@/constants/routes";
import { createCalendarEvent, deleteCalendarEvent, getCalendarEvents, updateCalendarEvent, type CalendarEvent, type CalendarEventStatus } from "@/lib/api/calendar";
import { getFavorites, type FavoriteItem } from "@/lib/api/favorites";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

const statusLabels: Record<CalendarEventStatus, string> = {
  planned: "기획",
  scripted: "대본",
  filmed: "촬영",
  edited: "편집",
  uploaded: "업로드",
};

type EventForm = {
  id?: string;
  favoriteId: string;
  title: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: CalendarEventStatus;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthTitle(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function buildMonthDays(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function defaultForm(date: string): EventForm {
  return {
    favoriteId: "",
    title: "",
    description: "",
    scheduledDate: date,
    startTime: "",
    endTime: "",
    status: "planned",
  };
}

function favoriteTitle(item: FavoriteItem) {
  return item.title || "찜한 추천 콘텐츠";
}

export default function CalendarPage() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<EventForm | null>(null);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => buildMonthDays(monthDate), [monthDate]);
  const today = formatDate(new Date());
  const range = useMemo(() => ({ start: formatDate(days[0]), end: formatDate(days[days.length - 1]) }), [days]);
  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      acc[event.scheduledDate] = [...(acc[event.scheduledDate] ?? []), event];
      return acc;
    }, {});
  }, [events]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadCalendar() {
      try {
        const {
          data: { session },
        } = await getSupabaseBrowserClient().auth.getSession();
        if (!active) {
          return;
        }
        if (!session) {
          setStatus("unauthorized");
          return;
        }

        const [loadedEvents, loadedFavorites] = await Promise.all([
          getCalendarEvents(range, controller.signal),
          getFavorites({ type: "recommendation" }, controller.signal),
        ]);
        if (active) {
          setEvents(loadedEvents);
          setFavorites(loadedFavorites);
          setStatus("ready");
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "캘린더 일정을 불러오지 못했습니다.");
        }
      }
    }

    setStatus((current) => (current === "ready" ? "ready" : "loading"));
    void loadCalendar();

    return () => {
      active = false;
      controller.abort();
    };
  }, [range.start, range.end]);

  function openNewEvent(date: string) {
    setMessage("");
    setForm(defaultForm(date));
  }

  function openEvent(event: CalendarEvent) {
    setMessage("");
    setForm({
      id: event.id,
      favoriteId: event.favoriteId ?? "",
      title: event.title,
      description: event.description ?? "",
      scheduledDate: event.scheduledDate,
      startTime: event.startTime ?? "",
      endTime: event.endTime ?? "",
      status: event.status,
    });
  }

  function updateForm(patch: Partial<EventForm>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }

  async function handleSubmit() {
    if (!form || !form.title.trim()) {
      setMessage("일정 제목을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage("");
    const payload = {
      favoriteId: form.favoriteId || null,
      title: form.title.trim(),
      description: form.description || null,
      scheduledDate: form.scheduledDate,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      status: form.status,
      platform: "youtube",
      metadata: { source: "calendar-page" },
    };

    try {
      if (form.id) {
        const updated = await updateCalendarEvent(form.id, payload);
        setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
      } else {
        const created = await createCalendarEvent(payload);
        setEvents((current) => [...current, created].sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate)));
      }
      setForm(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "일정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!form?.id) {
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await deleteCalendarEvent(form.id);
      setEvents((current) => current.filter((event) => event.id !== form.id));
      setForm(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "일정 삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return <Loading label="캘린더 일정을 불러오는 중입니다." />;
  }

  if (status === "unauthorized") {
    return (
      <EmptyState
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
        description="콘텐츠 업로드 캘린더는 로그인 후 사용할 수 있습니다."
        title="로그인이 필요합니다"
      />
    );
  }

  if (status === "error") {
    return <EmptyState title="캘린더를 불러오지 못했습니다" description={message || "잠시 후 다시 시도해 주세요."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <Link href={ROUTES.favorites}>
            <Button variant="secondary">찜 목록 보기</Button>
          </Link>
        }
        description="찜한 콘텐츠를 업로드 일정으로 옮기고 제작 상태를 관리합니다."
        title="캘린더"
      />

      {message ? <p className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</p> : null}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-ink">{monthTitle(monthDate)}</h2>
            <p className="mt-1 text-sm text-slate-500">날짜 칸을 눌러 새 일정을 추가하세요.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} variant="secondary">
              이전
            </Button>
            <Button onClick={() => setMonthDate(new Date())} variant="ghost">
              오늘
            </Button>
            <Button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} variant="secondary">
              다음
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 border-b border-l border-violet-100 text-center text-xs font-bold text-slate-500">
          {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
            <div className="border-r border-t border-violet-100 bg-violet-50/50 py-2" key={label}>
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-violet-100">
          {days.map((date) => {
            const dateKey = formatDate(date);
            const isCurrentMonth = date.getMonth() === monthDate.getMonth();
            const dailyEvents = eventsByDate[dateKey] ?? [];
            return (
              <div
                className="min-h-28 border-b border-r border-violet-100 bg-white p-2 text-left align-top transition hover:bg-violet-50 sm:min-h-32"
                key={dateKey}
                onClick={() => openNewEvent(dateKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openNewEvent(dateKey);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span
                  className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                    dateKey === today ? "bg-violet-600 text-white" : isCurrentMonth ? "text-ink" : "text-slate-400"
                  }`}
                >
                  {date.getDate()}
                </span>
                <div className="mt-2 grid gap-1">
                  {dailyEvents.slice(0, 3).map((event) => (
                    <button
                      className="block truncate rounded-md bg-violet-50 px-2 py-1 text-left text-xs font-semibold text-violet-700 hover:bg-violet-100"
                      key={event.id}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        openEvent(event);
                      }}
                      type="button"
                    >
                      {event.startTime ? `${event.startTime.slice(0, 5)} ` : ""}
                      {event.title}
                    </button>
                  ))}
                  {dailyEvents.length > 3 ? <span className="text-xs font-semibold text-slate-400">+{dailyEvents.length - 3}개</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {events.length === 0 ? <EmptyState title="등록된 일정이 없습니다" description="날짜 칸을 클릭하거나 찜 목록에서 업로드 일정을 추가하세요." /> : null}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-ink">{form.id ? "일정 수정" : "일정 추가"}</h2>
                <p className="mt-1 text-sm text-slate-500">제목, 날짜, 제작 상태를 관리합니다.</p>
              </div>
              <Badge tone="brand">{statusLabels[form.status]}</Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="block text-sm font-semibold text-slate-700">
                <span>찜 목록에서 선택</span>
                <select
                  className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  onChange={(event) => {
                    const favorite = favorites.find((item) => item.id === event.target.value);
                    updateForm({ favoriteId: event.target.value, title: form.title || (favorite ? favoriteTitle(favorite) : "") });
                  }}
                  value={form.favoriteId}
                >
                  <option value="">직접 입력</option>
                  {favorites.map((favorite) => (
                    <option key={favorite.id} value={favorite.id}>
                      {favoriteTitle(favorite)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                <span>제목</span>
                <input
                  className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  onChange={(event) => updateForm({ title: event.target.value })}
                  value={form.title}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm font-semibold text-slate-700">
                  <span>날짜</span>
                  <input
                    className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    onChange={(event) => updateForm({ scheduledDate: event.target.value })}
                    type="date"
                    value={form.scheduledDate}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  <span>시작</span>
                  <input
                    className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    onChange={(event) => updateForm({ startTime: event.target.value })}
                    type="time"
                    value={form.startTime}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  <span>종료</span>
                  <input
                    className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    onChange={(event) => updateForm({ endTime: event.target.value })}
                    type="time"
                    value={form.endTime}
                  />
                </label>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                <span>상태</span>
                <select
                  className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  onChange={(event) => updateForm({ status: event.target.value as CalendarEventStatus })}
                  value={form.status}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                <span>설명</span>
                <textarea
                  className="mt-2 block min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  onChange={(event) => updateForm({ description: event.target.value })}
                  value={form.description}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-2">
              <div>{form.id ? <Button disabled={saving} onClick={() => void handleDelete()} variant="danger">삭제</Button> : null}</div>
              <div className="flex gap-2">
                <Button disabled={saving} onClick={() => setForm(null)} variant="ghost">
                  취소
                </Button>
                <Button disabled={saving} onClick={() => void handleSubmit()}>
                  {saving ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
