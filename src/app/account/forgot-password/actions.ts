"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { getResend, isResendConfigured, EMAIL_FROM } from "@/lib/email";

const EmailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

async function getSiteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export type ForgotPasswordFormState = { error?: string; success?: boolean } | undefined;

export async function forgotPasswordAction(
  _prevState: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const emailResult = EmailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message };
  }

  const user = await db.user.findUnique({ where: { email: emailResult.data } });

  if (user) {
    const resetToken = nanoid(32);
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS);

    await db.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    if (isResendConfigured()) {
      const origin = await getSiteOrigin();
      await getResend().emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: "Reset your password",
        text: `Reset your password: ${origin}/account/reset-password?token=${resetToken}`,
      });
    } else {
      console.error("RESEND_API_KEY not set — cannot send forgot-password email for", user.email);
    }
  }

  return { success: true };
}
