"use client";

import { useState, useTransition } from "react";
import { setLessonCompletion } from "./lesson-completion-actions";

export default function LessonCompleteCheckbox({
  lessonId,
  initiallyComplete,
}: {
  lessonId: string;
  initiallyComplete: boolean;
}) {
  const [completed, setCompleted] = useState(initiallyComplete);
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={completed}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.checked;
          setCompleted(next);
          startTransition(async () => {
            const result = await setLessonCompletion(lessonId, next);
            if ("error" in result) {
              setCompleted(!next);
            }
          });
        }}
        className="h-4 w-4 rounded border-slate-300 text-blue-600"
      />
      Mark as complete
    </label>
  );
}
