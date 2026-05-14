"use client";

// Exchanges Supabase email auth callback codes in the browser.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthCallbackClientProps = {
  code?: string;
  error?: string;
  errorDescription?: string;
  nextPath?: string;
};

function getSafeNextPath(nextPath: string | undefined) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  return nextPath;
}

export function AuthCallbackClient({ code, error, errorDescription, nextPath }: AuthCallbackClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("인증 상태를 확인하고 있어요.");

  useEffect(() => {
    async function exchangeSession() {
      if (error) {
        setStatus("error");
        setMessage(errorDescription ?? error);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("Supabase 인증 코드가 없습니다.");
        return;
      }

      setStatus("loading");

      try {
        const { error: exchangeError } = await getSupabaseBrowserClient().auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setStatus("error");
          setMessage(exchangeError.message);
          return;
        }

        setStatus("success");
        setMessage("인증이 완료됐어요. 잠시 후 이동합니다.");

        const safeNextPath = getSafeNextPath(nextPath);

        router.replace(safeNextPath ?? ROUTES.dashboard);
      } catch (exchangeError) {
        setStatus("error");
        setMessage(exchangeError instanceof Error ? exchangeError.message : "알 수 없는 인증 오류입니다.");
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
