"use server";

import { revalidatePath } from "next/cache";
import { verifyUserSession } from "@/lib/user-session";
import { db } from "@/lib/db";
import { maybeIssueCertificate } from "@/lib/certificate";

export type SetLessonCompletionResult = { error: string } | { ok: true };

export async function setLessonCompletion(
  lessonId: string,
  completed: boolean
): Promise<SetLessonCompletionResult> {
  const session = await verifyUserSession();
  if (!session) return { error: "You must be logged in to track progress." };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.sessionVersion !== session.sessionVersion) {
    return { error: "Your session has expired. Please log in again." };
  }

  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return { error: "Lesson not found." };

  const ownsCourse = await db.purchase.findFirst({
    where: {
      courseId: lesson.courseId,
      status: "paid",
      email: { equals: user.email, mode: "insensitive" },
    },
  });
  if (!ownsCourse) {
    return { error: "This course isn't linked to your account." };
  }

  if (completed) {
    await db.lessonCompletion.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      update: {},
      create: { userId: user.id, lessonId },
    });
    await maybeIssueCertificate(user.id);
  } else {
    await db.lessonCompletion.deleteMany({ where: { userId: user.id, lessonId } });
  }

  revalidatePath(`/courses/${lesson.courseId}`);
  return { ok: true };
}
