// Provides the global navigation header for App Router pages.
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

const navItems = [
  { href: ROUTES.dashboard, label: "대시보드" },
  { href: ROUTES.trends, label: "트렌드" },
  { href: ROUTES.trendingItems, label: "인기템" },
  { href: ROUTES.recommendations, label: "추천" },
  { href: ROUTES.saved, label: "저장함" },
  { href: ROUTES.pricing, label: "요금" },
  { href: ROUTES.profile, label: "마이페이지" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2 text-base font-bold text-ink" href={ROUTES.home}>
          <span className="flex size-9 items-center justify-center rounded-md bg-ink text-xs tracking-wide text-white">BC</span>
          <span className="tracking-wide">BE CELEB</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium text-slate-600 lg:flex">
          {navItems.map((item) => (
            <Link className="rounded-md px-2.5 py-1.5 hover:bg-violet-50 hover:text-violet-700" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.login}
            className="hidden rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-slate-50 sm:inline-flex"
          >
            로그인
          </Link>
          <Link
            href={ROUTES.signup}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            시작하기
          </Link>
        </div>
      </div>
      <nav className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 pb-2 text-sm font-medium text-slate-600 sm:px-6 lg:hidden lg:px-8">
        {navItems.map((item) => (
          <Link className="shrink-0 rounded-md bg-slate-50 px-3 py-1.5 hover:bg-violet-50 hover:text-violet-700" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
