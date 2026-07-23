import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { deleteQuestion } from "./actions";

const PAGE_SIZE = 25;

export default async function AdminQuizQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [questions, total] = await Promise.all([
    db.quizQuestion.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.quizQuestion.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Quiz Questions</h1>
        <Link
          href="/admin/quiz-questions/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add question
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Correct</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {questions.map((q) => (
              <tr key={q.id}>
                <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">
                  {q.question}
                </td>
                <td className="px-4 py-3 text-slate-600">{q.category ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{q.correctOption}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      q.published ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {q.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/quiz-questions/${q.id}/edit`} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                    <form action={deleteQuestion.bind(null, q.id)}>
                      <button type="submit" className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {questions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No quiz questions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {totalPages} ({total} questions)
        </span>
        <div className="flex gap-4">
          {page > 1 && (
            <Link href={`/admin/quiz-questions?page=${page - 1}`} className="text-blue-600 hover:underline">
              Prev
            </Link>
          )}
          {page < totalPages && (
            <Link href={`/admin/quiz-questions?page=${page + 1}`} className="text-blue-600 hover:underline">
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
