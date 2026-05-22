import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/config/env";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const ALLOWED_METHODS = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Content-Type, Authorization, x-cron-secret";
const AUTH_ENTRY_PATHS = new Set(["/login", "/signup"]);
const AUTHENTICATED_REDIRECT_PATH = "/dashboard";

function normalizeOrigin(value: string) {
  return new URL(value).origin;
}

function splitOrigins(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return normalizeOrigin(origin);
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => Boolean(origin));
}

function getAllowedOrigins() {
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...splitOrigins(process.env.ALLOWED_ORIGINS),
    ...splitOrigins(process.env.NEXT_PUBLIC_SITE_URL),
  ]);
}

function getRequestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  try {
    return normalizeOrigin(origin);
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string | null) {
  return origin !== null && getAllowedOrigins().has(origin);
}

function getCorsHeaders(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const headers = new Headers();

  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? DEFAULT_ALLOWED_HEADERS,
  );
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");

  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function applyCorsHeaders(response: NextResponse, request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  corsHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

async function redirectAuthenticatedAuthPage(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next();
  }

  const { supabaseAnonKey, supabaseUrl } = getSupabasePublicEnv();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  if (!user) {
    return supabaseResponse;
  }

  const redirectResponse = NextResponse.redirect(new URL(AUTHENTICATED_REDIRECT_PATH, request.url));
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  if (AUTH_ENTRY_PATHS.has(request.nextUrl.pathname)) {
    return redirectAuthenticatedAuthPage(request);
  }

  const origin = getRequestOrigin(request);

  if (request.method === "OPTIONS") {
    if (origin && !isAllowedOrigin(origin)) {
      return NextResponse.json({ success: false, message: "CORS origin is not allowed." }, { status: 403 });
    }

    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }

  return applyCorsHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: ["/api/:path*", "/login", "/signup"],
};
