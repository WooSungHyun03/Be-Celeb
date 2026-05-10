// Renders the signup page.
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-[760px] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="hidden min-h-[660px] flex-col justify-between border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_58%,#f5f3ff_100%)] p-10 text-ink lg:flex">
          <Link className="inline-flex w-fit rounded-2xl bg-white/95 px-3 py-2" href={ROUTES.home}>
            <BrandLogo size="sm" />
          </Link>

          <div>
            <p className="text-sm font-bold uppercase text-violet-700">Join Be Celeb</p>
            <h2 className="mt-4 text-[2.35rem] font-black leading-tight tracking-tight">
              내 계정에 맞는
              <br />
              <span className="whitespace-nowrap">콘텐츠 전략을 시작하세요</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-600">
              가입 후 관심 카테고리를 선택하면 트렌드, 인기템, 릴스 아이디어를 한 화면에서 확인할 수 있어요.
            </p>
          </div>

          <div className="mb-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {["계정 생성", "관심사 설정", "추천 보드 확인"].map((item, index) => (
              <div className="flex items-center gap-3" key={item}>
                <span className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white shadow-sm">
                  {index + 1}
                </span>
                <span className="text-sm font-bold">{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="p-6 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Link className="inline-flex" href={ROUTES.home}>
              <BrandLogo />
            </Link>
          </div>

          <div>
            <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">회원가입</span>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-ink">필요한 정보만 입력하세요.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">계정을 만들고 나에게 맞는 콘텐츠 추천을 바로 시작하세요.</p>
          </div>

          <form className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
            <div className="space-y-4">
              <Input label="Name" placeholder="BE CELEB" />
              <Input label="Email" placeholder="you@example.com" type="email" />
              <Input label="Password" placeholder="8자 이상" type="password" />
              <Input label="Confirm Password" placeholder="비밀번호 확인" type="password" />
              <Button className="min-h-11 w-full bg-violet-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_22px_rgba(124,58,237,0.20)] hover:bg-violet-700" type="button">
                회원가입
              </Button>
            </div>

            <p className="mt-5 text-center text-sm text-slate-500">
              이미 계정이 있나요?{" "}
              <Link href={ROUTES.login} className="font-semibold text-ink hover:underline">
                로그인
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
