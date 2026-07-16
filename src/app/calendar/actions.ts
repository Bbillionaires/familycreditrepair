"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const SignupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  familySize: z.coerce.number().int().min(1).optional(),
  notes: z.string().trim().optional(),
});

export type SignupFormState = { error?: string; success?: boolean } | undefined;

export async function createSignup(
  classSessionId: string,
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    familySize: formData.get("familySize") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const classSession = await db.classSession.findUnique({
    where: { id: classSessionId },
    include: { _count: { select: { signups: true } } },
  });

  if (!classSession || !classSession.published) {
    return { error: "This class is no longer available" };
  }

  if (classSession.capacity && classSession._count.signups >= classSession.capacity) {
    return { error: "This class is full" };
  }

  await db.signup.create({
    data: { classSessionId, ...parsed.data },
  });

  revalidatePath("/calendar");
  return { success: true };
}
