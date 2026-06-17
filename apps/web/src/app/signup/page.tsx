"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import { getSafeNextPath } from "@/lib/navigation/safe-next-path";

function SparklesIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm6 12 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1L18 15Z" fill="currentColor" />
    </svg>
  );
}

type FieldProps = {
  autoComplete: string;
  id: string;
  label: string;
  minLength?: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  value: string;
};

function Field({ autoComplete, id, label, minLength, onChange, placeholder, type = "text", value }: FieldProps) {
  return (
    <label className="block text-sm font-semibold text-slate-700" htmlFor={id}>
      {label}
      <input
        autoComplete={autoComplete}
        className="mt-2 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
        id={id}
        minLength={minLength}
        onChange={onChange}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setStatus("loading");

    try {
      const supabase = getSupabaseBrowserClient();
      const nextPath = getSafeNextPath(new URL(window.location.href).searchParams.get("next"), ROUTES.dashboard);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        setStatus("success");
        setMessage(`${email} 주소로 인증 메일을 보냈습니다. 메일함에서 인증을 완료해 주세요.`);
        return;
      }

      if (data.user) {
        await supabase.from("profiles").upsert(
          {
            user_id: data.user.id,
            nickname,
            onboarding_completed: false,
            is_deleted: false,
          },
          { onConflict: "user_id" },
        );
      }

      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
          <h1 className="mb-2 text-2xl font-black">무료로 시작하세요</h1>
          <p className="text-slate-500">채널에 맞는 콘텐츠 추천을 바로 받아보세요</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field
            autoComplete="nickname"
            id="nickname"
            label="닉네임"
            minLength={2}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="BE CELEB"
            value={nickname}
          />
          <Field
            autoComplete="email"
            id="email"
            label="이메일"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
          <Field
            autoComplete="new-password"
            id="password"
            label="비밀번호"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8자 이상"
            type="password"
            value={password}
          />
          <Field
            autoComplete="new-password"
            id="confirm-password"
            label="비밀번호 확인"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="비밀번호 확인"
            type="password"
            value={confirmPassword}
          />

          {message ? (
            <p className={`text-sm font-medium ${status === "success" ? "text-violet-700" : "text-rose-600"}`}>
              {message}
            </p>
          ) : null}

          <Button
            className="min-h-11 w-full bg-violet-600 text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
            disabled={status === "loading"}
            type="submit"
          >
            {status === "loading" ? "가입 중..." : "회원가입"}
          </Button>
          <p className="text-center text-xs leading-5 text-slate-500">
            가입하면{" "}
            <Link className="font-semibold text-violet-700 hover:underline" href={ROUTES.terms}>
              이용약관
            </Link>
            과{" "}
            <Link className="font-semibold text-violet-700 hover:underline" href={ROUTES.privacy}>
              개인정보처리방침
            </Link>
            에 동의한 것으로 간주됩니다.
          </p>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-500">또는</span>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link href={ROUTES.login} className="font-semibold text-violet-700 hover:underline">
            로그인
          </Link>
        </p>
      </section>
    </div>
  );
}
