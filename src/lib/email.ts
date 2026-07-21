import "server-only";
import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your environment to send account recovery emails."
    );
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
