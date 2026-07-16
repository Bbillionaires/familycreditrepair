"use client";

import { useActionState } from "react";
import { createSignup } from "./actions";

export default function SignupForm({ classSessionId }: { classSessionId: string }) {
  const [state, formAction, pending] = useActionState(
    createSignup.bind(null, classSessionId),
    undefined
  );

  if (state?.success) {
    return (
      <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
        You&apos;re signed up! We&apos;ll see you there &mdash; this class is free.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-2">
      <input
        name="name"
        placeholder="Your name"
        required
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          name="phone"
          placeholder="Phone (optional)"
          className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="familySize"
          type="number"
          min={1}
          placeholder="# attending"
          className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Signing up..." : "Reserve my free spot"}
      </button>
    </form>
  );
}
