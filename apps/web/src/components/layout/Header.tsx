// Provides the global navigation header for App Router pages.
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

const navItems = [
  { href: ROUTES.dashboard, label: "Dashboard" },
  { href: ROUTES.trends, label: "Trends" },
  { href: ROUTES.recommendations, label: "Recommendations" },
  { href: ROUTES.saved, label: "Saved" },
  { href: ROUTES.admin, label: "Admin" },
];

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="text-lg font-semibold text-ink" href={ROUTES.home}>
          Be Celeb
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {navItems.map((item) => (
              <Link className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-ink" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.login}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              로그인
            </Link>
            <Link
              href={ROUTES.signup}
              className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
