"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";

export async function toggleComp(userId: string) {
  await requireAdmin();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await db.user.update({ where: { id: userId }, data: { isComped: !user.isComped } });
  revalidatePath("/admin/users");
}
