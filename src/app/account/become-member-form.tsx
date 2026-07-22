"use client";

import { useActionState } from "react";
import { startMembershipCheckout } from "./membership-actions";

export default function BecomeMemberForm() {
  const [state, action, pending] = useActionState(startMembershipCheckout, undefined);

  return (
    <form action={action} className="mt-3">
      {state?.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Redirecting..." : "Become a member — $9.99/mo"}
      </button>
    </form>
  );
}
