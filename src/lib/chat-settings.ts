import "server-only";
import { db } from "@/lib/db";

export async function getChatSettings() {
  return db.chatSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}
