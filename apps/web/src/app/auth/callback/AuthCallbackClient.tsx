"use client";

// Exchanges Supabase email auth callback codes in the browser.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import { getSafeNextPath } from "@/lib/navigation/safe-next-path";

type AuthCallbackClientProps = {
  code?: string;
  error?: string;
  errorDescription?: string;
  nextPath?: string;
};

export function AuthCallbackClient({ code, error, errorDescription, nextPath }: AuthCallbackClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("인증 상태를 확인하고 있어요.");

  useEffect(() => {
    async function exchangeSession() {
      if (error) {
        setStatus("error");
        setMessage(errorDescription ?? "인증 요청을 완료하지 못했습니다. 다시 로그인해 주세요.");
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("인증 링크가 유효하지 않거나 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }

      setStatus("loading");

      try {
        const { error: exchangeError } = await getSupabaseBrowserClient().auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setStatus("error");
          setMessage("인증 링크가 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.");
          return;
        }

        setStatus("success");
        setMessage("인증이 완료됐어요. 잠시 후 이동합니다.");

        router.replace(getSafeNextPath(nextPath, ROUTES.dashboard));
      } catch (exchangeError) {
        setStatus("error");
        setMessage("인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }

    void exchangeSession();
  }, [code, error, errorDescription, nextPath, router]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">상태: {status}</p>
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}
