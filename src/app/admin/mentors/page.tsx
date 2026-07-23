import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { deleteMentor } from "./actions";

export default async function AdminMentorsPage() {
  await requireAdmin();
  const mentors = await db.mentor.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Mentors</h1>
        <Link
          href="/admin/mentors/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add mentor
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mentors.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                <td className="px-4 py-3 text-slate-600">{m.email}</td>
                <td className="px-4 py-3 text-slate-600">
                  {m.sessionRateCents ? formatMoney(m.sessionRateCents) : "Free"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      m.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {m.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/mentors/${m.id}/edit`} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                    <form action={deleteMentor.bind(null, m.id)}>
                      <button type="submit" className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {mentors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No mentors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
