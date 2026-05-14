"use client";

// Lets a user set a new password after a Supabase recovery link is exchanged.
import { FormEvent, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";
import { apiFetch } from "@/lib/client/api";

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
      setMessage("새 비밀번호가 서로 일치하지 않아요.");
      return;
    }

    try {
      await apiFetch("/api/auth/update-password", {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });

      setStatus("success");
      setPassword("");
      setConfirmPassword("");
      setMessage("비밀번호가 변경됐어요. 새 비밀번호로 로그인해 주세요.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "비밀번호 변경 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="mx-auto flex min-h-[720px] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="hidden min-h-[620px] flex-col justify-between border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_58%,#f5f3ff_100%)] p-10 text-ink lg:flex">
          <Link className="inline-flex w-fit rounded-2xl bg-white/95 px-3 py-2" href={ROUTES.home}>
            <BrandLogo size="sm" />
          </Link>

          <div>
            <p className="text-sm font-bold uppercase text-violet-700">Password Reset</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight">
              새 비밀번호로
              <br />
              안전하게 다시 시작
            </h2>
            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-600">
              재설정 링크 인증이 끝난 뒤 새 비밀번호를 저장합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            비밀번호는 최소 8자 이상으로 설정해 주세요.
          </div>
        </aside>

        <section className="p-6 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Link className="inline-flex" href={ROUTES.home}>
              <BrandLogo />
            </Link>
          </div>

          <div>
            <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              새 비밀번호 설정
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-ink">새 비밀번호를 입력해 주세요.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              재설정 링크 인증이 만료되었다면 비밀번호 찾기를 다시 요청해 주세요.
            </p>
          </div>

          <form className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                autoComplete="new-password"
                label="New Password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8자 이상"
                required
                type="password"
                value={password}
              />
              <Input
                autoComplete="new-password"
                label="Confirm Password"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="새 비밀번호 확인"
                required
                type="password"
                value={confirmPassword}
              />
              {message ? (
                <p className={`text-sm font-medium ${status === "success" ? "text-emerald-700" : "text-rose-600"}`}>
                  {message}
                </p>
              ) : null}
              <Button
                className="min-h-11 w-full bg-violet-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_22px_rgba(124,58,237,0.20)] hover:bg-violet-700"
                disabled={status === "loading" || status === "success"}
                type="submit"
              >
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
