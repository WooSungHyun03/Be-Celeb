import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function getSupabaseAccessToken() {
  let sessionResult;

  try {
    sessionResult = await getSupabaseBrowserClient().auth.getSession();
  } catch {
    return null;
  }

  const {
    data: { session },
    error,
  } = sessionResult;

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
  let sessionResult;

  try {
    sessionResult = await getSupabaseBrowserClient().auth.getSession();
  } catch {
    throw new Error("Supabase auth is not configured for this local environment.");
  }

  const {
    data: { session },
    error,
  } = sessionResult;

  if (error) {
    throw new Error(error.message);
  }

  if (!session) {
    throw new Error("로그인이 필요합니다.");
  }

  return session;
}
