"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const redirectTo = `${window.location.origin}/api/auth/reset-password/callback`;
      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        throw new Error("비밀번호 재설정 메일을 보내지 못했습니다.");
      }

      setStatus("success");
      setMessage("입력한 이메일로 비밀번호 재설정 안내를 보냈습니다. 메일함을 확인해 주세요.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "재설정 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="flex min-h-[720px] w-full items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#faf5ff_48%,#f8fafc_100%)] px-4 py-12 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-xl shadow-violet-100/70 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden min-h-[620px] flex-col justify-between border-r border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] p-10 lg:flex">
          <Link className="inline-flex w-fit rounded-2xl bg-white px-3 py-2 shadow-sm" href={ROUTES.home}>
            <BrandLogo size="sm" />
          </Link>

          <div>
            <p className="text-sm font-bold uppercase text-violet-700">Password Reset</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-ink">
              안전하게 인증하고
              <br />새 비밀번호로 시작하세요
            </h2>
            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-600">
              가입한 이메일로 재설정 링크를 보내드립니다. 링크는 보안을 위해 제한된 시간 동안만 사용할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-3">
            {["인증 메일 발송", "메일 링크 확인", "새 비밀번호 설정"].map((item, index) => (
              <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm" key={item}>
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

          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">비밀번호 찾기</span>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-ink">재설정 링크를 보내드릴게요.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            가입한 이메일 주소를 입력하면 비밀번호를 다시 설정할 수 있는 안내 메일을 받을 수 있습니다.
          </p>

          <form className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/40 p-5 sm:p-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                autoComplete="email"
                label="이메일"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
              {message ? (
                <p className={`text-sm font-medium ${status === "error" ? "text-rose-600" : "text-emerald-700"}`}>
                  {message}
                </p>
              ) : null}
              <Button className="min-h-11 w-full" disabled={status === "loading"} type="submit">
                {status === "loading" ? "발송 중..." : "재설정 안내 받기"}
              </Button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <Link href={ROUTES.login} className="font-semibold text-ink hover:underline">
              로그인
            </Link>
            <span className="text-slate-300">|</span>
            <Link href={ROUTES.findId} className="font-semibold text-ink hover:underline">
              아이디 찾기
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
