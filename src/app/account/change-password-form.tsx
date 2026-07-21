"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);

  return (
    <form action={action} className="mt-4 max-w-sm space-y-3">
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-700">
          Password updated. You&apos;ve been signed out of any other devices.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}
