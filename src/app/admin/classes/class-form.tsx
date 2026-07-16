"use client";

import { useActionState } from "react";
import type { ClassFormState } from "./actions";

type Props = {
  action: (state: ClassFormState, formData: FormData) => Promise<ClassFormState>;
  submitLabel: string;
  defaultValues?: {
    title?: string;
    description?: string | null;
    startsAtInputValue?: string;
    durationMinutes?: number;
    location?: string;
    capacity?: number | null;
    published?: boolean;
  };
};

export default function ClassForm({ action, submitLabel, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">Class title</label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startsAt" className="block text-sm font-medium text-slate-700">Start date &amp; time</label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaultValues?.startsAtInputValue}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="durationMinutes" className="block text-sm font-medium text-slate-700">Duration (min)</label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            defaultValue={defaultValues?.durationMinutes ?? 60}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-slate-700">Location</label>
        <input
          id="location"
          name="location"
          defaultValue={defaultValues?.location ?? "Online via Zoom"}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="capacity" className="block text-sm font-medium text-slate-700">
          Capacity (optional)
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          defaultValue={defaultValues?.capacity ?? ""}
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
