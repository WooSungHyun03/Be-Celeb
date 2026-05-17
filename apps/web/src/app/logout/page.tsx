"use client";

// Signs the user out and gives a clear logout status page.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";

type LogoutState = "loading" | "success" | "error";

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<LogoutState>("loading");
  const [message, setMessage] = useState("로그아웃을 처리하고 있어요.");

  useEffect(() => {
    async function logout() {
      try {
        const { error } = await getSupabaseBrowserClient().auth.signOut();

        if (error) {
          throw new Error(error.message);
        }

        setStatus("success");
        setMessage("로그아웃이 완료됐어요. 잠시 후 로그인 페이지로 이동합니다.");
        router.refresh();

        window.setTimeout(() => {
          router.replace(ROUTES.login);
        }, 900);
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "로그아웃에 실패했어요. 네트워크 상태를 확인해주세요.");
      }
    }

    void logout();
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[640px] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/70">
        <Link className="mx-auto inline-flex rounded-2xl bg-white px-3 py-2" href={ROUTES.home}>
          <BrandLogo size="sm" />
        </Link>
        <div className="mx-auto mt-8 flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-2xl">
          {status === "loading" ? "…" : status === "success" ? "✓" : "!"}
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-ink">
          {status === "success" ? "로그아웃 완료" : status === "error" ? "로그아웃 실패" : "로그아웃 중"}
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{message}</p>
        <div className="mt-7 grid gap-2">
          {status === "error" ? (
            <Button
              className="min-h-11 w-full bg-violet-600 hover:bg-violet-700"
              onClick={() => window.location.reload()}
              type="button"
            >
              다시 시도
            </Button>
          ) : null}
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
            href={ROUTES.login}
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </section>
    </div>
  );
}
