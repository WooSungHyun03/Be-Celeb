import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getFrontendUrl(requestUrl: URL, path: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return new URL(path, siteUrl || requestUrl.origin);
}

function redirectWithError(requestUrl: URL, message: string) {
  const fallbackUrl = getFrontendUrl(requestUrl, "/auth/callback");
  fallbackUrl.searchParams.set("error", "auth_callback_error");
  fallbackUrl.searchParams.set("error_description", message);
  return NextResponse.redirect(fallbackUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
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

  return NextResponse.redirect(getFrontendUrl(requestUrl, "/reset-password"));
}
