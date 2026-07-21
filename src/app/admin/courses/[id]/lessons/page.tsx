import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { deleteLesson } from "./actions";

export default async function CourseLessonsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  if (!course) notFound();

  return (
    <div>
      <Link href="/admin/courses" className="text-sm text-blue-600 hover:underline">
        &larr; Back to courses
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{course.title} &mdash; Lessons</h1>
        <Link
          href={`/admin/courses/${course.id}/lessons/new`}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add lesson
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Video</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {course.lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td className="px-4 py-3 text-slate-600">{lesson.order}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{lesson.title}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                  {lesson.content ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">{lesson.videoUrl ? "Yes" : "—"}</td>
                <td className="px-4 py-3 text-slate-500">{lesson.fileUrl ? "Yes" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/courses/${course.id}/lessons/${lesson.id}/edit`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <form action={deleteLesson.bind(null, lesson.id, course.id)}>
                      <button type="submit" className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {course.lessons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No lessons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
