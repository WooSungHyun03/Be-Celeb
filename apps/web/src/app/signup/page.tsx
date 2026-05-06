// Renders the signup placeholder page for future Supabase Auth work.
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Create account</p>
            <h1 className="mt-3 text-3xl font-semibold text-ink">회원가입</h1>
            <p className="mt-2 text-sm text-slate-500">Be Celeb과 함께 성장할 계정을 만들어보세요.</p>
          </div>

          <div className="space-y-4">
            <Input label="이메일" placeholder="you@example.com" type="email" />
            <Input label="비밀번호" placeholder="8자 이상" type="password" />
            <Input label="계정명" placeholder="be_celeb_creator" />
            <Button className="w-full" type="button">
              회원가입
            </Button>
          </div>

          <p className="text-center text-sm text-slate-500">
            이미 계정이 있으신가요?{' '}
            <Link href={ROUTES.login} className="font-semibold text-ink hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
