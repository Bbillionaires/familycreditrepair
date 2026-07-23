"use client";

import { useActionState } from "react";
import { updateQuizSettings } from "./actions";

type Props = {
  defaultValues: {
    questionsPerAttempt: number;
    passThresholdPercent: number;
    maxAttemptsPerRollingDays: number;
    rollingWindowDays: number;
  };
};

export default function QuizSettingsForm({ defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(updateQuizSettings, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="questionsPerAttempt" className="block text-sm font-medium text-slate-700">
          Questions per attempt
        </label>
        <input
          id="questionsPerAttempt"
          name="questionsPerAttempt"
          type="number"
          min={1}
          defaultValue={defaultValues.questionsPerAttempt}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="passThresholdPercent" className="block text-sm font-medium text-slate-700">
          Passing score (%)
        </label>
        <input
          id="passThresholdPercent"
          name="passThresholdPercent"
          type="number"
          min={1}
          max={100}
          defaultValue={defaultValues.passThresholdPercent}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="maxAttemptsPerRollingDays" className="block text-sm font-medium text-slate-700">
          Max attempts per rolling window
        </label>
        <input
          id="maxAttemptsPerRollingDays"
          name="maxAttemptsPerRollingDays"
          type="number"
          min={1}
          defaultValue={defaultValues.maxAttemptsPerRollingDays}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="rollingWindowDays" className="block text-sm font-medium text-slate-700">
          Rolling window (days)
        </label>
        <input
          id="rollingWindowDays"
          name="rollingWindowDays"
          type="number"
          min={1}
          defaultValue={defaultValues.rollingWindowDays}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
