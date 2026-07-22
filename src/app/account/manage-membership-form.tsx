"use client";

import { useActionState } from "react";
import { openBillingPortal } from "./membership-actions";

export default function ManageMembershipForm() {
  const [state, action, pending] = useActionState(openBillingPortal, undefined);

  return (
    <form action={action} className="mt-3">
      {state?.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "Redirecting..." : "Manage membership"}
      </button>
    </form>
  );
}
