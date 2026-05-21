import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { getMainPageData, type MainPageData } from "@/lib/api/main";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type IconName =
  | "sparkles"
  | "trending"
  | "target"
  | "chart"
  | "calendar"
  | "arrow"
  | "hash";

const features = [
  {
    icon: "trending" as const,
    title: "트렌드 분석",
    description: "카테고리별 실시간 YouTube 트렌드와 검색 관심도를 한눈에 파악하세요",
  },
  {
    icon: "target" as const,
    title: "AI 콘텐츠 추천",
    description: "채널 분석을 통해 다음 영상 아이디어, 훅, 구성, 해시태그를 자동 생성합니다",
  },
  {
    icon: "chart" as const,
    title: "성장 리포트",
    description: "데이터 기반의 성장 분석으로 채널 성과를 체계적으로 관리하세요",
  },
  {
    icon: "calendar" as const,
    title: "제작 캘린더",
    description: "콘텐츠 제작 일정을 효율적으로 관리하고 업로드를 계획하세요",
  },
];

const workflow = [
  {
    step: "01",
    title: "YouTube 채널 입력",
    description: "분석하고 싶은 YouTube 채널 링크를 입력합니다",
  },
  {
    step: "02",
    title: "카테고리 선택",
    description: "IT, 일상, 뷰티 등 채널 카테고리를 선택합니다",
  },
  {
    step: "03",
    title: "AI 추천 생성",
    description: "AI가 트렌드를 분석하여 콘텐츠 아이디어를 생성합니다",
  },
  {
    step: "04",
    title: "즐겨찾기 저장",
    description: "마음에 드는 추천을 즐겨찾기에 저장합니다",
  },
  {
    step: "05",
    title: "캘린더 등록",
    description: "제작 일정을 캘린더에 등록하고 관리합니다",
  },
];

const fallbackStats = [
  { label: "활성 크리에이터", value: "10,000+" },
  { label: "생성된 추천", value: "50,000+" },
  { label: "분석된 트렌드", value: "100,000+" },
];

const fallbackKeywords = [
  { keyword: "#GRWM", score: 92, trend: "+12%" },
  { keyword: "#패션아이템", score: 88, trend: "+8%" },
  { keyword: "#데일리룩", score: 85, trend: "+15%" },
  { keyword: "#뷰티팁", score: 82, trend: "+5%" },
  { keyword: "#IT리뷰", score: 79, trend: "+20%" },
  { keyword: "#브이로그", score: 76, trend: "+3%" },
];

const primaryCtaClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-8 text-base font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700";

const outlineCtaClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-8 text-base font-bold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCompactValue(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getStats(mainData: MainPageData | null) {
  if (!mainData) {
    return fallbackStats;
  }

  return [
    { label: "활성 크리에이터", value: formatCompactValue(mainData.stats.totalUsers) },
    { label: "생성된 추천", value: formatCompactValue(mainData.stats.totalRecommendations) },
    { label: "분석된 트렌드", value: formatCompactValue(mainData.stats.activeTrendsCount) },
  ];
}

function getKeywords(mainData: MainPageData | null) {
  const trends = mainData?.popularTrends ?? [];

  if (!trends.length) {
    return fallbackKeywords;
  }

  return trends.slice(0, 6).map((trend) => ({
    keyword: trend.tags[0] ? (trend.tags[0].startsWith("#") ? trend.tags[0] : `#${trend.tags[0]}`) : `#${trend.title}`,
    score: trend.score,
    trend: `${trend.growthRate > 0 ? "+" : ""}${trend.growthRate}%`,
  }));
}

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      {name === "sparkles" ? (
        <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm6 12 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1L18 15Z" fill="currentColor" />
      ) : null}
      {name === "trending" ? (
        <path d="M4 16.5 9 11l4 3.5L20 7M15 7h5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      ) : null}
      {name === "target" ? (
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="2" />
      ) : null}
      {name === "chart" ? (
        <path d="M5 19V5m0 14h14M9 16v-5m4 5V8m4 8v-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      ) : null}
      {name === "calendar" ? (
        <path d="M7 4v4M17 4v4M5 9h14M6.5 6h11A1.5 1.5 0 0 1 19 7.5v10A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-10A1.5 1.5 0 0 1 6.5 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      ) : null}
      {name === "arrow" ? (
        <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      ) : null}
      {name === "hash" ? (
        <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      ) : null}
    </svg>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <article
      className={`relative rounded-xl border border-violet-100/80 bg-white text-ink shadow-[0_18px_46px_rgba(88,28,135,0.08),0_2px_10px_rgba(15,23,42,0.04)] ring-1 ring-white/80 transition-shadow duration-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(237,233,254,0.18)_48%,rgba(255,255,255,0))] before:content-[''] hover:shadow-[0_24px_60px_rgba(88,28,135,0.13),0_4px_14px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </article>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const code = firstParam(params.code);

  if (code) {
    redirect(`/api/auth/reset-password/callback?code=${encodeURIComponent(code)}`);
  }

  const mainData = await getMainPageData().catch(() => null);
  const stats = getStats(mainData);
  const keywords = getKeywords(mainData);

  return (
    <div className="w-full bg-white text-ink">
      <section className="relative overflow-hidden border-b border-violet-400/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ede9fe_0%,rgba(237,233,254,0.72)_34%,transparent_68%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-4xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-1.5 text-sm font-bold text-violet-700 shadow-sm">
              <Icon className="h-3.5 w-3.5" name="sparkles" />
              AI 크리에이터 리서치 서비스
            </span>
            <h1 className="mb-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              다음 YouTube 콘텐츠,
              <br />
              <span className="bg-gradient-to-r from-violet-700 via-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
                데이터로 결정하세요
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              유사한 채널 카테고리 내에서 콘텐츠 트렌드를 분석하여
              <br className="hidden sm:block" />
              다음 영상 아이디어를 제안합니다
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link className={primaryCtaClass} href={ROUTES.signup}>
                무료로 시작하기
                <Icon name="arrow" />
              </Link>
              <Link className={outlineCtaClass} href={ROUTES.dashboard}>
                대시보드 둘러보기
              </Link>
            </div>

            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 sm:gap-8">
              {stats.map((stat) => (
                <div className="text-center" key={stat.label}>
                  <div className="mb-1 text-2xl font-black text-violet-700 sm:text-3xl">{stat.value}</div>
                  <div className="text-xs text-slate-500 sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-black sm:text-4xl">간단한 5단계 워크플로우</h2>
            <p className="text-lg text-slate-600">복잡한 콘텐츠 기획 과정을 쉽고 빠르게 처리하세요</p>
          </div>

          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-5 lg:gap-12">
            {workflow.map((item, index) => (
              <Card className="p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-200" key={item.step}>
                <div className="relative">
                  <div className="mb-3 text-5xl font-black text-violet-500">{item.step}</div>
                  <h3 className="mb-2 font-bold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
                </div>
                {index < workflow.length - 1 ? (
                  <Icon className="pointer-events-none absolute -right-8 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-violet-300 lg:block" name="arrow" />
                ) : null}
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#ffffff_0%,#faf5ff_48%,#ffffff_100%)] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-black sm:text-4xl">강력한 기능으로 채널을 성장시키세요</h2>
            <p className="text-lg text-slate-600">데이터 기반의 인사이트로 더 나은 콘텐츠를 만드세요</p>
          </div>

          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card className="group p-8 transition duration-300 hover:-translate-y-1 hover:border-violet-200" key={feature.title}>
                <div className="relative">
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-violet-50 text-violet-700 shadow-inner shadow-violet-100 transition group-hover:bg-violet-100">
                    <Icon className="h-7 w-7" name={feature.icon} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                  <p className="leading-relaxed text-slate-500">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-black sm:text-4xl">실시간 트렌딩 키워드</h2>
              <p className="text-lg text-slate-600">지금 인기 있는 콘텐츠 키워드를 확인하세요</p>
            </div>

            <Card className="p-8">
              <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {keywords.map((item) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-violet-50 bg-slate-50 p-4 shadow-sm shadow-slate-200/60 transition hover:border-violet-100 hover:bg-violet-50 hover:shadow-md hover:shadow-violet-100"
                    key={item.keyword}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-violet-600" name="hash" />
                      <span className="truncate font-semibold">{item.keyword}</span>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-3">
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 font-mono text-xs font-bold text-violet-700">
                        {item.score}점
                      </span>
                      <span className="text-xs font-bold text-emerald-400">{item.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative mt-6 text-center">
                <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold transition hover:border-violet-300 hover:bg-violet-50" href={ROUTES.trends}>
                  전체 트렌드 보기
                  <Icon className="h-4 w-4" name="arrow" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border-violet-200 bg-[linear-gradient(135deg,#f5f3ff_0%,#faf5ff_48%,#ffffff_100%)] p-12 text-center shadow-[0_28px_80px_rgba(88,28,135,0.14),0_8px_22px_rgba(15,23,42,0.06)] sm:p-16">
            <div className="relative mx-auto max-w-3xl">
              <h2 className="mb-4 text-3xl font-black sm:text-4xl">지금 바로 시작하세요</h2>
              <p className="mb-8 text-lg leading-relaxed text-slate-600">
                10,000명 이상의 크리에이터가 BE CELEB으로
                <br className="hidden sm:block" />
                데이터 기반 콘텐츠를 제작하고 있습니다
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link className={primaryCtaClass} href={ROUTES.signup}>
                  무료로 시작하기
                  <Icon name="arrow" />
                </Link>
                <Link className={outlineCtaClass} href={ROUTES.login}>
                  로그인
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
