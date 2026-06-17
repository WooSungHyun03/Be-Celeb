import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectWithError(requestUrl: URL) {
  const fallbackUrl = new URL("/auth/callback", requestUrl.origin);
  fallbackUrl.searchParams.set("error", "auth_callback_error");
  fallbackUrl.searchParams.set("error_description", "비밀번호 재설정 인증을 완료하지 못했습니다. 다시 요청해 주세요.");
  return NextResponse.redirect(fallbackUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");

  if (providerError) {
    return redirectWithError(requestUrl);
  }

  if (!code) {
    return redirectWithError(requestUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectWithError(requestUrl);
  }

  return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
}
