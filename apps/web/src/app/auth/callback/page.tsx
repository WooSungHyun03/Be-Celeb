// Receives Supabase email auth redirects and renders callback status.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/common/Card";
import { AuthCallbackClient } from "@/app/auth/callback/AuthCallbackClient";
import { ROUTES } from "@/constants/routes";

type AuthCallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthCallbackPage({ searchParams }: AuthCallbackPageProps) {
  const params = await searchParams;
  const code = firstParam(params.code);
  const error = firstParam(params.error);
  const errorDescription = firstParam(params.error_description);
  const nextPath = firstParam(params.next);

  if (code) {
    const callbackParams = new URLSearchParams({ code });

    if (nextPath) {
      callbackParams.set("next", nextPath);
    }

    redirect(`/api/auth/callback?${callbackParams.toString()}`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card title="인증 확인">
        <div className="space-y-5">
          <AuthCallbackClient
            error={error}
            errorDescription={errorDescription}
            nextPath={nextPath}
          />
          <Link className="inline-flex rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" href={ROUTES.dashboard}>
            대시보드로 이동
          </Link>
        </div>
      </Card>
    </div>
  );
}
