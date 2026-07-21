import "server-only";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/session";
import { verifyUserSession } from "@/lib/user-session";
import { db } from "@/lib/db";

export async function requireAdmin() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    redirect("/admin/login");
  }
}

export async function requireUser(): Promise<{ userId: string }> {
  const session = await verifyUserSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.sessionVersion !== session.sessionVersion) {
    // Cookies can only be cleared from a Server Action or Route Handler, not
    // during a Server Component render — just redirect. The stale cookie is
    // harmless: every future request re-runs this same check, and it gets
    // overwritten the next time the user actually logs in.
    redirect("/login");
  }

  return { userId: user.id };
}
