// Provides the global footer with product links and project messaging.
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ROUTES } from "@/constants/routes";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm text-slate-500 sm:px-6 md:grid-cols-[1.2fr_1fr_auto] lg:px-8">
        <div>
          <Link href={ROUTES.home}>
            <BrandLogo size="sm" />
          </Link>
          <p className="mt-3 max-w-xl leading-6">트렌드와 아이템을 콘텐츠 아이디어로 연결하는 크리에이터 리서치 서비스입니다.</p>
          <p className="mt-4 text-xs text-slate-400">© 2026 BE CELEB. All rights reserved.</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Product</p>
          <div className="mt-3 grid gap-2">
            <Link href={ROUTES.trends} className="hover:text-ink">트렌드</Link>
            <Link href={ROUTES.trendingItems} className="hover:text-ink">상점</Link>
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
