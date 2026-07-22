"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createUserSession } from "@/lib/user-session";
import { isTurnstileConfigured, verifyTurnstileToken } from "@/lib/turnstile";

const SignupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_-]+$/, "Username can only contain letters, numbers, - and _"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
});

export type SignupFormState = { error?: string } | undefined;

export async function signupAction(
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
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

  const { email, username, password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    return { error: "Passwords don't match" };
  }

  const existing = await db.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    return { error: "An account with that email or username already exists." };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { email, username, passwordHash },
  });

  try {
    await createUserSession(user.id, user.sessionVersion);
  } catch (err) {
    return { error: `Couldn't start your session: ${err instanceof Error ? err.message : String(err)}` };
  }
  redirect("/account");
}
