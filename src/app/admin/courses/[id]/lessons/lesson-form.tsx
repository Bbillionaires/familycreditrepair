"use client";

import { useActionState } from "react";
import type { LessonFormState } from "./actions";

type Props = {
  action: (state: LessonFormState, formData: FormData) => Promise<LessonFormState>;
  submitLabel: string;
  defaultValues?: {
    title?: string;
    order?: number;
    content?: string | null;
    videoUrl?: string | null;
    fileUrl?: string | null;
  };
};

export default function LessonForm({ action, submitLabel, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isExternalUrl = defaultValues?.fileUrl?.startsWith("http");

  return (
    <form action={formAction} encType="multipart/form-data" className="max-w-lg space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">Lesson title</label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="order" className="block text-sm font-medium text-slate-700">
          Order (lower numbers show first)
        </label>
        <input
          id="order"
          name="order"
          type="number"
          defaultValue={defaultValues?.order ?? 0}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-slate-700">
          Content (optional)
        </label>
        <textarea
          id="content"
          name="content"
          rows={5}
          defaultValue={defaultValues?.content ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">Separate paragraphs with a blank line.</p>
      </div>
      <div>
        <label htmlFor="videoUrl" className="block text-sm font-medium text-slate-700">
          Video URL (optional, YouTube or Vimeo)
        </label>
        <input
          id="videoUrl"
          name="videoUrl"
          placeholder="https://www.youtube.com/watch?v=..."
          defaultValue={defaultValues?.videoUrl ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-slate-700">
          Upload file (optional)
        </label>
        <input id="file" name="file" type="file" className="mt-1 w-full text-sm" />
        <p className="mt-1 text-xs text-slate-500">
          Or provide a link to a hosted file instead of uploading:
        </p>
        <input
          id="externalFileUrl"
          name="externalFileUrl"
          placeholder="https://..."
          defaultValue={isExternalUrl ? (defaultValues?.fileUrl ?? "") : ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {defaultValues?.fileUrl && (
          <p className="mt-1 text-xs text-slate-500">
            Current file: {defaultValues.fileUrl}. Leave both blank to keep it.
          </p>
        )}
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
