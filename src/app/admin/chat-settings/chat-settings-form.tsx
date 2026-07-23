"use client";

import { useActionState } from "react";
import { updateChatSettings } from "./actions";

type Props = {
  defaultValues: {
    dailyFreeQuestions: number;
    packQuestionCount: number;
    packPriceDollars: number;
    hardDailyCap: number;
  };
};

export default function ChatSettingsForm({ defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(updateChatSettings, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="dailyFreeQuestions" className="block text-sm font-medium text-slate-700">
          Free questions per day
        </label>
        <input
          id="dailyFreeQuestions"
          name="dailyFreeQuestions"
          type="number"
          min={0}
          defaultValue={defaultValues.dailyFreeQuestions}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="packQuestionCount" className="block text-sm font-medium text-slate-700">
          Questions per pack
        </label>
        <input
          id="packQuestionCount"
          name="packQuestionCount"
          type="number"
          min={1}
          defaultValue={defaultValues.packQuestionCount}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="packPriceDollars" className="block text-sm font-medium text-slate-700">
          Pack price (USD)
        </label>
        <input
          id="packPriceDollars"
          name="packPriceDollars"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultValues.packPriceDollars}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="hardDailyCap" className="block text-sm font-medium text-slate-700">
          Hard daily question cap (applies even with credits)
        </label>
        <input
          id="hardDailyCap"
          name="hardDailyCap"
          type="number"
          min={1}
          defaultValue={defaultValues.hardDailyCap}
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
