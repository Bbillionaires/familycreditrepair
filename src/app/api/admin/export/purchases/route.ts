import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { formatMoney } from "@/lib/format";

export async function GET(request: Request) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const purchases = await db.purchase.findMany({
    include: { material: true, course: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(purchases, [
    { label: "Purchase ID", value: (p) => p.id },
    { label: "Name", value: (p) => p.name },
    { label: "Email", value: (p) => p.email },
    { label: "Item type", value: (p) => (p.materialId ? "Material" : p.courseId ? "Course" : "") },
    { label: "Item title", value: (p) => p.material?.title ?? p.course?.title ?? "" },
    { label: "Amount", value: (p) => formatMoney(p.amountCents) },
    { label: "Status", value: (p) => p.status },
    { label: "Stripe session ID", value: (p) => p.stripeSessionId },
    { label: "Purchased at", value: (p) => p.createdAt.toISOString() },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="purchases.csv"`,
    },
  });
}
