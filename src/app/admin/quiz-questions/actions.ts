"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";

const QuizQuestionSchema = z.object({
  question: z.string().trim().min(1, "Question text is required"),
  optionA: z.string().trim().min(1, "Option A is required"),
  optionB: z.string().trim().min(1, "Option B is required"),
  optionC: z.string().trim().min(1, "Option C is required"),
  optionD: z.string().trim().min(1, "Option D is required"),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().trim().optional(),
  category: z.string().trim().optional(),
  published: z.boolean(),
});

export type QuizQuestionFormState = { error?: string } | undefined;

function parseForm(formData: FormData) {
  return QuizQuestionSchema.safeParse({
    question: formData.get("question"),
    optionA: formData.get("optionA"),
    optionB: formData.get("optionB"),
    optionC: formData.get("optionC"),
    optionD: formData.get("optionD"),
    correctOption: formData.get("correctOption"),
    explanation: formData.get("explanation") || undefined,
    category: formData.get("category") || undefined,
    published: formData.get("published") === "on",
  });
}

export async function createQuestion(
  _prevState: QuizQuestionFormState,
  formData: FormData
): Promise<QuizQuestionFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.quizQuestion.create({ data: parsed.data });

  revalidatePath("/admin/quiz-questions");
  redirect("/admin/quiz-questions");
}

export async function updateQuestion(
  id: string,
  _prevState: QuizQuestionFormState,
  formData: FormData
): Promise<QuizQuestionFormState> {
  await requireAdmin();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.quizQuestion.update({ where: { id }, data: parsed.data });

  revalidatePath("/admin/quiz-questions");
  redirect("/admin/quiz-questions");
}

export async function deleteQuestion(id: string) {
  await requireAdmin();
  await db.quizQuestion.delete({ where: { id } });
  revalidatePath("/admin/quiz-questions");
}
