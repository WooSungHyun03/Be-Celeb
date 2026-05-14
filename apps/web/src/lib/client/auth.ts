import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function getSupabaseAccessToken() {
  const {
    data: { session },
    error,
  } = await getSupabaseBrowserClient().auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return session?.access_token ?? null;
}

export async function getAuthorizationHeaders(): Promise<Record<string, string>> {
  const token = await getSupabaseAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function requireSupabaseSession() {
  const {
    data: { session },
    error,
  } = await getSupabaseBrowserClient().auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session) {
    throw new Error("로그인이 필요합니다.");
  }

  return session;
}
