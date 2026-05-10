// Renders the account ID recovery page.
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";

export default function FindIdPage() {
  return (
    <div className="mx-auto flex min-h-[720px] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="hidden min-h-[620px] flex-col justify-between border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_58%,#f5f3ff_100%)] p-10 text-ink lg:flex">
          <Link className="inline-flex w-fit rounded-2xl bg-white/95 px-3 py-2" href={ROUTES.home}>
            <BrandLogo size="sm" />
          </Link>

          <div>
            <p className="text-sm font-bold uppercase text-violet-700">Account Recovery</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight">
              계정을 다시 찾는
              <br />
              가장 빠른 방법
            </h2>
            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-600">
              가입 정보와 일치하는 계정을 확인하고, 로그인으로 바로 이어질 수 있게 안내합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4">
              {["가입 정보 입력", "계정 이메일 확인", "로그인으로 이동"].map((item, index) => (
                <div className="flex items-center gap-3" key={item}>
                  <span className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white shadow-sm">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-ink">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="p-6 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Link className="inline-flex" href={ROUTES.home}>
              <BrandLogo />
            </Link>
          </div>

          <div>
            <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">아이디 찾기</span>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-ink">가입한 계정을 확인해드릴게요.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              가입 시 입력한 이름과 휴대폰 번호를 입력하면, 일치하는 계정 이메일을 안내합니다.
            </p>
          </div>

          <form className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
            <div className="space-y-4">
              <Input label="Name" placeholder="이름을 입력하세요" />
              <Input label="Phone" placeholder="010-0000-0000" type="tel" />
              <Button className="min-h-11 w-full bg-violet-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_22px_rgba(124,58,237,0.20)] hover:bg-violet-700" type="button">
                아이디 확인하기
              </Button>
            </div>

            <div className="mt-5 rounded-xl border border-violet-100 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
              입력한 정보는 계정 확인 용도로만 사용되며, 결과는 일부 마스킹되어 표시됩니다.
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <Link href={ROUTES.login} className="font-semibold text-ink hover:underline">
              로그인
            </Link>
            <span className="text-slate-300">|</span>
            <Link href={ROUTES.forgotPassword} className="font-semibold text-ink hover:underline">
              비밀번호 찾기
            </Link>
            <span className="text-slate-300">|</span>
            <Link href={ROUTES.signup} className="font-semibold text-ink hover:underline">
              회원가입
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
