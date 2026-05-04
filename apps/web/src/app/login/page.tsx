// Renders the login placeholder page for future Supabase Auth work.
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card title="로그인">
        <div className="space-y-4">
          <Input label="이메일" placeholder="you@example.com" type="email" />
          <Input label="비밀번호" placeholder="Supabase Auth 연동 예정" type="password" />
          <Button className="w-full" type="button">
            Mock 로그인
          </Button>
          <p className="text-sm text-slate-500">TODO: Supabase Auth signInWithPassword 연동 예정</p>
        </div>
      </Card>
    </div>
  );
}
