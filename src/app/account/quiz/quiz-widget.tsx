"use client";

import { useState } from "react";
import Link from "next/link";
import {
  startQuizAttempt,
  submitQuizAttempt,
  type QuizQuestionForClient,
} from "./quiz-actions";

type Answers = Record<string, "A" | "B" | "C" | "D">;

type Result = { score: number; passed: boolean; passThresholdPercent: number };

export default function QuizWidget() {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionForClient[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleStart() {
    setPending(true);
    setError(null);
    const res = await startQuizAttempt();
    if ("error" in res) {
      setError(res.error);
    } else {
      setAttemptId(res.attemptId);
      setQuestions(res.questions);
      setAnswers({});
      setResult(null);
    }
    setPending(false);
  }

  async function handleSubmit() {
    if (!attemptId) return;
    setPending(true);
    setError(null);
    const answerList = Object.entries(answers).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }));
    const res = await submitQuizAttempt(attemptId, answerList);
    if ("error" in res) {
      setError(res.error);
    } else {
      setResult(res);
    }
    setPending(false);
  }

  if (result) {
    return (
      <div className="mt-6 rounded-lg border border-slate-200 p-6 text-center">
        <p className="text-3xl font-bold text-slate-900">{result.score}%</p>
        <p className="mt-2 text-sm text-slate-600">
          {result.passed
            ? `You passed! (${result.passThresholdPercent}% or higher required.)`
            : `Not quite — ${result.passThresholdPercent}% or higher is required to pass.`}
        </p>
        {result.passed && (
          <Link
            href="/account/certificate"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            View your certificate status →
          </Link>
        )}
      </div>
    );
  }

  if (!attemptId) {
    return (
      <div className="mt-4">
        <p className="text-sm text-slate-600">
          Questions are randomly selected from a larger question bank. Passing the quiz is one of
          the requirements for your certificate — you&apos;ll also need to complete every course
          checklist.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={handleStart}
          disabled={pending}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Starting..." : "Start quiz"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-lg border border-slate-200 p-4">
          <p className="font-medium text-slate-900">
            {i + 1}. {q.question}
          </p>
          <div className="mt-3 space-y-2">
            {(["A", "B", "C", "D"] as const).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name={`question-${q.id}`}
                  checked={answers[q.id] === option}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: option }))}
                  className="h-4 w-4 border-slate-300"
                />
                {q[`option${option}` as `option${typeof option}`]}
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Submit quiz"}
      </button>
    </div>
  );
}
