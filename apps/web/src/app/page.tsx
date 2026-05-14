// Renders the polished landing page for Be Celeb.
import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const primaryLinkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(180deg,#8b5cf6_0%,#7c3aed_54%,#6d28d9_100%)] px-7 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-10px_18px_rgba(76,29,149,0.24),0_12px_22px_rgba(124,58,237,0.22)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#9f7aea_0%,#7c3aed_54%,#5b21b6_100%)]";

const secondaryLinkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-violet-300 bg-white px-7 py-3 text-sm font-bold text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50";

const heroStats = [
  { label: "라이브 점수", value: "85", change: "+12%" },
  { label: "트렌드 점수", value: "92", change: "+8%" },
  { label: "도달 가능성", value: "1.2M", change: "+22%" },
  { label: "브랜드 필수", value: "14", change: "+8%" },
];

const sidebarItems = ["개요", "추천", "트렌드 분석", "키워드", "해시태그", "인플루언서", "전략 가이드"];

const insightCards = [
  { icon: "spark", title: "맞춤 콘텐츠 추천", description: "내 채널 성향에 맞는 Shorts 아이디어를 추천받으세요.", tone: "violet" },
  { icon: "trend", title: "트렌드 분석", description: "지금 뜨는 주제와 반응 좋은 패턴을 빠르게 파악하세요.", tone: "pink" },
  { icon: "search", title: "키워드 분석", description: "어떤 키워드가 잘 먹히는지 그래프로 확인하세요.", tone: "orange" },
  { icon: "hash", title: "해시태그 인사이트", description: "도달률을 높일 해시태그를 찾아보세요.", tone: "violet" },
  { icon: "people", title: "유사 인플루언서 찾기", description: "나와 비슷한 채널의 성공 패턴을 참고하세요.", tone: "blue" },
  { icon: "book", title: "Shorts 전략 가이드", description: "기획부터 업로드까지 실전 전략을 확인하세요.", tone: "green" },
];

const popularTags = [
  { label: "#클린걸메이크업", value: "2.4M", width: "w-full", color: "bg-violet-500" },
  { label: "#감성카페룩", value: "1.8M", width: "w-4/5", color: "bg-pink-500" },
  { label: "#생성형AI", value: "1.2M", width: "w-3/5", color: "bg-amber-400" },
  { label: "#출근룩", value: "982K", width: "w-1/2", color: "bg-blue-500" },
  { label: "#홈테크", value: "754K", width: "w-2/5", color: "bg-emerald-500" },
];

const platformStats = [
  { label: "YouTube Shorts", value: "32%", color: "bg-violet-500" },
  { label: "YouTube", value: "28%", color: "bg-pink-500" },
  { label: "Long-form", value: "21%", color: "bg-orange-400" },
  { label: "라이프스타일", value: "12%", color: "bg-sky-500" },
  { label: "뷰티 리뷰", value: "7%", color: "bg-emerald-500" },
];

const risingTopics = [
  { label: "5월 Shorts 루틴", icon: "🔥" },
  { label: "크리에이터의 AI 툴", icon: "🔥" },
  { label: "여름 뷰티 챌린지", icon: "↗" },
  { label: "디지털 디톡스", icon: "↗" },
  { label: "부업 아이디어", icon: "↗" },
];

const videoRecommendations = [
  {
    title: "30분 만에 콘텐츠 기획하는 방법",
    image: "desk",
    badge: "추천 Shorts",
    creator: "콘텐츠 메이커",
    stats: "예상 도달 12.4K",
    tags: ["루틴", "생산성", "기획"],
  },
  {
    title: "콘텐츠 크리에이터의 하루",
    image: "studio",
    badge: "추천 Shorts",
    creator: "Shorts 분석 채널",
    stats: "참여율 9.8%",
    tags: ["브이로그", "성장", "일상"],
  },
  {
    title: "시간을 아껴주는 필수 앱 5가지",
    image: "phone",
    badge: "추천 Shorts",
    creator: "생산성 크리에이터",
    stats: "저장률 높음",
    tags: ["앱추천", "꿀팁", "생산성"],
  },
];

const growthCards = [
  {
    title: "데이터 기반 인사이트",
    descriptionLines: ["명확한 데이터로 트렌드를", "발견하고 아이디어를 얻으세요."],
    icon: "chart",
  },
  {
    title: "참여율 향상",
    descriptionLines: ["반응을 이끄는 콘텐츠로", "참여율을 높여보세요."],
    icon: "heart",
  },
  {
    title: "꾸준한 콘텐츠 기획",
    descriptionLines: ["아이디어가 끊기지 않는", "콘텐츠 플랜을 세워보세요."],
    icon: "calendar",
  },
  {
    title: "더 빠른 성장",
    descriptionLines: ["올바른 전략으로 도달과", "성장을 빠르게 경험하세요."],
    icon: "rocket",
  },
];

function AvatarStack() {
  return (
    <div className="flex -space-x-2">
      {["bg-violet-500", "bg-pink-400", "bg-amber-300", "bg-slate-800", "bg-blue-400"].map((color, index) => (
        <span className={`size-7 rounded-full border-2 border-white ${color}`} key={color}>
          <span className="sr-only">creator {index + 1}</span>
        </span>
      ))}
    </div>
  );
}

function CompassIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="m14.9 8.7-1.7 5.1-5.1 1.7 1.7-5.1 5.1-1.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FeatureIcon({ type, tone }: { type: string; tone: string }) {
  const toneClass =
    tone === "pink"
      ? "bg-pink-50 text-pink-500"
      : tone === "orange"
        ? "bg-orange-50 text-orange-500"
        : tone === "blue"
          ? "bg-blue-50 text-blue-500"
          : tone === "green"
            ? "bg-emerald-50 text-emerald-500"
            : "bg-violet-50 text-violet-600";

  return (
    <span className={`inline-flex size-10 items-center justify-center rounded-xl ${toneClass}`}>
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
        {type === "spark" ? (
          <path d="M12 4l1.4 4.3L18 10l-4.6 1.7L12 16l-1.4-4.3L6 10l4.6-1.7L12 4Zm6 10 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1L18 14Z" fill="currentColor" />
        ) : null}
        {type === "trend" ? (
          <path d="M4 16.5 9 11l4 3.5L20 7M15 7h5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
        ) : null}
        {type === "search" ? (
          <path d="m16.8 16.8 3.2 3.2M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
        ) : null}
        {type === "hash" ? (
          <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
        ) : null}
        {type === "people" ? (
          <path d="M9.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM3.5 19c.9-3.4 3-5 6-5s5.1 1.6 6 5M17 11.5a2.6 2.6 0 1 0 0-5.2M17.5 14.3c1.7.6 2.8 2 3.2 4.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        ) : null}
        {type === "book" ? (
          <path d="M5 5.5c2.6 0 4.9.5 7 2v12c-2.1-1.5-4.4-2-7-2v-12Zm7 2c2.1-1.5 4.4-2 7-2v12c-2.6 0-4.9.5-7 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        ) : null}
      </svg>
    </span>
  );
}

function TrendInsightSection() {
  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {insightCards.map((card) => (
            <article className="min-h-[142px] rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm shadow-slate-100" key={card.title}>
              <FeatureIcon tone={card.tone} type={card.icon} />
              <h3 className="mt-4 text-sm font-extrabold text-ink">{card.title}</h3>
              <p className="mx-auto mt-2 max-w-[9.25rem] text-xs font-medium leading-5 text-slate-500">{card.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.55fr_0.7fr_0.7fr_0.7fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-ink">키워드 분석</h3>
              <div className="flex gap-2 text-[11px] font-bold text-slate-500">
                <span className="rounded-md border border-slate-200 px-2.5 py-1">최근 30일</span>
                <span className="rounded-md border border-slate-200 px-2.5 py-1">Shorts</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-5 text-[11px] font-bold text-slate-500">
              <span className="inline-flex items-center gap-2"><i className="h-0.5 w-6 bg-violet-500" />콘텐츠 크리에이터</span>
              <span className="inline-flex items-center gap-2"><i className="h-0.5 w-6 bg-pink-500" />일상 브이로그</span>
              <span className="inline-flex items-center gap-2"><i className="h-0.5 w-6 bg-blue-500" />생산성 팁</span>
            </div>
            <svg className="mt-3 h-40 w-full" role="img" viewBox="0 0 520 170">
              {[30, 70, 110, 150].map((y) => (
                <line key={y} opacity="0.1" stroke="#64748b" x1="0" x2="520" y1={y} y2={y} />
              ))}
              <path d="M8 126 C48 98 72 120 108 92 S166 104 202 68 268 43 318 55 376 75 424 56 476 41 512 55" fill="none" stroke="#8b5cf6" strokeLinecap="round" strokeWidth="3" />
              <path d="M8 146 C48 127 76 141 112 116 S166 123 206 98 266 78 316 85 376 103 424 86 476 76 512 90" fill="none" stroke="#ec4899" strokeLinecap="round" strokeWidth="3" />
              <path d="M8 156 C48 148 78 151 112 138 S172 144 210 124 266 111 318 116 378 128 424 117 478 109 512 119" fill="none" stroke="#60a5fa" strokeLinecap="round" strokeWidth="3" />
              <circle cx="424" cy="56" fill="#8b5cf6" r="4" />
              <g className="text-[10px] font-bold">
                <text fill="#64748b" x="12" y="166">4월 20일</text>
                <text fill="#64748b" x="146" y="166">4월 27일</text>
                <text fill="#64748b" x="284" y="166">5월 4일</text>
                <text fill="#64748b" x="430" y="166">5월 11일</text>
              </g>
            </svg>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <h3 className="text-sm font-extrabold text-ink">인기 해시태그</h3>
            <div className="mt-4 space-y-3">
              {popularTags.map((tag) => (
                <div key={tag.label}>
                  <div className="mb-1 flex justify-between text-[11px] font-bold">
                    <span className="text-violet-700">{tag.label}</span>
                    <span className="text-slate-500">{tag.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className={`h-1.5 rounded-full ${tag.color} ${tag.width}`} />
                  </div>
                </div>
              ))}
            </div>
            <Link className="mt-5 inline-flex text-xs font-extrabold text-violet-600" href={ROUTES.trends}>해시태그 더 보기 →</Link>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <h3 className="text-sm font-extrabold text-ink">성장 좋은 포맷</h3>
            <div className="mt-4 space-y-3">
              {platformStats.map((item) => (
                <div className="flex items-center justify-between text-xs font-bold" key={item.label}>
                  <span className="flex items-center gap-2 text-slate-600"><i className={`size-5 rounded-full ${item.color}`} />{item.label}</span>
                  <span className="text-ink">{item.value}</span>
                </div>
              ))}
            </div>
            <Link className="mt-5 inline-flex text-xs font-extrabold text-violet-600" href={ROUTES.recommendations}>포맷 더 보기 →</Link>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <h3 className="text-sm font-extrabold text-ink">인기 주제</h3>
            <div className="mt-4 space-y-3">
              {risingTopics.map((topic) => (
                <div className="flex items-center justify-between text-xs font-bold" key={topic.label}>
                  <span className="text-slate-600">{topic.label}</span>
                  <span className={topic.icon === "🔥" ? "text-orange-500" : "text-emerald-500"}>{topic.icon}</span>
                </div>
              ))}
            </div>
            <Link className="mt-5 inline-flex text-xs font-extrabold text-violet-600" href={ROUTES.trendingItems}>주제 더 보기 →</Link>
          </article>
        </div>
      </div>
    </section>
  );
}

function GrowthIcon({ type }: { type: string }) {
  return (
    <span className="relative inline-flex h-20 w-full items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_35%_20%,#ffffff_0%,#ffffff_18%,transparent_19%),linear-gradient(135deg,#ede9fe_0%,#fce7f3_100%)] text-violet-600">
      <span className="absolute left-5 top-5 size-3 rounded-full bg-violet-300/60" />
      <span className="absolute right-6 top-4 size-2 rounded-full bg-pink-300/70" />
      <span className="absolute bottom-4 left-9 h-2 w-9 rounded-full bg-violet-300/40" />
      <svg aria-hidden="true" className="relative size-12" fill="none" viewBox="0 0 32 32">
        {type === "chart" ? (
          <>
            <rect fill="white" height="20" rx="4" width="24" x="4" y="6" />
            <path d="M9 21V15M16 21V10M23 21v-8" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
            <path d="M7 10h18" stroke="#f0abfc" strokeLinecap="round" strokeWidth="2" />
          </>
        ) : null}
        {type === "heart" ? (
          <>
            <circle cx="16" cy="16" fill="white" r="11" />
            <path d="M16 23s-7-4.2-7-9a4 4 0 0 1 7-2.5A4 4 0 0 1 23 14c0 4.8-7 9-7 9Z" fill="#ec4899" />
          </>
        ) : null}
        {type === "calendar" ? (
          <>
            <rect fill="white" height="22" rx="4" width="22" x="5" y="6" />
            <path d="M10 4v5M22 4v5M9 14h14M11 19h3M18 19h3" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
          </>
        ) : null}
        {type === "rocket" ? (
          <>
            <path d="M18 5c4.5 1 7 3.5 8 8l-8 8-7-7 7-9Z" fill="white" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
            <path d="M10 18 6 22l4 1 1 4 4-4" fill="#f0abfc" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
            <circle cx="19" cy="12" fill="#ec4899" r="2" />
          </>
        ) : null}
      </svg>
    </span>
  );
}

function VideoThumbnail({ type }: { type: string }) {
  return (
    <div className="relative h-[112px] w-[78px] shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-inner">
      {type === "desk" ? (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#fde68a_0%,#fed7aa_42%,#bfdbfe_100%)]">
          <div className="absolute bottom-3 left-3 h-16 w-11 rotate-[-12deg] rounded-lg bg-white shadow-lg">
            <div className="mx-auto mt-2 h-9 w-7 rounded bg-[linear-gradient(180deg,#334155,#94a3b8)]" />
            <div className="mx-auto mt-1 h-1 w-6 rounded bg-slate-200" />
          </div>
          <div className="absolute right-2 top-3 size-7 rounded-full bg-white/80" />
          <div className="absolute right-3 top-4 size-4 rounded-full bg-violet-400" />
        </div>
      ) : null}
      {type === "studio" ? (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#ddd6fe_0%,#fed7aa_100%)]">
          <div className="absolute left-5 top-4 h-20 w-9 rounded-full bg-slate-800" />
          <div className="absolute left-8 top-2 h-10 w-10 rounded-xl bg-white shadow-md" />
          <div className="absolute bottom-3 right-3 h-16 w-5 rounded bg-slate-700" />
          <div className="absolute bottom-5 left-3 h-8 w-8 rounded-full bg-violet-400" />
        </div>
      ) : null}
      {type === "phone" ? (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#fef3c7_0%,#bfdbfe_100%)]">
          <div className="absolute left-5 top-4 h-20 w-11 rotate-[-10deg] rounded-xl border-2 border-slate-300 bg-white shadow-lg">
            <div className="mx-auto mt-2 h-1 w-4 rounded bg-slate-300" />
            <div className="mx-auto mt-3 h-8 w-7 rounded bg-[linear-gradient(180deg,#93c5fd,#ddd6fe)]" />
            <div className="mx-auto mt-2 h-1.5 w-7 rounded bg-violet-200" />
          </div>
          <div className="absolute right-2 top-5 size-5 rounded-full bg-white/75" />
        </div>
      ) : null}
    </div>
  );
}

function VideoRecommendationCard({ item }: { item: (typeof videoRecommendations)[number] }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex gap-3">
        <VideoThumbnail type={item.image} />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-600">{item.badge}</span>
            <span className="text-sm text-slate-400">♡</span>
          </div>
          <h3 className="line-clamp-2 text-sm font-extrabold leading-5 text-ink">{item.title}</h3>
          <p className="mt-2 text-[11px] font-bold text-slate-500">{item.creator}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">{item.stats}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function VideoGrowthSection() {
  return (
    <section className="border-b border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-black tracking-tight text-ink">나에게 맞는 Shorts 추천</h2>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              내 관심사와 최근 트렌드를 바탕으로 추천받은 콘텐츠 아이디어
            </p>
          </div>
          <Link className="hidden rounded-full border border-violet-300 px-4 py-2 text-xs font-extrabold text-violet-700 transition hover:bg-violet-50 sm:inline-flex" href={ROUTES.recommendations}>
            추천 더 보기 →
          </Link>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {videoRecommendations.map((item) => (
            <VideoRecommendationCard item={item} key={item.title} />
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.68fr_1.32fr] lg:items-center">
          <div>
            <h2 className="text-[30px] font-black leading-tight tracking-tight text-ink xl:text-[32px]">
              더 똑똑하게
              <br />
              <span className="whitespace-nowrap">
                <span className="bg-[linear-gradient(90deg,#7c3aed_0%,#ec4899_100%)] bg-clip-text text-transparent">YouTube을 성장</span>시키세요
              </span>
            </h2>
            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-slate-500">
              데이터 기반 인사이트로 더 좋은 콘텐츠를 만들고, 맞는 타겟에게 도달하고, 꾸준히 성장하세요.
            </p>
            <Link className={`${primaryLinkClass} mt-5`} href={ROUTES.onboarding}>
              지금 시작하기 <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {growthCards.map((card) => (
              <article className="flex min-h-[210px] flex-col rounded-2xl bg-[linear-gradient(180deg,#fff7ff_0%,#f7f2ff_100%)] p-4 text-center shadow-sm shadow-violet-100" key={card.title}>
                <GrowthIcon type={card.icon} />
                <h3 className="mt-4 min-h-5 whitespace-nowrap text-[12.5px] font-extrabold text-ink">{card.title}</h3>
                <p className="mx-auto mt-2 min-h-[36px] text-[10.5px] font-medium leading-[1.7] text-slate-500">
                  {card.descriptionLines.map((line) => (
                    <span className="block whitespace-nowrap" key={line}>
                      {line}
                    </span>
                  ))}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroDashboardPreview() {
  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/80">
      <div className="grid gap-4 lg:grid-cols-[92px_1fr]">
        <aside className="hidden rounded-2xl bg-slate-50 p-3 text-[11px] font-bold text-slate-500 lg:block">
          <div className="mb-4 flex items-center gap-2 text-ink">
            <img alt="" className="size-5 rounded-md object-contain" src="/android-icon-192x192.png" />
            <span>Be Celeb</span>
          </div>
          <div className="space-y-1.5">
            {sidebarItems.map((item, index) => (
              <div className={`rounded-lg px-2 py-2 ${index === 0 ? "bg-violet-100 text-violet-700" : ""}`} key={item}>
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-extrabold text-ink">다시 오신 걸 환영해요, Alex</p>
              <p className="mt-1 text-xs font-medium text-slate-500">당신의 Shorts 성장을 위한 트렌드 브리핑입니다.</p>
            </div>
            <span className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-500">2024년 5월 12일 - 5월 18일</span>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {heroStats.map((stat) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-3" key={stat.label}>
                <p className="text-[11px] font-bold text-slate-500">{stat.label}</p>
                <div className="mt-2 flex items-end gap-2">
                  <p className="text-xl font-extrabold text-ink">{stat.value}</p>
                  <span className="pb-1 text-[10px] font-bold text-emerald-500">{stat.change}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-extrabold text-ink">트렌드 개요</p>
                <span className="text-[11px] font-bold text-slate-400">상승률 96%</span>
              </div>
              <svg className="h-32 w-full" role="img" viewBox="0 0 280 120">
                <path d="M8 96 C38 42 55 86 82 54 S128 76 150 41 S196 82 220 45 S252 32 272 16" fill="none" stroke="#8b5cf6" strokeLinecap="round" strokeWidth="4" />
                <path d="M8 96 C38 42 55 86 82 54 S128 76 150 41 S196 82 220 45 S252 32 272 16" fill="none" opacity="0.16" stroke="#8b5cf6" strokeLinecap="round" strokeWidth="12" />
                {[40, 80, 120, 160, 200, 240].map((x) => (
                  <line key={x} opacity="0.12" stroke="#64748b" x1={x} x2={x} y1="8" y2="112" />
                ))}
              </svg>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-extrabold text-ink">추천 Shorts 아이디어</p>
              <div className="mt-3 flex gap-3">
                <div className="h-20 w-16 shrink-0 rounded-xl bg-[linear-gradient(135deg,#ddd6fe,#fbcfe8)]" />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold leading-5 text-ink">내 삶을 담는 콘텐츠 메이커 되기</p>
                  <p className="mt-2 text-[11px] leading-4 text-slate-500">일상 장면도 빠르게 Shorts로 바꿔보세요.</p>
                  <div className="mt-3 flex items-center gap-2">
                    <AvatarStack />
                    <span className="text-[11px] font-bold text-slate-400">+8K</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["#브이로그", "#제품리뷰", "#감성루틴", "#Shorts아이디어"].map((tag) => (
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const code = firstParam(params.code);

  if (code) {
    redirect(`/api/auth/reset-password/callback?code=${encodeURIComponent(code)}`);
  }

  return (
    <div className="-mt-8 bg-white text-ink">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto grid min-h-[520px] max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8">
          <div className="relative z-10 space-y-7">
            <div className="space-y-5">
              <h1 className="relative max-w-2xl text-4xl font-black leading-[1.15] tracking-normal text-ink sm:text-5xl lg:text-[3.05rem]">
                인플루언서 트렌드로
                <br />
                <span className="whitespace-nowrap">맞춤 Shorts 아이디어를</span>
                <br />
                <span className="inline-block bg-[linear-gradient(90deg,#7c3aed_0%,#a855f7_35%,#ff3fb4_100%)] bg-clip-text [font-family:Pretendard,Inter,ui-sans-serif,system-ui,sans-serif] font-black text-transparent">
                  추천받으세요
                </span>
              </h1>
              <p className="text-[14px] font-medium leading-[1.65] text-[#64748b]">
                <span className="block">Be Celeb은 비슷한 YouTube 크리에이터의</span>
                <span className="block">최근 Shorts 패턴을 분석해, 다음에 올리면 좋을</span>
                <span className="block">콘텐츠 아이디어를 추천합니다.</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={ROUTES.onboarding} className={primaryLinkClass}>
                추천받기 <span aria-hidden="true">→</span>
              </Link>
              <Link href={ROUTES.trendingItems} className={secondaryLinkClass}>
                트렌드 보기 <CompassIcon />
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <AvatarStack />
              <p className="text-xs font-semibold leading-5 text-slate-600">
                <span className="font-black text-ink">10,000명 이상</span>의 크리에이터가
                <br />
                함께하고 있어요
              </p>
            </div>
          </div>

          <HeroDashboardPreview />
        </div>
      </section>

      <TrendInsightSection />
      <VideoGrowthSection />
    </div>
  );
}



