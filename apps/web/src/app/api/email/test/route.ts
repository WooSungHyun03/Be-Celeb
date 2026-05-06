// Sends a test email through Resend using server-side environment variables.
import { NextResponse } from "next/server";
import { MissingEnvironmentVariableError, getResendEnv } from "@/lib/config/env";
import { getResendClient } from "@/lib/resend/client";

type TestEmailRequest = {
  to?: string;
  subject?: string;
};

function isTestEmailRequest(value: unknown): value is TestEmailRequest {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  // TODO: Protect this endpoint with admin auth before production use.
  // TODO: Add rate limiting before exposing this endpoint to public traffic.
  try {
    const body: unknown = await request.json();
    const input = isTestEmailRequest(body) ? body : {};

    if (!input.to) {
      return NextResponse.json({ error: "Missing required field: to" }, { status: 400 });
    }

    const { fromEmail } = getResendEnv();
    const data = await getResendClient().sendEmail({
      from: `Be Celeb <${fromEmail}>`,
      to: [input.to],
      subject: input.subject ?? "Be Celeb test email",
      html: "<p>Be Celeb Resend connection test succeeded.</p>",
      text: "Be Celeb Resend connection test succeeded.",
    });

    return NextResponse.json({
      status: "sent",
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email sending error.";
    const status = error instanceof MissingEnvironmentVariableError ? 500 : 502;

    return NextResponse.json(
      {
        error: message,
        service: "resend",
      },
      { status },
    );
  }
}
