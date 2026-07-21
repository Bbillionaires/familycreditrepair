"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getResend, isResendConfigured, EMAIL_FROM } from "@/lib/email";

const EmailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export type ForgotUsernameFormState = { error?: string; success?: boolean } | undefined;

export async function forgotUsernameAction(
  _prevState: ForgotUsernameFormState,
  formData: FormData
): Promise<ForgotUsernameFormState> {
  const emailResult = EmailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message };
  }

  const user = await db.user.findUnique({ where: { email: emailResult.data } });

  if (user) {
    if (isResendConfigured()) {
      await getResend().emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: "Your username",
        text: `Your username is: ${user.username}`,
      });
    } else {
      console.error("RESEND_API_KEY not set — cannot send forgot-username email for", user.email);
    }
  }

  return { success: true };
}
