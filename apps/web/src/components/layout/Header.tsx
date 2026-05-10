"use client";

// Provides the global navigation header for App Router pages.
import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const navItems = [
  { href: ROUTES.dashboard, label: "대시보드" },
  { href: ROUTES.trends, label: "트렌드" },
  { href: ROUTES.trendingItems, label: "인기템" },
  { href: ROUTES.recommendations, label: "추천" },
  { href: ROUTES.pricing, label: "요금" },
  { href: ROUTES.profile, label: "마이페이지" },
];

function LoginIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M15 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 19.25c.8-3.1 3.18-5 7-5s6.2 1.9 7 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SignupIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M14.5 7.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4.75 19.25c.72-3 3.02-5 6.75-5 1.4 0 2.58.28 3.55.8M18.25 13v6.5M15 16.25h6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function Header() {
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto grid min-h-14 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-1.5 sm:px-6 lg:px-8">
        <Link className="group justify-self-start transition duration-200 hover:-translate-y-0.5" href={ROUTES.home}>
          <BrandLogo className="transition duration-200 group-hover:scale-[1.02]" size="sm" />
        </Link>
        <nav className="hidden items-center gap-1.5 justify-self-center text-sm font-medium text-slate-600 lg:flex">
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
        <div className="flex items-center justify-end gap-2">
          {isAuthenticated ? (
            <>
              <Link
                href={ROUTES.profile}
                className="hidden min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 sm:inline-flex"
              >
                <span aria-hidden="true">♙</span>
                마이페이지
              </Link>
              <Link
                href={ROUTES.dashboard}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-violet-200 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-lg active:translate-y-0"
              >
                <span aria-hidden="true">▦</span>
                대시보드
              </Link>
            </>
          ) : (
            <>
              <Link
                href={ROUTES.login}
                className="hidden min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:translate-y-0 sm:inline-flex"
              >
                <LoginIcon />
                로그인
              </Link>
              <Link
                href={ROUTES.signup}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-violet-200 transition duration-200 hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-lg active:translate-y-0"
              >
                <SignupIcon />
                회원가입
              </Link>
            </>
          )}
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
