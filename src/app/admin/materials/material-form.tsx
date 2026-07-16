"use client";

import { useActionState } from "react";
import type { MaterialFormState } from "./actions";

type Props = {
  action: (state: MaterialFormState, formData: FormData) => Promise<MaterialFormState>;
  submitLabel: string;
  defaultValues?: {
    title?: string;
    description?: string;
    priceCents?: number;
    fileUrl?: string;
    published?: boolean;
  };
};

export default function MaterialForm({ action, submitLabel, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isExternalUrl = defaultValues?.fileUrl?.startsWith("http");

  return (
    <form action={formAction} encType="multipart/form-data" className="max-w-lg space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">Title</label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          required
          defaultValue={defaultValues?.description}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="priceDollars" className="block text-sm font-medium text-slate-700">
          Price in USD (0 for free)
        </label>
        <input
          id="priceDollars"
          name="priceDollars"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultValues ? (defaultValues.priceCents ?? 0) / 100 : 0}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-slate-700">
          Upload file (PDF, etc.)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          className="mt-1 w-full text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Or provide a link to a hosted file instead of uploading:
        </p>
        <input
          id="externalFileUrl"
          name="externalFileUrl"
          placeholder="https://..."
          defaultValue={isExternalUrl ? defaultValues?.fileUrl : ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {defaultValues?.fileUrl && (
          <p className="mt-1 text-xs text-slate-500">
            Current file: {defaultValues.fileUrl}. Leave both blank to keep it.
          </p>
        )}
      </div>
      <div>
        <label htmlFor="image" className="block text-sm font-medium text-slate-700">
          Cover image (optional)
        </label>
        <input id="image" name="image" type="file" accept="image/*" className="mt-1 w-full text-sm" />
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
