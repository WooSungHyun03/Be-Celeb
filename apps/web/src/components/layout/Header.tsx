// Provides the global navigation header for App Router pages.
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

const navItems = [
  { href: ROUTES.dashboard, label: "대시보드" },
  { href: ROUTES.trends, label: "트렌드" },
  { href: ROUTES.trendingItems, label: "인기템" },
  { href: ROUTES.recommendations, label: "추천" },
  { href: ROUTES.pricing, label: "요금" },
  { href: ROUTES.profile, label: "마이페이지" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <Link className="group flex items-center gap-2 text-base font-bold text-ink transition duration-200 hover:-translate-y-0.5" href={ROUTES.home}>
          <span className="flex size-9 items-center justify-center rounded-md bg-ink text-xs tracking-wide text-white shadow-sm transition duration-200 group-hover:rotate-3 group-hover:shadow-md">
            BC
          </span>
          <span className="tracking-wide">BE CELEB</span>
        </Link>
        <nav className="hidden items-center gap-1.5 text-sm font-medium text-slate-600 lg:flex">
          {navItems.map((item) => (
            <Link
              className="relative inline-flex min-h-10 items-center rounded-lg px-4 py-2 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-50 hover:text-violet-700 active:translate-y-0"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.login}
            className="hidden min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 sm:inline-flex"
          >
            로그인
          </Link>
          <Link
            href={ROUTES.signup}
            className="inline-flex min-h-10 items-center rounded-lg bg-ink px-5 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg active:translate-y-0"
          >
            시작하기
          </Link>
        </div>
      </div>
      <nav className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-4 pb-2 text-sm font-medium text-slate-600 sm:px-6 lg:hidden lg:px-8">
        {navItems.map((item) => (
          <Link
            className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-slate-50 px-4 py-2 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-50 hover:text-violet-700 active:translate-y-0"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
