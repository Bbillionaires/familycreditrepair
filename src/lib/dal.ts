import "server-only";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/session";

export async function requireAdmin() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    redirect("/admin/login");
  }
}
