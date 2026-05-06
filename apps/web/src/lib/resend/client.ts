// Creates a small Resend REST client for server-side email API routes.
import { getResendEnv } from "@/lib/config/env";

type SendEmailInput = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
};

type ResendSendEmailResult = {
  id: string;
};

type ResendErrorResult = {
  message?: string;
  name?: string;
};

class ResendRestClient {
  constructor(private readonly apiKey: string) {}

  async sendEmail(input: SendEmailInput): Promise<ResendSendEmailResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      const error = data as ResendErrorResult;
      throw new Error(error.message ?? `Resend request failed with status ${response.status}`);
    }

    return data as ResendSendEmailResult;
  }
}

let resendClient: ResendRestClient | null = null;

export function getResendClient() {
  const { apiKey } = getResendEnv();

  if (!resendClient) {
    resendClient = new ResendRestClient(apiKey);
  }

  return resendClient;
}
