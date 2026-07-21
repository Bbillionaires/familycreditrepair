"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { formatMoney } from "@/lib/format";
import { requestFreeCourseAccess, startCourseCheckout } from "@/app/courses/actions";

type Course = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
};

export default function CourseCard({ course }: { course: Course }) {
  const [expanded, setExpanded] = useState(false);
  const isFree = course.priceCents === 0;
  const action = isFree
    ? requestFreeCourseAccess.bind(null, course.id)
    : startCourseCheckout.bind(null, course.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-5">
      {course.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.imageUrl}
          alt={course.title}
          className="mb-3 h-36 w-full rounded-md object-cover"
        />
      )}
      <Link href={`/courses/${course.id}`} className="font-semibold text-slate-900 hover:text-blue-600">
        {course.title}
      </Link>
      <p className="mt-1 flex-1 text-sm text-slate-600">{course.description}</p>
      <p className="mt-3 text-sm font-semibold text-slate-800">{formatMoney(course.priceCents)}</p>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {isFree ? "Get free access" : "Buy now"}
        </button>
      ) : (
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
      )}
    </div>
  );
}
