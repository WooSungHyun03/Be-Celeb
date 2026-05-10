// Shared JSON response helpers for Next.js API route handlers.
import { NextResponse } from "next/server";
import { MissingEnvironmentVariableError } from "@/lib/config/env";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_NICKNAME"
  | "NOT_FOUND"
  | "SUPABASE_ERROR"
  | "INTERNAL_SERVER_ERROR";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status },
  );
}

export function apiError(message: string, code: ApiErrorCode, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      code,
    },
    { status },
  );
}

export function apiException(error: unknown) {
  if (error instanceof MissingEnvironmentVariableError) {
    return apiError(error.message, "INTERNAL_SERVER_ERROR", 500);
  }

  return apiError("Internal server error.", "INTERNAL_SERVER_ERROR", 500);
}
