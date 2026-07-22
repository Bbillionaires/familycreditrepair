import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { formatClassDate } from "@/lib/format";

export async function GET(request: Request) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const signups = await db.signup.findMany({
    include: { classSession: true },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(signups, [
    { label: "Signup ID", value: (s) => s.id },
    { label: "Name", value: (s) => s.name },
    { label: "Email", value: (s) => s.email },
    { label: "Phone", value: (s) => s.phone },
    { label: "Family size", value: (s) => s.familySize },
    { label: "Notes", value: (s) => s.notes },
    { label: "Class", value: (s) => s.classSession.title },
    { label: "Class date/time", value: (s) => formatClassDate(s.classSession.startsAt) },
    { label: "Location", value: (s) => s.classSession.location },
    { label: "Signed up at", value: (s) => s.createdAt.toISOString() },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="class-signups.csv"`,
    },
  });
}
