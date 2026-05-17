// Centralizes environment variable reads for Vercel and local Next.js runtime.
export class MissingEnvironmentVariableError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable: ${name}`);
    this.name = "MissingEnvironmentVariableError";
  }
}

function requireValue(name: string, value: string | undefined) {
  if (!value) {
    throw new MissingEnvironmentVariableError(name);
  }

  return value;
}

function normalizeSupabaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

export function getPublicEnv() {
  return {
    siteUrl: requireValue("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
    apiBaseUrl: requireValue("NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL),
    supabaseUrl: normalizeSupabaseUrl(requireValue("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)),
    supabaseAnonKey: requireValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function getSupabasePublicEnv() {
  return {
    supabaseUrl: normalizeSupabaseUrl(requireValue("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)),
    supabaseAnonKey: requireValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function getSiteUrlEnv() {
  return {
    siteUrl: requireValue("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
  };
}
