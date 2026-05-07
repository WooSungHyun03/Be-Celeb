// Renders the polished landing page for Be Celeb.
import Link from "next/link";
import { HeroRecommendationBoard } from "@/components/home/HeroRecommendationBoard";
import { ROUTES } from "@/constants/routes";
import { mockRecommendations } from "@/mocks/mockRecommendations";
import { mockTrends } from "@/mocks/mockTrends";

const stats = [
  { label: "Signals", value: "12" },
  { label: "Ideas", value: "80+" },
  { label: "Score", value: "84" },
];

const featureHighlights = [
  {
    title: "Signal",
    description: "상승 중인 주제와 포맷을 콘텐츠 관점으로 정리합니다.",
  },
  {
    title: "Market",
    description: "콘텐츠로 이어질 수 있는 아이템을 카테고리별로 탐색합니다.",
  },
  {
    title: "Creative",
    description: "아이템을 훅, 구성, 해시태그가 있는 제작안으로 바꿉니다.",
  },
];

const workflow = ["Discover", "Curate", "Plan", "Create"];

const primaryLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800";

const secondaryLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-violet-50";

export default function HomePage() {
  return (
    <div className="-mt-8 bg-white text-ink">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_36%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div className="space-y-9">
            <div className="space-y-5">
              <span className="inline-flex rounded-md border border-violet-200 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
                Creator intelligence
              </span>
              <h1 className="max-w-3xl text-6xl font-bold tracking-tight text-ink sm:text-7xl lg:text-8xl">
                BE CELEB
              </h1>
              <p className="max-w-2xl text-xl leading-9 text-slate-700">
                트렌드, 인기 아이템, 콘텐츠 브리프를 하나의 흐름으로 정리합니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={ROUTES.onboarding} className={primaryLinkClass}>
                시작하기
              </Link>
              <Link href={ROUTES.trendingItems} className={secondaryLinkClass}>
                인기템 보기
              </Link>
            </div>

            <div className="grid max-w-2xl grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white/75 shadow-sm backdrop-blur">
              {stats.map((stat) => (
                <div className="px-4 py-4" key={stat.label}>
                  <p className="text-3xl font-bold text-ink">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/70 p-3 shadow-2xl shadow-slate-200/80 backdrop-blur">
            <HeroRecommendationBoard recommendations={mockRecommendations} trends={mockTrends} />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase text-violet-700">Service</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-ink">덜 복잡하게, 더 선명하게</h2>
            </div>
            <p className="text-lg leading-8 text-slate-600">
              리서치 화면, 상품 탐색, 제작안을 따로 오가지 않도록 구성했습니다. 필요한 건 더 빠른 판단이고, 화면은 그 판단을 방해하지 않아야 합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-violet-700">System</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">콘텐츠를 고르는 세 가지 기준</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 lg:justify-self-end">
              어떤 콘텐츠를 만들지 오래 고민하지 않도록, 신호와 아이템, 제작안을 한 흐름으로 정리합니다.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {featureHighlights.map((feature, index) => (
              <article className="min-h-[220px] rounded-2xl border border-slate-200 bg-white p-7 shadow-sm" key={feature.title}>
                <span className="text-sm font-bold text-violet-700">0{index + 1}</span>
                <h3 className="mt-5 text-2xl font-bold text-ink">{feature.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-violet-300">Workflow</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight">하루의 콘텐츠 결정을 줄입니다.</h2>
            <p className="mt-4 leading-7 text-slate-300">
              무엇을 만들지 오래 고민하지 않도록, 발견부터 제작까지 필요한 판단만 남깁니다.
            </p>
          </div>
          <div className="grid gap-0 border-y border-white/15 sm:grid-cols-4 sm:border-y-0">
            {workflow.map((item, index) => (
              <div className="border-b border-white/15 py-6 sm:border-b-0 sm:border-l sm:px-6" key={item}>
                <span className="text-sm font-bold text-violet-300">0{index + 1}</span>
                <p className="mt-4 text-lg font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="border-t border-slate-200 pt-10 lg:flex lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-violet-700">Ready</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">다음 콘텐츠를 더 빠르게 정하세요.</h2>
          </div>
          <Link href={ROUTES.recommendations} className="mt-6 inline-flex rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 lg:mt-0">
            추천 콘텐츠 보기
          </Link>
        </div>
      </section>
    </div>
  );
}
