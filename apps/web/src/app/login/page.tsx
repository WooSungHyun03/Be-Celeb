// Renders the login page.
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[680px] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link className="mx-auto inline-flex" href={ROUTES.home}>
            <BrandLogo />
          </Link>
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-ink">로그인</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">계정으로 로그인하고 콘텐츠 보드를 이어서 확인하세요.</p>
        </div>

        <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-4">
            <Input label="Email" placeholder="you@example.com" type="email" />
            <Input label="Password" placeholder="8자 이상" type="password" />
            <Button className="min-h-11 w-full" type="button">로그인</Button>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-500">
            <Link href={ROUTES.signup} className="font-semibold text-ink hover:underline">회원가입</Link>
            <button className="font-medium hover:text-ink" type="button">비밀번호 찾기</button>
          </div>
        </form>
      </div>
    </div>
  );
}
