"use client";

import { useActionState } from "react";
import type { MentorFormState } from "./actions";

type Props = {
  action: (state: MentorFormState, formData: FormData) => Promise<MentorFormState>;
  submitLabel: string;
  defaultValues?: {
    name?: string;
    email?: string;
    bio?: string | null;
    sessionRateDollars?: number | null;
    notifyMentorOnRequest?: boolean;
    active?: boolean;
  };
};

export default function MentorForm({ action, submitLabel, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={defaultValues?.email}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-slate-700">
          Bio (optional)
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={defaultValues?.bio ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="sessionRateDollars" className="block text-sm font-medium text-slate-700">
          Session rate (optional, informational only — not charged automatically)
        </label>
        <input
          id="sessionRateDollars"
          name="sessionRateDollars"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultValues?.sessionRateDollars ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="notifyMentorOnRequest"
          name="notifyMentorOnRequest"
          type="checkbox"
          defaultChecked={defaultValues?.notifyMentorOnRequest ?? false}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="notifyMentorOnRequest" className="text-sm text-slate-700">
          Also email this mentor directly when someone requests them
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={defaultValues?.active ?? true}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="active" className="text-sm text-slate-700">
          Active (visible on the public request form)
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
