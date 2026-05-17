"use client";

// Renders the password recovery page and sends reset email requests.
import { FormEvent, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";

type ApiErrorResponse = {
  success: false;
  message?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorResponse;
        throw new Error(payload.message ?? "Failed to send reset password email.");
      }

      setStatus("success");
      setMessage("가입 여부와 관계없이 입력한 이메일로 재설정 안내를 보냈어요.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "재설정 요청 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
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
              안전하게 인증하고
              <br />
              새 비밀번호로 시작
            </h2>
            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-600">
              가입 이메일로 재설정 안내를 보내고, 인증 링크는 제한된 시간 동안만 유효합니다.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              ["인증 메일 발송", "가입 이메일로 재설정 링크를 보내요."],
              ["보안 링크 확인", "링크는 제한 시간 후 자동 만료돼요."],
              ["새 비밀번호 설정", "다시 로그인하고 서비스를 이어가요."],
            ].map(([title, description]) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={title}>
                <p className="text-sm font-black text-ink">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
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
            <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">비밀번호 찾기</span>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-ink">재설정 링크를 보내드릴게요.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              가입한 이메일 주소를 입력하면 비밀번호 재설정 안내를 받을 수 있어요.
            </p>
          </div>

          <form className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6" onSubmit={handleSubmit}>
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
              {message ? (
                <p className={`text-sm font-medium ${status === "error" ? "text-rose-600" : "text-slate-700"}`}>
                  {message}
                </p>
              ) : null}
              <Button
                className="min-h-11 w-full bg-violet-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_22px_rgba(124,58,237,0.20)] hover:bg-violet-700"
                disabled={status === "loading"}
                type="submit"
              >
                {status === "loading" ? "발송 중..." : "재설정 안내 받기"}
              </Button>
            </div>

            <div className="mt-5 rounded-xl border border-violet-100 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
              가입 여부는 노출하지 않습니다. 메일이 보이지 않는다면 스팸함을 확인해 주세요.
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
