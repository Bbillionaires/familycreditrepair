"use client";

import { useActionState } from "react";
import type { QuizQuestionFormState } from "./actions";

type Props = {
  action: (state: QuizQuestionFormState, formData: FormData) => Promise<QuizQuestionFormState>;
  submitLabel: string;
  defaultValues?: {
    question?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctOption?: string;
    explanation?: string | null;
    category?: string | null;
    published?: boolean;
  };
};

export default function QuestionForm({ action, submitLabel, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="question" className="block text-sm font-medium text-slate-700">
          Question
        </label>
        <textarea
          id="question"
          name="question"
          required
          rows={3}
          defaultValue={defaultValues?.question}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {(["A", "B", "C", "D"] as const).map((option) => (
        <div key={option}>
          <label htmlFor={`option${option}`} className="block text-sm font-medium text-slate-700">
            Option {option}
          </label>
          <input
            id={`option${option}`}
            name={`option${option}`}
            required
            defaultValue={defaultValues?.[`option${option}` as `option${typeof option}`]}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      ))}
      <div>
        <label htmlFor="correctOption" className="block text-sm font-medium text-slate-700">
          Correct option
        </label>
        <select
          id="correctOption"
          name="correctOption"
          defaultValue={defaultValues?.correctOption ?? "A"}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>
      <div>
        <label htmlFor="explanation" className="block text-sm font-medium text-slate-700">
          Explanation (optional, shown after answering)
        </label>
        <textarea
          id="explanation"
          name="explanation"
          rows={2}
          defaultValue={defaultValues?.explanation ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-slate-700">
          Category (optional)
        </label>
        <input
          id="category"
          name="category"
          defaultValue={defaultValues?.category ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="published"
          name="published"
          type="checkbox"
          defaultChecked={defaultValues?.published ?? false}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="published" className="text-sm text-slate-700">
          Published (included in the live random-selection pool)
        </label>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
