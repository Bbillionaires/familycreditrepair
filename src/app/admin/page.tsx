import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";

export default async function AdminDashboard() {
  await requireAdmin();

  const [
    testimonialCount,
    materialCount,
    courseCount,
    classCount,
    signupCount,
    paidMaterialPurchaseCount,
    paidCoursePurchaseCount,
  ] = await Promise.all([
    db.testimonial.count(),
    db.material.count(),
    db.course.count(),
    db.classSession.count({ where: { startsAt: { gte: new Date() } } }),
    db.signup.count(),
    db.purchase.count({ where: { status: "paid", amountCents: { gt: 0 }, materialId: { not: null } } }),
    db.purchase.count({ where: { status: "paid", amountCents: { gt: 0 }, courseId: { not: null } } }),
  ]);

  const cards = [
    { href: "/admin/testimonials", label: "Testimonials", value: testimonialCount },
    { href: "/admin/materials", label: "Materials", value: materialCount },
    { href: "/admin/courses", label: "Courses", value: courseCount },
    { href: "/admin/classes", label: "Upcoming classes", value: classCount },
    { href: "/admin/classes", label: "Class signups", value: signupCount },
    { href: "/admin/materials", label: "Paid materials sold", value: paidMaterialPurchaseCount },
    { href: "/admin/courses", label: "Paid courses sold", value: paidCoursePurchaseCount },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-slate-200 bg-white p-5 hover:border-blue-300"
          >
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
