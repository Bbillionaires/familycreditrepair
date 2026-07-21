"use client";

import { useActionState } from "react";
import { forgotUsernameAction } from "./actions";

export default function ForgotUsernameForm() {
  const [state, action, pending] = useActionState(forgotUsernameAction, undefined);

  if (state?.success) {
    return (
      <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
        If that email is registered, we&apos;ve sent the username to it.
      </p>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send my username"}
      </button>
    </form>
  );
}
