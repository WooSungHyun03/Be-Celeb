// Renders the signup placeholder page for future Supabase Auth work.
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card title="회원가입">
        <div className="space-y-4">
          <Input label="이메일" placeholder="you@example.com" type="email" />
          <Input label="비밀번호" placeholder="8자 이상" type="password" />
          <Input label="계정명" placeholder="be_celeb_creator" />
          <Button className="w-full" type="button">
            Mock 가입
          </Button>
          <p className="text-sm text-slate-500">TODO: Supabase Auth signUp 연동 예정</p>
        </div>
      </Card>
    </div>
  );
}
