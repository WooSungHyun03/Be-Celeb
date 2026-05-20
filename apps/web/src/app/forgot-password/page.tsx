"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

function SparklesIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm6 12 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1L18 15Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-white bg-[radial-gradient(circle_at_top,#ede9fe_0%,rgba(237,233,254,0.72)_34%,transparent_68%)] px-4 py-12 text-ink">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/70">
        <div className="mb-8 text-center">
          <Link className="mb-6 inline-flex items-center gap-2 transition hover:opacity-80" href={ROUTES.home}>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-sm shadow-violet-200">
              <SparklesIcon />
            </span>
            <span className="bg-gradient-to-r from-ink to-violet-700 bg-clip-text text-2xl font-bold text-transparent">
              BE CELEB
            </span>
          </Link>
          <span className="mb-4 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
            비밀번호 찾기
          </span>
          <h1 className="mb-2 text-2xl font-black">재설정 링크를 보내드릴게요</h1>
          <p className="text-sm leading-6 text-slate-500">
            가입한 이메일을 입력하면 새 비밀번호를 설정할 수 있는 안내 메일을 보내드립니다.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="forgot-email">
            이메일
            <input
              autoComplete="email"
              className="mt-2 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              id="forgot-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
              type="email"
              value={email}
            />
          </label>

          {message ? (
            <p className={`rounded-lg px-3 py-2 text-sm font-medium ${status === "error" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}>
              {message}
            </p>
          ) : null}

          <Button
            className="min-h-11 w-full bg-violet-600 text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
            disabled={status === "loading"}
            type="submit"
          >
            {status === "loading" ? "발송 중..." : "재설정 안내 받기"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-500">계정이 기억나셨나요?</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
          <Link href={ROUTES.login} className="font-semibold text-violet-700 hover:underline">
            로그인
          </Link>
          <span className="text-slate-300">|</span>
          <Link href={ROUTES.findId} className="font-semibold text-violet-700 hover:underline">
            아이디 찾기
          </Link>
          <span className="text-slate-300">|</span>
          <Link href={ROUTES.signup} className="font-semibold text-violet-700 hover:underline">
            회원가입
          </Link>
        </div>
      </section>
    </div>
  );
}
