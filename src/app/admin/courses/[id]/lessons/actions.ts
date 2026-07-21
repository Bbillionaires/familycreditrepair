"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { saveLessonFile } from "@/lib/storage";

const LessonSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  order: z.coerce.number().int().default(0),
  content: z.string().trim().optional(),
  videoUrl: z.string().trim().url().optional().or(z.literal("")),
  externalFileUrl: z.string().trim().url().optional().or(z.literal("")),
});

export type LessonFormState = { error?: string } | undefined;

function parseAndValidate(formData: FormData) {
  const parsed = LessonSchema.safeParse({
    title: formData.get("title"),
    order: formData.get("order") || 0,
    content: formData.get("content") || undefined,
    videoUrl: formData.get("videoUrl") || "",
    externalFileUrl: formData.get("externalFileUrl") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" } as const;
  }

  const file = formData.get("file");

  return {
    data: parsed.data,
    file: file instanceof File && file.size > 0 ? file : null,
  } as const;
}

export async function createLesson(
  courseId: string,
  _prevState: LessonFormState,
  formData: FormData
): Promise<LessonFormState> {
  await requireAdmin();

  const result = parseAndValidate(formData);
  if ("error" in result) return { error: result.error };

  const { data, file } = result;

  let fileUrl: string | null = null;
  if (file) {
    fileUrl = await saveLessonFile(file);
  } else if (data.externalFileUrl) {
    fileUrl = data.externalFileUrl;
  }

  await db.lesson.create({
    data: {
      courseId,
      title: data.title,
      order: data.order,
      content: data.content || null,
      videoUrl: data.videoUrl || null,
      fileUrl,
    },
  });

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/lessons`);
  redirect(`/admin/courses/${courseId}/lessons`);
}

export async function updateLesson(
  lessonId: string,
  _prevState: LessonFormState,
  formData: FormData
): Promise<LessonFormState> {
  await requireAdmin();

  const result = parseAndValidate(formData);
  if ("error" in result) return { error: result.error };

  const { data, file } = result;
  const existing = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!existing) return { error: "Lesson not found" };

  let fileUrl = existing.fileUrl;
  if (file) {
    fileUrl = await saveLessonFile(file);
  } else if (data.externalFileUrl) {
    fileUrl = data.externalFileUrl;
  }

  await db.lesson.update({
    where: { id: lessonId },
    data: {
      title: data.title,
      order: data.order,
      content: data.content || null,
      videoUrl: data.videoUrl || null,
      fileUrl,
    },
  });

  revalidatePath(`/courses/${existing.courseId}`);
  revalidatePath(`/admin/courses/${existing.courseId}/lessons`);
  redirect(`/admin/courses/${existing.courseId}/lessons`);
}

export async function deleteLesson(lessonId: string, courseId: string) {
  await requireAdmin();
  await db.lesson.delete({ where: { id: lessonId } });
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/lessons`);
}
