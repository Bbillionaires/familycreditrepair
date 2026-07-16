import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatClassDate } from "@/lib/format";

export default async function ClassSignupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const classSession = await db.classSession.findUnique({
    where: { id },
    include: { signups: { orderBy: { createdAt: "asc" } } },
  });
  if (!classSession) notFound();

  return (
    <div>
      <Link href="/admin/classes" className="text-sm text-blue-600 hover:underline">
        &larr; Back to classes
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{classSession.title}</h1>
      <p className="text-slate-500">{formatClassDate(classSession.startsAt)} &middot; {classSession.location}</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Family size</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Signed up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classSession.signups.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                <td className="px-4 py-3 text-slate-600">{s.email}</td>
                <td className="px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{s.familySize ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{s.notes ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{formatClassDate(s.createdAt)}</td>
              </tr>
            ))}
            {classSession.signups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
