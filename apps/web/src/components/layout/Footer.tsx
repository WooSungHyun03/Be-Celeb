"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";

function SparklesIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm6 12 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1L18 15Z" fill="currentColor" />
    </svg>
  );
}

export function Footer() {
  const pathname = usePathname();
  const shouldHideFooter = pathname === ROUTES.productionBoard || pathname.startsWith(`${ROUTES.productionBoard}/`);

  if (shouldHideFooter) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-500">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1.2fr_1fr_auto] lg:px-8">
        <div>
          <Link className="inline-flex items-center gap-2 transition hover:opacity-80" href={ROUTES.home}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-sm shadow-violet-200">
              <SparklesIcon />
            </span>
            <span className="bg-gradient-to-r from-ink to-violet-700 bg-clip-text text-xl font-bold text-transparent">
              BE CELEB
            </span>
          </Link>
          <p className="mt-3 max-w-xl leading-6">
            트렌드와 채널 데이터를 콘텐츠 아이디어로 연결하는 AI 크리에이터 리서치 서비스입니다.
          </p>
          <p className="mt-4 text-xs text-slate-400">© 2026 BE CELEB. All rights reserved.</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Product</p>
          <div className="mt-3 grid gap-2">
            <Link href={ROUTES.trends} className="hover:text-ink">트렌드</Link>
            <Link href={ROUTES.trendingItems} className="hover:text-ink">샵</Link>
            <Link href={ROUTES.recommendations} className="hover:text-ink">추천</Link>
            <Link href={ROUTES.pricing} className="hover:text-ink">요금</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold text-ink">Account</p>
          <div className="mt-3 grid gap-2">
            <Link href={ROUTES.login} className="hover:text-ink">로그인</Link>
            <Link href={ROUTES.signup} className="hover:text-ink">회원가입</Link>
            <Link href={ROUTES.profile} className="hover:text-ink">마이페이지</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
