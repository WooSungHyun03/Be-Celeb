// Prepares a lazy Supabase browser client using public anon credentials only.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/config/env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!hasSupabasePublicEnv()) {
    throw new Error("로그인 설정을 확인하지 못했습니다. 관리자에게 문의해 주세요.");
  }

  const { supabaseAnonKey, supabaseUrl } = getSupabasePublicEnv();

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
