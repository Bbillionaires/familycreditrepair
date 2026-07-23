import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import QuestionForm from "../../question-form";
import { updateQuestion } from "../../actions";

export default async function EditQuizQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const question = await db.quizQuestion.findUnique({ where: { id } });
  if (!question) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Edit quiz question</h1>
      <div className="mt-6">
        <QuestionForm
          action={updateQuestion.bind(null, id)}
          submitLabel="Save changes"
          defaultValues={question}
        />
      </div>
    </div>
  );
}
