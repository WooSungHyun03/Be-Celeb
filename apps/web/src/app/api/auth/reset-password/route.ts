import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const emailValue = (body as Record<string, unknown>).email;
    const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ success: false, message: "A valid email is required." }, { status: 400 });
    }

    const redirectUrl = new URL("/api/auth/reset-password/callback", request.url);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl.toString(),
    });

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to send reset password email." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { emailSent: true } });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to request password reset." }, { status: 500 });
  }
}
