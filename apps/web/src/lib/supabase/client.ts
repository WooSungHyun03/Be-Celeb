// Prepares a lazy Supabase browser client using public anon credentials only.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/config/env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!hasSupabasePublicEnv()) {
    throw new Error("Supabase auth is not configured for this local environment.");
  }

  const { supabaseAnonKey, supabaseUrl } = getSupabasePublicEnv();

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
