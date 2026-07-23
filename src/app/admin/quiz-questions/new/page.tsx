import { requireAdmin } from "@/lib/dal";
import QuestionForm from "../question-form";
import { createQuestion } from "../actions";

export default async function NewQuizQuestionPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Add quiz question</h1>
      <div className="mt-6">
        <QuestionForm action={createQuestion} submitLabel="Create question" />
      </div>
    </div>
  );
}
