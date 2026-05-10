// Renders the trends dashboard page.
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

const reels = [
  { title: "집에서 보내는 감성 주말 브이로그", account: "@daily_vlog", time: "0:32", tag: "라이프스타일", tagTone: "bg-violet-50 text-violet-600", theme: "room", views: "52.3만", comments: "8.7만", saves: "1,234" },
  { title: "5분 만에 완성하는 데일리 메이크업", account: "@makeup_su", time: "0:29", tag: "뷰티", tagTone: "bg-pink-50 text-pink-600", theme: "beauty", views: "45.8만", comments: "7.2만", saves: "987" },
  { title: "출근룩 코디 3가지 정리", account: "@office_style", time: "0:27", tag: "패션", tagTone: "bg-blue-50 text-blue-600", theme: "fashion", views: "38.6만", comments: "6.1만", saves: "876" },
  { title: "AI로 업무 시간 줄이는 방법", account: "@productivity.kr", time: "0:35", tag: "생산성", tagTone: "bg-emerald-50 text-emerald-600", theme: "laptop", views: "29.4만", comments: "5.3만", saves: "642" },
  { title: "10분 완성 초간단 파스타", account: "@cook_easy", time: "0:31", tag: "푸드", tagTone: "bg-orange-50 text-orange-600", theme: "food", views: "31.2만", comments: "6.8만", saves: "701" },
];

const topKeywords = [
  ["브이로그", "125,420"],
  ["모닝루틴", "98,730"],
  ["AI툴", "78,560"],
  ["생산성", "65,210"],
  ["데일리룩", "54,890"],
];

const risingKeywords = [
  ["AI툴", "156%"],
  ["생성형", "98%"],
  ["모닝루틴", "76%"],
  ["데일리룩", "58%"],
  ["브이로그", "41%"],
];

const hashtags = ["#브이로그", "#모닝루틴", "#AI툴", "#생산성", "#데일리룩", "#출근룩", "#자기계발", "#홈카페", "#다이어트", "#맛집"];

const guides = [
  { label: "공략 팁스", title: "3초 안에 시선 잡는 법", desc: "첫 3초가 조회수를 결정합니다.", time: "0:42", theme: "phone" },
  { label: "강력 팁", title: "썸네일 제작 팁", desc: "조회수를 부르는 썸네일 디자인 전략", time: "0:36", theme: "screen" },
  { label: "가이드", title: "참여율 높이는 해시태그 조합", desc: "도달과 참여를 동시에 올리는 조합", time: "0:33", theme: "tags" },
  { label: "공략 팁스", title: "릴스 편집 플로우 한 번에 정리", desc: "촬영부터 업로드까지 쉽게 가이드", time: "0:48", theme: "editor" },
];

function SectionHeader({ number, title, description, action }: { number: string; title: string; description: string; action?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white shadow-sm shadow-violet-200">{number}</span>
        <h2 className="shrink-0 text-base font-black tracking-tight text-ink">{title}</h2>
        <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">{description}</p>
      </div>
      {action ? (
        <Link className="shrink-0 text-xs font-black text-violet-600 hover:text-violet-700" href={ROUTES.recommendations}>
          {action} →
        </Link>
      ) : null}
    </div>
  );
}

function Thumb({ theme, compact = false }: { theme: string; compact?: boolean }) {
  const base = compact ? "h-[104px]" : "h-[124px]";

  return (
    <div className={`relative overflow-hidden rounded-t-xl ${base} bg-slate-100`}>
      {theme === "room" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#f5e7d7,#eef2e4)]">
          <div className="absolute bottom-4 left-4 h-9 w-20 rounded-lg bg-white/75 shadow-sm" />
          <div className="absolute right-5 top-5 h-20 w-10 rounded-full bg-emerald-300/70" />
          <div className="absolute left-7 top-7 h-12 w-16 rounded-xl bg-amber-200/70" />
        </div>
      ) : null}
      {theme === "beauty" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#fde2e8,#fff7ed)]">
          <div className="absolute bottom-0 left-1/2 h-24 w-16 -translate-x-1/2 rounded-t-full bg-[#f5c7b8]" />
          <div className="absolute left-7 top-7 size-8 rounded-full bg-white/80" />
          <div className="absolute right-8 top-9 h-12 w-2 rotate-[-18deg] rounded-full bg-pink-500" />
        </div>
      ) : null}
      {theme === "fashion" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#eee7df,#d8d2ca)]">
          <div className="absolute bottom-0 left-1/2 h-24 w-14 -translate-x-1/2 rounded-t-full bg-stone-700" />
          <div className="absolute bottom-8 left-8 h-12 w-8 rounded bg-stone-200 shadow" />
        </div>
      ) : null}
      {theme === "laptop" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#e2e8f0,#f8fafc)]">
          <div className="absolute bottom-7 left-7 right-7 h-16 rounded-lg bg-slate-900 shadow-lg">
            <div className="mx-auto mt-5 h-3 w-20 rounded bg-white/80" />
          </div>
          <div className="absolute bottom-5 left-5 right-5 h-2 rounded bg-slate-400" />
        </div>
      ) : null}
      {theme === "food" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#fff7ed,#fed7aa)]">
          <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
          <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300" />
          <div className="absolute left-[43%] top-[42%] h-2 w-12 rotate-12 rounded bg-red-500" />
        </div>
      ) : null}
      {theme === "phone" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#ede9fe,#fed7aa)]">
          <div className="absolute bottom-4 left-1/2 h-24 w-14 -translate-x-1/2 rotate-[-8deg] rounded-xl bg-white shadow-lg" />
          <div className="absolute bottom-8 left-1/2 h-14 w-9 -translate-x-1/2 rotate-[-8deg] rounded-lg bg-stone-700" />
        </div>
      ) : null}
      {theme === "screen" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#fce7f3,#dbeafe)]">
          <div className="absolute inset-x-8 top-7 h-16 rounded-xl bg-white shadow">
            <div className="m-3 grid grid-cols-3 gap-1">
              <span className="h-5 rounded bg-violet-200" />
              <span className="h-5 rounded bg-sky-200" />
              <span className="h-5 rounded bg-pink-200" />
            </div>
          </div>
        </div>
      ) : null}
      {theme === "tags" ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#dbeafe,#f8fafc)]">
          {["#브이로그", "#해시태그", "#AI툴"].map((tag, index) => (
            <span className="absolute rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-700 shadow-sm" key={tag} style={{ left: 22 + index * 16, top: 24 + index * 22 }}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {theme === "editor" ? (
        <div className="absolute inset-0 bg-slate-900">
          <div className="absolute left-4 right-4 top-5 h-16 rounded bg-slate-700" />
          <div className="absolute bottom-5 left-4 right-4 grid grid-cols-4 gap-1">
            <span className="h-4 rounded bg-violet-400" />
            <span className="h-4 rounded bg-slate-500" />
            <span className="h-4 rounded bg-pink-400" />
            <span className="h-4 rounded bg-slate-500" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReelCard({ reel }: { reel: (typeof reels)[number] }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <div className="relative overflow-hidden rounded-lg">
        <Thumb theme={reel.theme} />
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">{reel.time}</span>
      </div>
      <div className="px-1 pb-1 pt-2">
        <h3 className="line-clamp-2 min-h-[32px] text-[11px] font-black leading-4 text-ink">{reel.title}</h3>
        <p className="mt-1 text-[10px] font-semibold text-slate-400">{reel.account}</p>
        <div className="mt-2 flex items-center gap-2 text-[9px] font-bold text-slate-400">
          <span className="inline-flex items-center gap-0.5">▷ {reel.views}</span>
          <span className="inline-flex items-center gap-0.5">♡ {reel.comments}</span>
          <span className="inline-flex items-center gap-0.5">□ {reel.saves}</span>
        </div>
        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ${reel.tagTone}`}>{reel.tag}</span>
      </div>
    </article>
  );
}

function KeywordChart() {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-ink">키워드 트렌드 그래프</h3>
        <div className="flex rounded-full bg-slate-100 p-1 text-[11px] font-black">
          <span className="rounded-full bg-violet-600 px-4 py-1 text-white">일별</span>
          <span className="px-3 py-1 text-slate-500">주별</span>
          <span className="px-3 py-1 text-slate-500">월별</span>
        </div>
      </div>
      <svg className="h-[190px] w-full" role="img" viewBox="0 0 560 190">
        {[35, 70, 105, 140, 175].map((y) => (
          <line key={y} opacity="0.12" stroke="#64748b" x1="18" x2="550" y1={y} y2={y} />
        ))}
        <path d="M20 115 C62 88 92 104 132 82 S206 90 250 64 330 48 378 58 424 79 472 58 520 42 548 52" fill="none" stroke="#8b5cf6" strokeLinecap="round" strokeWidth="2.5" />
        <path d="M20 142 C62 126 94 136 136 116 S210 124 254 101 334 86 382 94 428 111 474 98 522 88 548 96" fill="none" stroke="#ec4899" strokeLinecap="round" strokeWidth="2.5" />
        <path d="M20 160 C64 150 98 154 138 140 S214 145 258 126 336 116 384 120 432 132 478 123 524 117 548 123" fill="none" stroke="#3b82f6" strokeLinecap="round" strokeWidth="2.5" />
        <path d="M20 169 C68 166 100 163 142 156 S218 158 262 148 340 142 386 145 434 151 480 146 526 141 548 144" fill="none" stroke="#10b981" strokeLinecap="round" strokeWidth="2.5" />
        <path d="M20 176 C70 174 104 172 146 166 S220 168 264 161 342 157 388 160 436 164 482 160 528 157 548 159" fill="none" stroke="#f97316" strokeLinecap="round" strokeWidth="2.5" />
        <g className="text-[10px] font-bold">
          <text fill="#64748b" x="24" y="187">5/12</text>
          <text fill="#64748b" x="125" y="187">5/13</text>
          <text fill="#64748b" x="232" y="187">5/14</text>
          <text fill="#64748b" x="338" y="187">5/16</text>
          <text fill="#64748b" x="444" y="187">5/17</text>
          <text fill="#64748b" x="518" y="187">5/18</text>
        </g>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500">
        {["브이로그", "모닝루틴", "AI툴", "생산성", "데일리룩"].map((label, index) => (
          <span className="inline-flex items-center gap-1.5" key={label}>
            <i className={["bg-violet-500", "bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500"][index] + " size-1.5 rounded-full"} />
            {label}
          </span>
        ))}
      </div>
    </article>
  );
}

function RankingCard({ title, rows, rising = false }: { title: string; rows: string[][]; rising?: boolean }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-black text-ink">{title}</h3>
      <div className="mt-3 space-y-2.5">
        {rows.map(([label, value], index) => (
          <div className="flex items-center justify-between gap-3 text-xs font-bold" key={label}>
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-violet-100 text-[10px] text-violet-700">{index + 1}</span>
              <span className="truncate">{label}</span>
            </span>
            <span className={rising ? "text-emerald-600" : "text-slate-500"}>{rising ? `▲ ${value}` : value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function GuideCard({ guide }: { guide: (typeof guides)[number] }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative">
        <Thumb compact theme={guide.theme} />
        <span className="absolute left-2 top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black text-white">{guide.label}</span>
        <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">{guide.time}</span>
      </div>
      <div className="p-3">
        <h3 className="text-xs font-black text-ink">{guide.title}</h3>
        <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">{guide.desc}</p>
      </div>
    </article>
  );
}

export default function TrendsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold text-slate-500">트렌드&nbsp;&nbsp;/&nbsp;&nbsp;trends</p>
        <h1 className="text-4xl font-black tracking-tight text-ink">
          트렌드 페이지 <span className="text-violet-600">✦</span>
        </h1>
        <p className="text-sm font-medium leading-6 text-slate-500">지금 인기 있는 릴스와 급상승 키워드, 그리고 인스타 공략 콘텐츠를 한눈에 확인하세요.</p>
      </header>

      <section>
        <SectionHeader number="1" title="현재 인기 릴스" description="지금 가장 반응이 좋은 릴스를 확인해보세요." action="전체 보기" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {reels.map((reel) => (
            <ReelCard key={reel.title} reel={reel} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader number="2" title="급상승 키워드" description="일별, 주별, 월별 흐름으로 키워드 변화를 분석하세요." />
        <div className="grid gap-3 lg:grid-cols-4">
          <KeywordChart />
          <RankingCard rows={topKeywords} title="인기 키워드 TOP 5" />
          <RankingCard rising rows={risingKeywords} title="상승 키워드" />
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-black text-ink">연관 해시태그</span>
            {hashtags.map((tag) => (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionHeader number="3" title="인스타 공략집" description="성장에 도움이 되는 실전 공략 콘텐츠를 확인하세요." action="더 보기" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {guides.map((guide) => (
            <GuideCard guide={guide} key={guide.title} />
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border border-violet-100 bg-[linear-gradient(90deg,#f5f3ff_0%,#fdf2f8_100%)] px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">!</span>
          <div>
            <p className="text-sm font-black text-ink">트렌드는 참고하고, 내 계정에 맞게 응용하는 것이 가장 중요해요.</p>
            <p className="mt-1 text-xs font-medium text-slate-500">데이터를 보고 나만의 릴스 전략을 만들어보세요.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
