"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";

const CourseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  priceDollars: z.coerce.number().min(0, "Price can't be negative"),
  published: z.boolean(),
});

export type CourseFormState = { error?: string } | undefined;

async function saveImageIfProvided(image: File | null): Promise<string | undefined> {
  if (!image || image.size === 0) return undefined;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "courses");
  await mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(image.name);
  const filename = `${nanoid()}${ext}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return `/uploads/courses/${filename}`;
}

function parseAndValidate(formData: FormData) {
  const parsed = CourseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priceDollars: formData.get("priceDollars") || 0,
    published: formData.get("published") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" } as const;
  }

  const image = formData.get("image");

  return {
    data: parsed.data,
    image: image instanceof File && image.size > 0 ? image : null,
  } as const;
}

export async function createCourse(
  _prevState: CourseFormState,
  formData: FormData
): Promise<CourseFormState> {
  await requireAdmin();

  const result = parseAndValidate(formData);
  if ("error" in result) return { error: result.error };

  const { data, image } = result;
  const imageUrl = await saveImageIfProvided(image);

  await db.course.create({
    data: {
      title: data.title,
      description: data.description,
      priceCents: Math.round(data.priceDollars * 100),
      imageUrl,
      published: data.published,
    },
  });

  revalidatePath("/courses");
  revalidatePath("/");
  redirect("/admin/courses");
}

export async function updateCourse(
  id: string,
  _prevState: CourseFormState,
  formData: FormData
): Promise<CourseFormState> {
  await requireAdmin();

  const result = parseAndValidate(formData);
  if ("error" in result) return { error: result.error };

  const { data, image } = result;
  const existing = await db.course.findUnique({ where: { id } });
  if (!existing) return { error: "Course not found" };

  const imageUrl = (await saveImageIfProvided(image)) ?? existing.imageUrl;

  await db.course.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      priceCents: Math.round(data.priceDollars * 100),
      imageUrl,
      published: data.published,
    },
  });

  revalidatePath("/courses");
  revalidatePath("/");
  redirect("/admin/courses");
}

export async function deleteCourse(id: string) {
  await requireAdmin();
  await db.course.delete({ where: { id } });
  revalidatePath("/courses");
  revalidatePath("/");
  revalidatePath("/admin/courses");
}
