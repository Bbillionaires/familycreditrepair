import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatClassDate } from "@/lib/format";
import { deleteClass } from "./actions";

export default async function AdminClassesPage() {
  await requireAdmin();
  const classes = await db.classSession.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { signups: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Classes</h1>
        <Link
          href="/admin/classes/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add class
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Signups</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                <td className="px-4 py-3 text-slate-600">{formatClassDate(c.startsAt)}</td>
                <td className="px-4 py-3 text-slate-600">
                  <Link href={`/admin/classes/${c.id}/signups`} className="text-blue-600 hover:underline">
                    {c._count.signups}{c.capacity ? ` / ${c.capacity}` : ""}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      c.published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {c.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/classes/${c.id}/edit`} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                    <form action={deleteClass.bind(null, c.id)}>
                      <button type="submit" className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No classes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
