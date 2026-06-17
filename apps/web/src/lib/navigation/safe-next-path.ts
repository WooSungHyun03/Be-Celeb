const DEFAULT_AUTH_NEXT_PATH = "/dashboard";
const SAFE_URL_BASE = "https://be-celeb.local";

export function getSafeNextPath(value: string | null | undefined, fallback = DEFAULT_AUTH_NEXT_PATH) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, SAFE_URL_BASE);

    if (parsed.origin !== SAFE_URL_BASE) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
