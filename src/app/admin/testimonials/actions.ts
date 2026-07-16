"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";

const TestimonialSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  quote: z.string().trim().optional(),
  videoUrl: z.string().trim().url("Enter a valid video URL"),
  published: z.boolean(),
});

export type TestimonialFormState = { error?: string } | undefined;

function parseForm(formData: FormData) {
  return TestimonialSchema.safeParse({
    name: formData.get("name"),
    quote: formData.get("quote") || undefined,
    videoUrl: formData.get("videoUrl"),
    published: formData.get("published") === "on",
  });
}

export async function createTestimonial(
  _prevState: TestimonialFormState,
  formData: FormData
): Promise<TestimonialFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.testimonial.create({ data: parsed.data });
  revalidatePath("/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function updateTestimonial(
  id: string,
  _prevState: TestimonialFormState,
  formData: FormData
): Promise<TestimonialFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.testimonial.update({ where: { id }, data: parsed.data });
  revalidatePath("/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function deleteTestimonial(id: string) {
  await requireAdmin();
  await db.testimonial.delete({ where: { id } });
  revalidatePath("/testimonials");
  revalidatePath("/");
  revalidatePath("/admin/testimonials");
}
