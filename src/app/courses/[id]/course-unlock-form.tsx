"use client";

import { useActionState } from "react";
import { requestFreeCourseAccess, startCourseCheckout } from "../actions";

export default function CourseUnlockForm({
  courseId,
  isFree,
}: {
  courseId: string;
  isFree: boolean;
}) {
  const action = isFree
    ? requestFreeCourseAccess.bind(null, courseId)
    : startCourseCheckout.bind(null, courseId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <input
        name="name"
        placeholder="Your name"
        required
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        placeholder="Your email"
        required
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Please wait..." : isFree ? "Unlock this course" : "Continue to payment"}
      </button>
    </form>
  );
}
