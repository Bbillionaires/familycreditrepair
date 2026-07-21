import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { deleteCourse } from "./actions";

export default async function AdminCoursesPage() {
  await requireAdmin();
  const courses = await db.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { purchases: true, lessons: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Courses</h1>
        <Link
          href="/admin/courses/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add course
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Lessons</th>
              <th className="px-4 py-3">Purchases</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                <td className="px-4 py-3 text-slate-600">{formatMoney(c.priceCents)}</td>
                <td className="px-4 py-3 text-slate-600">{c._count.lessons}</td>
                <td className="px-4 py-3 text-slate-600">{c._count.purchases}</td>
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
                    <Link href={`/admin/courses/${c.id}/lessons`} className="text-blue-600 hover:underline">
                      Manage lessons
                    </Link>
                    <Link href={`/admin/courses/${c.id}/edit`} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                    <form action={deleteCourse.bind(null, c.id)}>
                      <button type="submit" className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No courses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
