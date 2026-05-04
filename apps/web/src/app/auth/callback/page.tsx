// Receives Supabase email auth redirects and renders callback status.
import Link from "next/link";
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

  return (
    <div className="mx-auto max-w-lg">
      <Card title="Supabase 인증 확인">
        <div className="space-y-5">
          <AuthCallbackClient
            code={firstParam(params.code)}
            error={firstParam(params.error)}
            errorDescription={firstParam(params.error_description)}
          />
          <Link className="inline-flex rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" href={ROUTES.dashboard}>
            대시보드로 이동
          </Link>
        </div>
      </Card>
    </div>
  );
}
