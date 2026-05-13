import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_NEXT_PATH = "/dashboard";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_NEXT_PATH;
  }

  return value;
}

function redirectWithError(requestUrl: URL, message: string) {
  const fallbackUrl = new URL("/auth/callback", requestUrl.origin);
  fallbackUrl.searchParams.set("error", "auth_callback_error");
  fallbackUrl.searchParams.set("error_description", message);
  return NextResponse.redirect(fallbackUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const providerError = requestUrl.searchParams.get("error");
  const providerErrorDescription = requestUrl.searchParams.get("error_description");

  if (providerError) {
    return redirectWithError(requestUrl, providerErrorDescription ?? providerError);
  }

  if (!code) {
    return redirectWithError(requestUrl, "Supabase authentication code is missing.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectWithError(requestUrl, error.message);
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
