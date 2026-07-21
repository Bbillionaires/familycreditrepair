"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createUserSession } from "@/lib/user-session";
import { isTurnstileConfigured, verifyTurnstileToken } from "@/lib/turnstile";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export type LoginFormState = { error?: string } | undefined;

function formatUnlockTime(lockedUntil: Date): string {
  return lockedUntil.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Incorrect username/email or password." };
  }

  if (isTurnstileConfigured()) {
    const turnstileToken = formData.get("cf-turnstile-response");
    const verified = await verifyTurnstileToken(
      typeof turnstileToken === "string" ? turnstileToken : null
    );
    if (!verified) {
      return { error: "Verification failed. Please try again." };
    }
  }

  const user = await db.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });

  const genericError = { error: "Incorrect username/email or password." };

  if (!user) return genericError;

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      error: `Too many failed attempts. Try again after ${formatUnlockTime(user.lockedUntil)}.`,
    };
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      failedLoginAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_DURATION_MS)
        : null;

    await db.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts, lockedUntil },
    });

    return genericError;
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  await createUserSession(user.id, user.sessionVersion);
  redirect("/account");
}
