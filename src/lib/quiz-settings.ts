import "server-only";
import { db } from "@/lib/db";

export async function getQuizSettings() {
  return db.quizSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}
