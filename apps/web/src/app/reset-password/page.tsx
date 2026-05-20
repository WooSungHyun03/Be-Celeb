"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    try {
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
      if (error) {
        throw error;
      }

      setStatus("success");
      setPassword("");
      setConfirmPassword("");
      setMessage("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
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
              새 비밀번호로
              <br />안전하게 다시 시작
            </h2>
            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-600">
              재설정 링크 인증이 완료된 상태에서만 새 비밀번호를 저장할 수 있습니다.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            비밀번호는 최소 8자 이상으로 설정해 주세요.
          </div>
        </aside>

        <section className="p-6 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Link className="inline-flex" href={ROUTES.home}>
              <BrandLogo />
            </Link>
          </div>

          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">새 비밀번호 설정</span>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-ink">새 비밀번호를 입력해 주세요.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            재설정 링크 인증이 만료되었다면 비밀번호 찾기를 다시 요청해 주세요.
          </p>

          <form className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/40 p-5 sm:p-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                autoComplete="new-password"
                label="새 비밀번호"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8자 이상"
                required
                type="password"
                value={password}
              />
              <Input
                autoComplete="new-password"
                label="새 비밀번호 확인"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="새 비밀번호를 한 번 더 입력"
                required
                type="password"
                value={confirmPassword}
              />
              {message ? (
                <p className={`text-sm font-medium ${status === "success" ? "text-emerald-700" : "text-rose-600"}`}>
                  {message}
                </p>
              ) : null}
              <Button className="min-h-11 w-full" disabled={status === "loading" || status === "success"} type="submit">
                {status === "loading" ? "저장 중..." : "새 비밀번호 저장"}
              </Button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
            <Link href={ROUTES.login} className="font-semibold text-ink hover:underline">
              로그인
            </Link>
            <span className="text-slate-300">|</span>
            <Link href={ROUTES.forgotPassword} className="font-semibold text-ink hover:underline">
              비밀번호 찾기 다시 요청
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
