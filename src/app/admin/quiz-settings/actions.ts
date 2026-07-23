"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { getQuizSettings } from "@/lib/quiz-settings";

const QuizSettingsSchema = z.object({
  questionsPerAttempt: z.coerce.number().int().min(1),
  passThresholdPercent: z.coerce.number().int().min(1).max(100),
  maxAttemptsPerRollingDays: z.coerce.number().int().min(1),
  rollingWindowDays: z.coerce.number().int().min(1),
});

export type QuizSettingsFormState = { error?: string; success?: boolean } | undefined;

export async function updateQuizSettings(
  _prevState: QuizSettingsFormState,
  formData: FormData
): Promise<QuizSettingsFormState> {
  await requireAdmin();

  const parsed = QuizSettingsSchema.safeParse({
    questionsPerAttempt: formData.get("questionsPerAttempt"),
    passThresholdPercent: formData.get("passThresholdPercent"),
    maxAttemptsPerRollingDays: formData.get("maxAttemptsPerRollingDays"),
    rollingWindowDays: formData.get("rollingWindowDays"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await getQuizSettings();

  await db.quizSettings.update({
    where: { id: "singleton" },
    data: parsed.data,
  });

  revalidatePath("/admin/quiz-settings");
  return { success: true };
}
