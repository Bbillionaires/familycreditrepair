"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "./actions";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    resetPasswordAction.bind(null, token),
    undefined
  );

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-slate-700">
          Confirm new password
        </label>
        <input
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Reset password"}
      </button>
    </form>
  );
}
