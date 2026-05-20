"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

type IconName = "dashboard" | "trending" | "star" | "board" | "calendar" | "chart" | "shop" | "sparkles";

const navItems = [
  { href: ROUTES.dashboard, label: "대시보드", icon: "dashboard" as const },
  { href: ROUTES.trends, label: "트렌드", icon: "trending" as const },
  { href: ROUTES.favorites, label: "즐겨찾기", icon: "star" as const },
  { href: ROUTES.productionBoard, label: "제작 보드", icon: "board" as const },
  { href: ROUTES.calendar, label: "캘린더", icon: "calendar" as const },
  { href: ROUTES.growthReport, label: "성장 리포트", icon: "chart" as const },
  { href: ROUTES.trendingItems, label: "샵", icon: "shop" as const },
];

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      {name === "sparkles" ? (
        <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm6 12 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1L18 15Z" fill="currentColor" />
      ) : null}
      {name === "dashboard" ? (
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 0a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z" stroke="currentColor" strokeWidth="2" />
      ) : null}
      {name === "trending" ? (
        <path d="M4 16.5 9 11l4 3.5L20 7M15 7h5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      ) : null}
      {name === "star" ? (
        <path d="m12 4 2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 16l-4.6 2.4.9-5.2-3.8-3.7 5.2-.8L12 4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      ) : null}
      {name === "board" ? (
        <path d="M5 5h14v14H5V5Zm0 4h14M9 9v10m6-10v10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      ) : null}
      {name === "calendar" ? (
        <path d="M7 4v4M17 4v4M5 9h14M6.5 6h11A1.5 1.5 0 0 1 19 7.5v10A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-10A1.5 1.5 0 0 1 6.5 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      ) : null}
      {name === "chart" ? (
        <path d="M5 19V5m0 14h14M9 16v-5m4 5V8m4 8v-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      ) : null}
      {name === "shop" ? (
        <path d="M6 9h12l-1 10H7L6 9Zm2.5 0a3.5 3.5 0 0 1 7 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      ) : null}
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = getSupabaseBrowserClient();

      supabase.auth.getSession().then(({ data }) => {
        if (mounted) {
          setIsAuthenticated(Boolean(data.session));
        }
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setIsAuthenticated(Boolean(session));
        }
      });

      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      setIsAuthenticated(false);
    }

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 text-ink backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link className="flex shrink-0 items-center gap-2 transition hover:opacity-80" href={ROUTES.home}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-sm shadow-violet-200">
              <Icon className="h-5 w-5" name="sparkles" />
            </span>
            <span className="bg-gradient-to-r from-ink to-violet-700 bg-clip-text text-xl font-bold text-transparent">
              BE CELEB
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ href, label, icon }) => {
              const isActive = pathname === href;

              return (
                <Link
                  className={`group relative px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "text-violet-700"
                      : "text-slate-500 hover:text-violet-700"
                  }`}
                  href={href}
                  key={href}
                >
                  <span className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 transition ${isActive ? "text-violet-600" : "text-slate-400 group-hover:text-violet-600"}`} name={icon} />
                    <span>{label}</span>
                  </span>
                  <span
                    className={`absolute inset-x-3 bottom-0 h-0.5 origin-center rounded-full bg-violet-600 transition-transform duration-200 ${
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link className="hidden min-h-9 items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:text-ink sm:inline-flex" href={ROUTES.profile}>
                  계정
                </Link>
                <Link className="inline-flex min-h-9 items-center rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700" href={ROUTES.logout}>
                  로그아웃
                </Link>
              </>
            ) : (
              <>
                <Link className="hidden min-h-9 items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:text-ink sm:inline-flex" href={ROUTES.login}>
                  로그인
                </Link>
                <Link className="inline-flex min-h-9 items-center rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700" href={ROUTES.signup}>
                  시작하기
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 text-xs font-bold text-slate-500 sm:px-6 md:hidden">
        {navItems.map((item) => (
          <Link
            className={`relative inline-flex min-h-10 shrink-0 items-center gap-1.5 px-1 transition after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-center after:rounded-full after:bg-violet-600 after:transition-transform after:duration-200 ${
              pathname === item.href
                ? "text-violet-700 after:scale-x-100"
                : "hover:text-violet-700 after:scale-x-0 hover:after:scale-x-100"
            }`}
            href={item.href}
            key={item.href}
          >
            <Icon className="h-3.5 w-3.5" name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
