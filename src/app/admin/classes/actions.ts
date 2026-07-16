"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";

const ClassSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  startsAt: z.string().trim().min(1, "Start date/time is required"),
  durationMinutes: z.coerce.number().int().min(1),
  location: z.string().trim().min(1, "Location is required"),
  capacity: z.coerce.number().int().min(1).optional(),
  published: z.boolean(),
});

export type ClassFormState = { error?: string } | undefined;

function parseForm(formData: FormData) {
  return ClassSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    startsAt: formData.get("startsAt"),
    durationMinutes: formData.get("durationMinutes") || 60,
    location: formData.get("location") || "Online via Zoom",
    capacity: formData.get("capacity") || undefined,
    published: formData.get("published") === "on",
  });
}

export async function createClass(
  _prevState: ClassFormState,
  formData: FormData
): Promise<ClassFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { error: "Invalid start date/time" };

  await db.classSession.create({
    data: { ...parsed.data, startsAt },
  });

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect("/admin/classes");
}

export async function updateClass(
  id: string,
  _prevState: ClassFormState,
  formData: FormData
): Promise<ClassFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { error: "Invalid start date/time" };

  await db.classSession.update({
    where: { id },
    data: { ...parsed.data, startsAt },
  });

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect("/admin/classes");
}

export async function deleteClass(id: string) {
  await requireAdmin();
  await db.classSession.delete({ where: { id } });
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/admin/classes");
}
