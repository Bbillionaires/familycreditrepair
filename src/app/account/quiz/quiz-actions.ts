"use server";

import { verifyUserSession } from "@/lib/user-session";
import { db } from "@/lib/db";
import { getQuizSettings } from "@/lib/quiz-settings";
import { maybeIssueCertificate } from "@/lib/certificate";

export type QuizQuestionForClient = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

export type StartQuizAttemptResult =
  | { error: string }
  | { attemptId: string; questions: QuizQuestionForClient[] };

export async function startQuizAttempt(): Promise<StartQuizAttemptResult> {
  const session = await verifyUserSession();
  if (!session) return { error: "You must be logged in to take the quiz." };
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.sessionVersion !== session.sessionVersion) {
    return { error: "Your session has expired. Please log in again." };
  }

  if (!user.isComped && user.membershipStatus !== "active") {
    return { error: "An active membership is required to take the certification quiz." };
  }

  const settings = await getQuizSettings();

  const windowStart = new Date(Date.now() - settings.rollingWindowDays * 24 * 60 * 60 * 1000);
  const attemptsInWindow = await db.quizAttempt.count({
    where: { userId: user.id, createdAt: { gte: windowStart } },
  });
  if (attemptsInWindow >= settings.maxAttemptsPerRollingDays) {
    return {
      error: `You've used all ${settings.maxAttemptsPerRollingDays} quiz attempts allowed in a ${settings.rollingWindowDays}-day period. Please try again later.`,
    };
  }

  const publishedQuestions = await db.quizQuestion.findMany({ where: { published: true } });
  if (publishedQuestions.length === 0) {
    return { error: "The certification quiz isn't available yet. Please check back later." };
  }

  const selected = [...publishedQuestions]
    .sort(() => Math.random() - 0.5)
    .slice(0, settings.questionsPerAttempt);

  const attempt = await db.quizAttempt.create({
    data: {
      userId: user.id,
      answers: {
        create: selected.map((q) => ({ questionId: q.id })),
      },
    },
  });

  return {
    attemptId: attempt.id,
    questions: selected.map((q) => ({
      id: q.id,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
    })),
  };
}

export type SubmitQuizAttemptResult =
  | { error: string }
  | { score: number; passed: boolean; passThresholdPercent: number };

export async function submitQuizAttempt(
  attemptId: string,
  answers: { questionId: string; selectedOption: "A" | "B" | "C" | "D" }[]
): Promise<SubmitQuizAttemptResult> {
  const session = await verifyUserSession();
  if (!session) return { error: "You must be logged in to submit the quiz." };
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.sessionVersion !== session.sessionVersion) {
    return { error: "Your session has expired. Please log in again." };
  }

  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: { include: { question: true } } },
  });
  if (!attempt || attempt.userId !== user.id) {
    return { error: "Quiz attempt not found." };
  }
  if (attempt.submittedAt) {
    return { error: "This quiz attempt has already been submitted." };
  }

  const selectedByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedOption]));

  let correctCount = 0;
  let gradableCount = 0;
  for (const answerRow of attempt.answers) {
    if (!answerRow.question) continue; // question was deleted after this attempt started
    gradableCount++;
    const selected = selectedByQuestionId.get(answerRow.questionId!) ?? null;
    const isCorrect = selected === answerRow.question.correctOption;
    if (isCorrect) correctCount++;
    await db.quizAttemptAnswer.update({
      where: { id: answerRow.id },
      data: { selectedOption: selected, correct: isCorrect },
    });
  }

  const score = gradableCount > 0 ? Math.round((correctCount / gradableCount) * 100) : 0;
  const settings = await getQuizSettings();
  const passed = score >= settings.passThresholdPercent;

  await db.quizAttempt.update({
    where: { id: attempt.id },
    data: { submittedAt: new Date(), score, passed },
  });

  if (passed) {
    await maybeIssueCertificate(user.id);
  }

  return { score, passed, passThresholdPercent: settings.passThresholdPercent };
}
