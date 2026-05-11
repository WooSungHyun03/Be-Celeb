"use client";

// Renders the login page and connects it to the auth API.
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";

type ApiErrorResponse = {
  success: false;
  message?: string;
  code?: string;
};

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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const error = payload as ApiErrorResponse;
        setStatus("error");
        setMessage(error.message ?? "로그인에 실패했어요.");
        return;
      }

      router.push(ROUTES.dashboard);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("로그인에 실패했어요. 잠시 후 다시 시도해주세요.");
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
            <p className="text-sm font-bold uppercase text-violet-700">Welcome Back</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight">
              오늘의 트렌드를
              <br />
              바로 이어서 확인하세요
            </h2>
            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-600">
              저장한 추천 콘텐츠와 대시보드를 한 번에 확인하고, 다음 릴스 아이디어를 빠르게 정리하세요.
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {["트렌드 분석", "맞춤 추천", "콘텐츠 보드"].map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <span className="size-2.5 rounded-full bg-violet-600" />
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
            <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              로그인
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-ink">다시 오신 걸 환영해요.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              계정으로 로그인하고 콘텐츠 보드를 이어서 확인하세요.
            </p>
          </div>
          <form
            className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6"
            onSubmit={handleSubmit}
          >
            <div className="space-y-4">
              <Input
                autoComplete="email"
                label="Email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
              <Input
                autoComplete="current-password"
                label="Password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8자 이상"
                required
                type="password"
                value={password}
              />
              {message ? <p className="text-sm font-medium text-rose-600">{message}</p> : null}
              <Button
                className="min-h-11 w-full bg-violet-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_22px_rgba(124,58,237,0.20)] hover:bg-violet-700"
                disabled={status === "loading"}
                type="submit"
              >
                {status === "loading" ? "로그인 중..." : "로그인"}
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <Link href={ROUTES.signup} className="font-semibold text-ink hover:underline">
                회원가입
              </Link>
              <div className="flex items-center gap-2">
                <Link href={ROUTES.findId} className="font-medium hover:text-ink">
                  아이디 찾기
                </Link>
                <span className="text-slate-300">|</span>
                <Link href={ROUTES.forgotPassword} className="font-medium hover:text-ink">
                  비밀번호 찾기
                </Link>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
