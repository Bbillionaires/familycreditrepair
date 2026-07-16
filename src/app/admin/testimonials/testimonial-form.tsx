"use client";

import { useActionState } from "react";
import type { TestimonialFormState } from "./actions";

type Props = {
  action: (state: TestimonialFormState, formData: FormData) => Promise<TestimonialFormState>;
  submitLabel: string;
  defaultValues?: {
    name?: string;
    quote?: string | null;
    videoUrl?: string;
    published?: boolean;
  };
};

export default function TestimonialForm({ action, submitLabel, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Family name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="videoUrl" className="block text-sm font-medium text-slate-700">
          Video URL (YouTube or Vimeo)
        </label>
        <input
          id="videoUrl"
          name="videoUrl"
          required
          placeholder="https://www.youtube.com/watch?v=..."
          defaultValue={defaultValues?.videoUrl}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="quote" className="block text-sm font-medium text-slate-700">Quote (optional)</label>
        <textarea
          id="quote"
          name="quote"
          rows={3}
          defaultValue={defaultValues?.quote ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="published"
          name="published"
          type="checkbox"
          defaultChecked={defaultValues?.published ?? true}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="published" className="text-sm text-slate-700">Published (visible on site)</label>
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
