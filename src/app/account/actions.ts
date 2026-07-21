"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createUserSession, destroyUserSession } from "@/lib/user-session";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmNewPassword: z.string(),
});

export type ChangePasswordFormState = { error?: string; success?: boolean } | undefined;

export async function changePasswordAction(
  _prevState: ChangePasswordFormState,
  formData: FormData
): Promise<ChangePasswordFormState> {
  const { userId } = await requireUser();

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { currentPassword, newPassword, confirmNewPassword } = parsed.data;

  if (newPassword !== confirmNewPassword) {
    return { error: "New passwords don't match" };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Account not found" };

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) return { error: "Current password is incorrect." };

  const passwordHash = await hashPassword(newPassword);
  const updated = await db.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  await createUserSession(updated.id, updated.sessionVersion);
  return { success: true };
}

export async function logoutAction() {
  await destroyUserSession();
  redirect("/");
}
