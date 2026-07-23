"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createMentorRequest } from "./actions";
import { formatMoney } from "@/lib/format";

type MentorOption = {
  id: string;
  name: string;
  sessionRateCents: number | null;
  bio: string | null;
};

export default function MentorRequestForm({ mentors }: { mentors: MentorOption[] }) {
  const [state, formAction, pending] = useActionState(createMentorRequest, undefined);

  if (state?.success) {
    return (
      <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
        Request sent! We&apos;ll follow up by email once it&apos;s reviewed — this
        doesn&apos;t book anything automatically.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="mentorId" className="block text-sm font-medium text-slate-700">
          Mentor
        </label>
        <select
          id="mentorId"
          name="mentorId"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.sessionRateCents ? `${formatMoney(m.sessionRateCents)}/session` : "Free"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Your name
        </label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="preferredTimes" className="block text-sm font-medium text-slate-700">
          Preferred times
        </label>
        <textarea
          id="preferredTimes"
          name="preferredTimes"
          required
          rows={2}
          placeholder="e.g. Weekday evenings, or Tuesday/Thursday after 6pm"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-700">
          What do you need help with? (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="agreedToTerms" required className="mt-1" />
        <span>
          I understand this request does not guarantee a session, that a mentor
          or admin must approve it first, and I have read and agree to the{" "}
          <Link
            href="/legal/credit-education-agreement"
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            Credit Education Services Agreement
          </Link>
          .
        </span>
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send request"}
      </button>
    </form>
  );
}
