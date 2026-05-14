// Sends a test email through Resend using server-side environment variables.
import { apiError, apiSuccess } from "@/app/api/_utils/api";
import { MissingEnvironmentVariableError, getResendEnv } from "@/lib/config/env";
import { getResendClient } from "@/lib/resend/client";

type TestEmailRequest = {
  to?: string;
  subject?: string;
};

function isTestEmailRequest(value: unknown): value is TestEmailRequest {
  return typeof value === "object" && value !== null;
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return apiError("Unauthorized email test request.", "UNAUTHORIZED", 401);
    }

    const body: unknown = await request.json();
    const input = isTestEmailRequest(body) ? body : {};

    if (!input.to) {
      return apiError("Missing required field: to", "VALIDATION_ERROR", 400);
    }

    const { fromEmail } = getResendEnv();
    const data = await getResendClient().sendEmail({
      from: `Be Celeb <${fromEmail}>`,
      to: [input.to],
      subject: input.subject ?? "Be Celeb test email",
      html: "<p>Be Celeb Resend connection test succeeded.</p>",
      text: "Be Celeb Resend connection test succeeded.",
    });

    return apiSuccess({
      status: "sent",
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email sending error.";
    const status = error instanceof MissingEnvironmentVariableError ? 500 : 502;

    return apiError(message, "INTERNAL_SERVER_ERROR", status);
  }
}
