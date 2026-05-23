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
import { createCalendarEvent, deleteCalendarEvent, getCalendarEvents, updateCalendarEvent, type CalendarEvent, type CalendarEventStatus, getHolidays, type Holiday } from "@/lib/api/calendar";
import { getFavorites, type FavoriteItem } from "@/lib/api/favorites";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

const statusLabels: Record<CalendarEventStatus, string> = {
  planned: "기획",
  scripted: "대본",
  filmed: "촬영 완료",
  edited: "편집 완료",
  uploaded: "업로드",
  filming: "촬영",
  editing: "편집",
  scheduled: "예약",
};

const statusColors: Record<CalendarEventStatus, string> = {
  planned: "#7c3aed",
  scripted: "#2563eb",
  filmed: "#f97316",
  edited: "#0f766e",
  uploaded: "#475569",
  filming: "#f97316",
  editing: "#0f766e",
  scheduled: "#db2777",
};

const colorOptions = ["#7c3aed", "#2563eb", "#f97316", "#0f766e", "#db2777", "#475569"];

type EventForm = {
  id?: string;
  favoriteId: string;
  productionItemId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: CalendarEventStatus;
  color: string;
  metadata: Record<string, unknown>;
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

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function buildMonthDays(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function defaultForm(date: string): EventForm {
  return {
    favoriteId: "",
    productionItemId: "",
    title: "",
    description: "",
    startDate: date,
    endDate: date,
    startTime: "",
    endTime: "",
    status: "planned",
    color: statusColors.planned,
    metadata: { source: "calendar-page" },
  };
}

function favoriteTitle(item: FavoriteItem) {
  return item.title || "즐겨찾기한 추천 콘텐츠";
}

function eventStart(event: CalendarEvent) {
  return event.startDate || event.scheduledDate;
}

function eventEnd(event: CalendarEvent) {
  return event.endDate || eventStart(event);
}

function eventDates(event: CalendarEvent) {
  const start = new Date(`${eventStart(event)}T00:00:00`);
  const end = new Date(`${eventEnd(event)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [eventStart(event)];
  }
  const dates: string[] = [];
  for (let current = start; current <= end; current = addDays(current, 1)) {
    dates.push(formatDate(current));
  }
  return dates;
}

function isProductionLinked(event: CalendarEvent | EventForm) {
  return Boolean(event.productionItemId || event.metadata?.source === "production-board");
}

export default function CalendarPage() {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
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
      for (const date of eventDates(event)) {
        acc[date] = [...(acc[date] ?? []), event];
      }
      return acc;
    }, {});
  }, [events]);

  const holidaysByDate = useMemo(() => {
    return holidays.reduce<Record<string, Holiday>>((acc, holiday) => {
      acc[holiday.date] = holiday;
      return acc;
    }, {});
  }, [holidays]);

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

        const [loadedEvents, loadedFavorites, loadedHolidays] = await Promise.all([
          getCalendarEvents(range, controller.signal),
          getFavorites({ type: "recommendation" }, controller.signal),
          getHolidays(range, controller.signal),
        ]);
        if (active) {
          setEvents(loadedEvents);
          setFavorites(loadedFavorites);
          setHolidays(loadedHolidays);
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
      productionItemId: event.productionItemId ?? "",
      title: event.title,
      description: event.description ?? "",
      startDate: eventStart(event),
      endDate: eventEnd(event),
      startTime: event.startTime ?? "",
      endTime: event.endTime ?? "",
      status: event.status,
      color: event.color || statusColors[event.status] || statusColors.planned,
      metadata: event.metadata,
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
    if (form.endDate && form.endDate < form.startDate) {
      setMessage("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    setSaving(true);
    setMessage("");
    const payload = {
      favoriteId: form.favoriteId || null,
      productionItemId: form.productionItemId || null,
      title: form.title.trim(),
      description: form.description || null,
      scheduledDate: form.startDate,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      status: form.status,
      color: form.color,
      platform: "youtube",
      metadata: form.metadata,
    };

    try {
      if (form.id) {
        const updated = await updateCalendarEvent(form.id, payload);
        setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
      } else {
        const created = await createCalendarEvent(payload);
        setEvents((current) => [...current, created].sort((left, right) => eventStart(left).localeCompare(eventStart(right))));
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
          <Link href={ROUTES.productionBoard}>
            <Button variant="secondary">제작 보드 보기</Button>
          </Link>
        }
        description="업로드 일정과 촬영 일정을 날짜 범위와 색상으로 관리합니다."
        title="캘린더"
      />

      {message ? <p className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</p> : null}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-ink">{monthTitle(monthDate)}</h2>
            <p className="mt-1 text-sm text-slate-500">날짜 칸을 눌러 새 일정을 추가하세요. 여러 날짜에 걸친 일정은 각 날짜에 표시됩니다.</p>
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
            const holiday = holidaysByDate[dateKey];
            const isHoliday = Boolean(holiday);
            const isSunday = date.getDay() === 0;
            
            return (
              <div
                className={`min-h-28 border-b border-r border-violet-100 p-2 text-left align-top transition sm:min-h-32 ${
                  isHoliday || isSunday ? "bg-red-50/50" : "bg-white hover:bg-violet-50"
                }`}
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
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                      dateKey === today ? "bg-violet-600 text-white" : isCurrentMonth ? (isHoliday || isSunday ? "bg-red-100 text-red-700 font-extrabold" : "text-ink") : "text-slate-400"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {isHoliday && (
                    <div title={holiday.name} className="text-right">
                      <span className="inline-block bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-bold" title={holiday.description || ""}>
                        {holiday.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-2 grid gap-1">
                  {dailyEvents.slice(0, 4).map((event) => {
                    const color = event.color || statusColors[event.status] || statusColors.planned;
                    const multiDay = eventStart(event) !== eventEnd(event);
                    return (
                      <button
                        className="block truncate rounded-md border px-2 py-1 text-left text-xs font-semibold transition hover:brightness-95"
                        key={`${event.id}-${dateKey}`}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          openEvent(event);
                        }}
                        style={{ backgroundColor: `${color}18`, borderColor: `${color}55`, color }}
                        type="button"
                      >
                        {event.startTime ? `${event.startTime.slice(0, 5)} ` : ""}
                        {multiDay ? "↔ " : ""}
                        {event.title}
                      </button>
                    );
                  })}
                  {dailyEvents.length > 4 ? <span className="text-xs font-semibold text-slate-400">+{dailyEvents.length - 4}개</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {events.length === 0 ? <EmptyState title="등록된 일정이 없습니다" description="날짜 칸을 클릭하거나 제작 보드에서 촬영 일정을 설정하세요." /> : null}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40 p-4 sm:items-center sm:justify-center">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-ink">{form.id ? "일정 수정" : "일정 추가"}</h2>
                <p className="mt-1 text-sm text-slate-500">날짜 범위, 색상, 제작 상태를 관리합니다.</p>
              </div>
              <Badge tone="brand">{statusLabels[form.status]}</Badge>
            </div>

            {isProductionLinked(form) ? (
              <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800">
                제작 보드와 연결된 촬영 일정입니다.
                <Link className="ml-2 underline" href={ROUTES.productionBoard}>
                  제작 보드 보기
                </Link>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              <label className="block text-sm font-semibold text-slate-700">
                <span>즐겨찾기에서 선택</span>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  <span>시작일</span>
                  <input
                    className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    onChange={(event) => updateForm({ startDate: event.target.value, endDate: form.endDate || event.target.value })}
                    type="date"
                    value={form.startDate}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  <span>종료일</span>
                  <input
                    className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    onChange={(event) => updateForm({ endDate: event.target.value })}
                    type="date"
                    value={form.endDate}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  <span>시작 시간</span>
                  <input
                    className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    onChange={(event) => updateForm({ startTime: event.target.value })}
                    type="time"
                    value={form.startTime}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  <span>종료 시간</span>
                  <input
                    className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
                    onChange={(event) => updateForm({ endTime: event.target.value })}
                    type="time"
                    value={form.endTime}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
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
                  <span>색상</span>
                  <div className="mt-2 flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-2">
                    {colorOptions.map((color) => (
                      <button
                        aria-label={`${color} 색상 선택`}
                        className={`size-6 rounded-full border-2 ${form.color === color ? "border-slate-900" : "border-white"}`}
                        key={color}
                        onClick={() => updateForm({ color })}
                        style={{ backgroundColor: color }}
                        type="button"
                      />
                    ))}
                  </div>
                </label>
              </div>
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
