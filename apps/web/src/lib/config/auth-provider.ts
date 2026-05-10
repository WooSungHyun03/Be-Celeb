export type AuthProvider = "supabase" | "json" | "unavailable";

export function getAuthProvider(): AuthProvider {
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (hasSupabaseEnv) {
    return "supabase";
  }

  if (process.env.NODE_ENV !== "production") {
    return "json";
  }

  return "unavailable";
}

export function getAuthProviderUnavailableMessage() {
  return "Authentication provider is unavailable. Configure Supabase environment variables.";
}
