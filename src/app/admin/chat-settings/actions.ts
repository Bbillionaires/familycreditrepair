"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { getChatSettings } from "@/lib/chat-settings";

const ChatSettingsSchema = z.object({
  dailyFreeQuestions: z.coerce.number().int().min(0),
  packQuestionCount: z.coerce.number().int().min(1),
  packPriceDollars: z.coerce.number().min(0),
  hardDailyCap: z.coerce.number().int().min(1),
});

export type ChatSettingsFormState = { error?: string; success?: boolean } | undefined;

export async function updateChatSettings(
  _prevState: ChatSettingsFormState,
  formData: FormData
): Promise<ChatSettingsFormState> {
  await requireAdmin();

  const parsed = ChatSettingsSchema.safeParse({
    dailyFreeQuestions: formData.get("dailyFreeQuestions"),
    packQuestionCount: formData.get("packQuestionCount"),
    packPriceDollars: formData.get("packPriceDollars"),
    hardDailyCap: formData.get("hardDailyCap"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await getChatSettings();

  await db.chatSettings.update({
    where: { id: "singleton" },
    data: {
      dailyFreeQuestions: parsed.data.dailyFreeQuestions,
      packQuestionCount: parsed.data.packQuestionCount,
      packPriceCents: Math.round(parsed.data.packPriceDollars * 100),
      hardDailyCap: parsed.data.hardDailyCap,
    },
  });

  revalidatePath("/admin/chat-settings");
  return { success: true };
}
