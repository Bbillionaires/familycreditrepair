"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";

const MentorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  bio: z.string().trim().optional(),
  sessionRateDollars: z.coerce.number().min(0, "Rate can't be negative").optional(),
  notifyMentorOnRequest: z.boolean(),
  active: z.boolean(),
});

export type MentorFormState = { error?: string } | undefined;

function parseForm(formData: FormData) {
  return MentorSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    bio: formData.get("bio") || undefined,
    sessionRateDollars: formData.get("sessionRateDollars") || undefined,
    notifyMentorOnRequest: formData.get("notifyMentorOnRequest") === "on",
    active: formData.get("active") === "on",
  });
}

export async function createMentor(
  _prevState: MentorFormState,
  formData: FormData
): Promise<MentorFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { sessionRateDollars, ...rest } = parsed.data;

  await db.mentor.create({
    data: {
      ...rest,
      sessionRateCents: sessionRateDollars ? Math.round(sessionRateDollars * 100) : null,
    },
  });

  revalidatePath("/mentoring");
  revalidatePath("/admin/mentors");
  redirect("/admin/mentors");
}

export async function updateMentor(
  id: string,
  _prevState: MentorFormState,
  formData: FormData
): Promise<MentorFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { sessionRateDollars, ...rest } = parsed.data;

  await db.mentor.update({
    where: { id },
    data: {
      ...rest,
      sessionRateCents: sessionRateDollars ? Math.round(sessionRateDollars * 100) : null,
    },
  });

  revalidatePath("/mentoring");
  revalidatePath("/admin/mentors");
  redirect("/admin/mentors");
}

export async function deleteMentor(id: string) {
  await requireAdmin();
  await db.mentor.delete({ where: { id } });
  revalidatePath("/mentoring");
  revalidatePath("/admin/mentors");
}
