"use client";

// Renders the account ID recovery page and connects it to the auth API.
import { FormEvent, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";

type FindIdSuccessResponse = {
  success: true;
  data: {
    found: boolean;
    emailHint: string | null;
    nickname: string | null;
  };
};

type ApiErrorResponse = {
  success: false;
  message?: string;
  code?: string;
};

export default function FindIdPage() {
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const error = payload as ApiErrorResponse;
        setStatus("error");
        setMessage(error.message ?? "계정을 찾지 못했어요.");
        return;
      }

      const result = payload as FindIdSuccessResponse;

      if (result.data.found && result.data.emailHint) {
        setStatus("success");
        setMessage(`가입된 이메일은 ${result.data.emailHint} 입니다.`);
        return;
      }

      setStatus("success");
      setMessage("입력한 닉네임과 일치하는 계정을 찾지 못했어요.");
    } catch {
      setStatus("error");
      setMessage("계정 확인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
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
            <p className="text-sm font-bold uppercase text-violet-700">Account Recovery</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight">
              계정을 다시 찾는
              <br />
              가장 빠른 방법
            </h2>
            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-600">
              가입 닉네임과 일치하는 계정을 확인하고, 이메일은 일부만 표시합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4">
              {["닉네임 입력", "마스킹된 이메일 확인", "로그인으로 이동"].map((item, index) => (
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
              가입할 때 사용한 닉네임을 입력하면 마스킹된 이메일을 안내합니다.
            </p>
          </div>

          <form className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                autoComplete="nickname"
                label="Nickname"
                onChange={(event) => setNickname(event.target.value)}
                placeholder="가입 닉네임"
                required
                value={nickname}
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
                {status === "loading" ? "확인 중..." : "아이디 확인하기"}
              </Button>
            </div>

            <div className="mt-5 rounded-xl border border-violet-100 bg-white px-4 py-3 text-xs leading-5 text-slate-500">
              계정 보호를 위해 이메일은 일부만 표시됩니다.
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
