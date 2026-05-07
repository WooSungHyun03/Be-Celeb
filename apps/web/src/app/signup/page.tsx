// Renders the signup page.
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[720px] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link className="mx-auto inline-flex items-center gap-2 text-base font-bold text-ink" href={ROUTES.home}>
            <span className="flex size-9 items-center justify-center rounded-md bg-ink text-xs text-white">BC</span>
            <span>BE CELEB</span>
          </Link>
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-ink">회원가입</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">필요한 정보만 입력하고 바로 시작하세요.</p>
        </div>

        <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-4">
            <Input label="Name" placeholder="BE CELEB" />
            <Input label="Email" placeholder="you@example.com" type="email" />
            <Input label="Password" placeholder="8자 이상" type="password" />
            <Input label="Confirm Password" placeholder="비밀번호 확인" type="password" />
            <Button className="min-h-11 w-full" type="button">회원가입</Button>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            이미 계정이 있나요?{" "}
            <Link href={ROUTES.login} className="font-semibold text-ink hover:underline">로그인</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
