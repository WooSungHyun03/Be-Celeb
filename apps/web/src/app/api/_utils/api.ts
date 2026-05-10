import { NextResponse } from "next/server";
import { MissingEnvironmentVariableError } from "@/lib/config/env";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_NICKNAME"
  | "NOT_FOUND"
  | "SUPABASE_ERROR"
  | "AUTH_PROVIDER_UNAVAILABLE"
  | "INTERNAL_SERVER_ERROR";

type LogApiErrorInput = {
  request: Request;
  code: ApiErrorCode;
  message: string;
  userId?: string | null;
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, code: ApiErrorCode, status = 400) {
  return NextResponse.json({ success: false, message, code }, { status });
}

function toLogMessage(error: unknown) {
  if (error instanceof MissingEnvironmentVariableError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "Unknown server error.";
}

export async function logApiError(input: LogApiErrorInput) {
  try {
    const url = new URL(input.request.url);
    await getSupabaseServiceRoleClient().from("error_logs").insert({
      user_id: input.userId ?? null,
      method: input.request.method,
      path: url.pathname,
      code: input.code,
      message: input.message.slice(0, 500),
    });
  } catch {
    // Logging must never break the API response path.
  }
}

export async function apiException(error: unknown, request: Request, userId?: string | null) {
  const message =
    error instanceof MissingEnvironmentVariableError ? error.message : "Internal server error.";

  await logApiError({
    request,
    userId,
    code: "INTERNAL_SERVER_ERROR",
    message: toLogMessage(error),
  });

  return apiError(message, "INTERNAL_SERVER_ERROR", 500);
}

export async function logNotFound(request: Request) {
  try {
    const url = new URL(request.url);
    await getSupabaseServiceRoleClient().from("not_found_logs").insert({
      path: url.pathname,
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    });
  } catch {
    // Missing logging env or DB errors should not change a 404 response.
  }
}
