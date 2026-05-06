// Renders the login placeholder page for future Supabase Auth work.
import Link from "next/link";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { ROUTES } from "@/constants/routes";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Welcome back</p>
            <h1 className="mt-3 text-3xl font-semibold text-ink">로그인</h1>
            <p className="mt-2 text-sm text-slate-500">계정으로 안전하게 접속하고 개인화된 추천을 받아보세요.</p>
          </div>

          <div className="space-y-4">
            <Input label="이메일" placeholder="you@example.com" type="email" />
            <Input label="비밀번호" placeholder="8자 이상" type="password" />
            <Button className="w-full" type="button">
              로그인
            </Button>
          </div>

          <p className="text-center text-sm text-slate-500">
            아직 계정이 없으신가요?{' '}
            <Link href={ROUTES.signup} className="font-semibold text-ink hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
