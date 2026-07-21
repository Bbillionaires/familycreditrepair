"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createUserSession } from "@/lib/user-session";

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmNewPassword: z.string(),
});

export type ResetPasswordFormState = { error?: string } | undefined;

export async function resetPasswordAction(
  token: string,
  _prevState: ResetPasswordFormState,
  formData: FormData
): Promise<ResetPasswordFormState> {
  const parsed = ResetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { newPassword, confirmNewPassword } = parsed.data;
  if (newPassword !== confirmNewPassword) {
    return { error: "Passwords don't match" };
  }

  const user = await db.user.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    return { error: "This link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
      resetToken: null,
      resetTokenExpiresAt: null,
    },
  });

  await createUserSession(updated.id, updated.sessionVersion);
  redirect("/account");
}
