"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

function SparklesIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm6 12 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1L18 15Z" fill="currentColor" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
      }

      router.push(ROUTES.dashboard);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
          <h1 className="mb-2 text-2xl font-black">다시 오신 걸 환영해요</h1>
          <p className="text-slate-500">계속해서 콘텐츠를 확인하세요</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
            이메일
            <input
              autoComplete="email"
              className="mt-2 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
              type="email"
              value={email}
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">비밀번호</span>
              <Link className="text-sm font-medium text-violet-700 hover:underline" href={ROUTES.forgotPassword}>
                비밀번호 찾기
              </Link>
            </div>
            <input
              autoComplete="current-password"
              className="block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
              id="password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              type="password"
              value={password}
            />
          </div>

          {message ? <p className="text-sm font-medium text-rose-600">{message}</p> : null}

          <Button
            className="min-h-11 w-full bg-violet-600 text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
            disabled={status === "loading"}
            type="submit"
          >
            {status === "loading" ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-500">또는</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-500">
            아직 계정이 없으신가요?{" "}
            <Link className="font-semibold text-violet-700 hover:underline" href={ROUTES.signup}>
              회원가입
            </Link>
          </p>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex justify-center gap-6 text-xs text-slate-500">
            <Link className="transition hover:text-ink" href={ROUTES.home}>
              이용약관
            </Link>
            <Link className="transition hover:text-ink" href={ROUTES.home}>
              개인정보처리방침
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
