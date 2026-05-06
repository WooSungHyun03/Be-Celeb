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

export function getPublicEnv() {
  return {
    siteUrl: requireValue("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
    apiBaseUrl: requireValue("NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL),
    supabaseUrl: requireValue("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: requireValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function getServerEnv() {
  return {
    ...getPublicEnv(),
    supabaseServiceRoleKey: requireValue("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    openaiApiKey: requireValue("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    resendApiKey: requireValue("RESEND_API_KEY", process.env.RESEND_API_KEY),
    resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "no-reply@be-celeb.org",
  };
}

export function getOpenAiEnv() {
  return {
    apiKey: requireValue("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  };
}

export function getResendEnv() {
  return {
    apiKey: requireValue("RESEND_API_KEY", process.env.RESEND_API_KEY),
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "no-reply@be-celeb.org",
  };
}
