"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { ROUTES } from "@/constants/routes";

export default function FindIdPage() {
  return (
    <div className="flex min-h-[720px] w-full items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#faf5ff_48%,#f8fafc_100%)] px-4 py-12 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-100/70 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden min-h-[620px] flex-col justify-between border-r border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] p-10 lg:flex">
          <Link className="inline-flex w-fit rounded-2xl bg-white px-3 py-2 shadow-sm" href={ROUTES.home}>
            <BrandLogo size="sm" />
          </Link>

          <div>
            <p className="text-sm font-bold uppercase text-violet-700">Account Recovery</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-ink">
              계정을 다시 찾는
              <br />가장 안전한 방법
            </h2>
            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-600">
              Be-Celeb 계정은 이메일 기반으로 관리됩니다. 보안을 위해 이메일 전체 조회 기능은 제공하지 않습니다.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            {["사용 가능한 이메일 확인", "비밀번호 재설정 요청", "메일 인증 후 로그인"].map((item, index) => (
              <div className="flex items-center gap-3 py-2" key={item}>
                <span className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white">
                  {index + 1}
                </span>
                <span className="text-sm font-bold text-ink">{item}</span>
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

          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">아이디 찾기</span>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-ink">가입 이메일을 확인해 주세요.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            사용 가능한 이메일이 기억나지 않는다면, 후보 이메일로 비밀번호 재설정을 요청해 메일 수신 여부를 확인할 수 있습니다.
          </p>

          <div className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/40 p-5 sm:p-6">
            <p className="text-sm leading-6 text-slate-600">
              계정 보호를 위해 닉네임이나 이름으로 이메일을 노출하지 않습니다. 가입한 이메일이 맞다면 재설정 안내 메일을 받을 수 있습니다.
            </p>
            <Link className="mt-5 block" href={ROUTES.forgotPassword}>
              <Button className="min-h-11 w-full">비밀번호 재설정으로 확인하기</Button>
            </Link>
          </div>

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
