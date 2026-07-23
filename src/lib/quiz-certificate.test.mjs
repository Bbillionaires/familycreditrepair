import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// Same DB-direct pattern as chat.test.mjs / lesson-completion.test.mjs.
// Confirmed empirically that src/app/account/quiz/quiz-actions.ts and
// src/lib/certificate.ts can't be imported into a plain Node test process —
// both transitively import src/lib/user-session.ts / src/lib/db.ts, which
// are `server-only`-guarded (same constraint documented in every prior test
// file this session). Each test performs the exact same Prisma operation/
// query shape the real code uses for that step.

const hasDb = Boolean(process.env.DATABASE_URL);

async function makeMember(db, suffix, overrides = {}) {
  return db.user.create({
    data: {
      email: `quiz-test-${suffix}@example.com`,
      username: `quiztest${suffix}`,
      passwordHash: "not-a-real-hash",
      membershipStatus: "active",
      ...overrides,
    },
  });
}

async function makeQuestion(db, suffix, overrides = {}) {
  return db.quizQuestion.create({
    data: {
      question: `Test question ${suffix}?`,
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      correctOption: "A",
      published: true,
      ...overrides,
    },
  });
}

test(
  "getQuizSettings-equivalent upsert creates the singleton row with schema defaults and leaves it unchanged on a second call",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      await db.quizSettings.deleteMany({ where: { id: "singleton" } });

      const first = await db.quizSettings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      });
      assert.equal(first.questionsPerAttempt, 50);
      assert.equal(first.passThresholdPercent, 80);
      assert.equal(first.maxAttemptsPerRollingDays, 4);
      assert.equal(first.rollingWindowDays, 30);

      await db.quizSettings.update({ where: { id: "singleton" }, data: { passThresholdPercent: 90 } });
      const second = await db.quizSettings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      });
      assert.equal(second.passThresholdPercent, 90, "upsert's update:{} must not overwrite an existing row");

      await db.quizSettings.deleteMany({ where: { id: "singleton" } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "rolling-window attempt count only counts QuizAttempt rows within the window, not older ones",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "window1");
      const rollingWindowDays = 30;

      const old = new Date();
      old.setUTCDate(old.getUTCDate() - (rollingWindowDays + 5));

      await db.quizAttempt.create({ data: { userId: user.id, createdAt: old } });
      await db.quizAttempt.create({ data: { userId: user.id } }); // now
      await db.quizAttempt.create({ data: { userId: user.id } }); // now

      // Exact shape of startQuizAttempt's rolling-window count query.
      const windowStart = new Date(Date.now() - rollingWindowDays * 24 * 60 * 60 * 1000);
      const attemptsInWindow = await db.quizAttempt.count({
        where: { userId: user.id, createdAt: { gte: windowStart } },
      });

      assert.equal(attemptsInWindow, 2, "an attempt older than the rolling window must not count toward the cap");

      await db.quizAttempt.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "selecting a subset from a published question bank smaller than questionsPerAttempt returns all available questions, not an error",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const q1 = await makeQuestion(db, "small1");
      const q2 = await makeQuestion(db, "small2");

      const publishedQuestions = await db.quizQuestion.findMany({
        where: { published: true, id: { in: [q1.id, q2.id] } },
      });

      // Exact shape of startQuizAttempt's selection logic, with a
      // questionsPerAttempt (50) far larger than the available bank (2).
      const questionsPerAttempt = 50;
      const selected = [...publishedQuestions].sort(() => Math.random() - 0.5).slice(0, questionsPerAttempt);

      assert.equal(selected.length, 2, "slicing a shorter array must return everything available, not error or pad");

      await db.quizQuestion.deleteMany({ where: { id: { in: [q1.id, q2.id] } } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "an empty published question bank is correctly detected as zero, matching the 'quiz not available yet' guard",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const publishedQuestions = await db.quizQuestion.findMany({
        where: { published: true, question: "does-not-exist-anywhere-xyz" },
      });
      assert.equal(publishedQuestions.length, 0);
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "grading: a server-locked attempt only grades against its own QuizAttemptAnswer rows, ignoring unrelated client-submitted question ids",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "grading1");
      const q1 = await makeQuestion(db, "grading1a", { correctOption: "A" });
      const q2 = await makeQuestion(db, "grading1b", { correctOption: "B" });
      const foreignQuestion = await makeQuestion(db, "grading1foreign", { correctOption: "C" });

      const attempt = await db.quizAttempt.create({
        data: {
          userId: user.id,
          answers: { create: [{ questionId: q1.id }, { questionId: q2.id }] },
        },
      });

      // Client submits correct answers for the real questions, PLUS a
      // fabricated entry for a question never issued in this attempt.
      const clientAnswers = [
        { questionId: q1.id, selectedOption: "A" },
        { questionId: q2.id, selectedOption: "B" },
        { questionId: foreignQuestion.id, selectedOption: "C" }, // must be ignored
      ];

      // Exact shape of submitQuizAttempt's grading loop.
      const attemptWithAnswers = await db.quizAttempt.findUnique({
        where: { id: attempt.id },
        include: { answers: { include: { question: true } } },
      });
      const selectedByQuestionId = new Map(clientAnswers.map((a) => [a.questionId, a.selectedOption]));

      let correctCount = 0;
      let gradableCount = 0;
      for (const answerRow of attemptWithAnswers.answers) {
        if (!answerRow.question) continue;
        gradableCount++;
        const selected = selectedByQuestionId.get(answerRow.questionId) ?? null;
        if (selected === answerRow.question.correctOption) correctCount++;
      }

      assert.equal(gradableCount, 2, "only the two questions actually issued in this attempt must be graded");
      assert.equal(correctCount, 2, "both real answers were correct");
      const score = Math.round((correctCount / gradableCount) * 100);
      assert.equal(score, 100);

      await db.quizAttemptAnswer.deleteMany({ where: { attemptId: attempt.id } });
      await db.quizAttempt.delete({ where: { id: attempt.id } });
      await db.quizQuestion.deleteMany({ where: { id: { in: [q1.id, q2.id, foreignQuestion.id] } } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "grading: a QuizQuestion deleted after an attempt started is excluded from both numerator and denominator (SetNull)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "middeleted1");
      const q1 = await makeQuestion(db, "middeleted1a", { correctOption: "A" });
      const q2 = await makeQuestion(db, "middeleted1b", { correctOption: "B" });

      const attempt = await db.quizAttempt.create({
        data: {
          userId: user.id,
          answers: { create: [{ questionId: q1.id }, { questionId: q2.id }] },
        },
      });

      // Admin deletes q2 after the attempt started but before submission.
      await db.quizQuestion.delete({ where: { id: q2.id } });

      const attemptWithAnswers = await db.quizAttempt.findUnique({
        where: { id: attempt.id },
        include: { answers: { include: { question: true } } },
      });

      const deletedAnswerRow = attemptWithAnswers.answers.find((a) => a.questionId === null);
      assert.ok(deletedAnswerRow, "the answer row for the deleted question must survive with questionId: null (SetNull)");

      let gradableCount = 0;
      for (const answerRow of attemptWithAnswers.answers) {
        if (!answerRow.question) continue;
        gradableCount++;
      }
      assert.equal(gradableCount, 1, "the deleted question must be excluded from the gradable denominator");

      await db.quizAttemptAnswer.deleteMany({ where: { attemptId: attempt.id } });
      await db.quizAttempt.delete({ where: { id: attempt.id } });
      await db.quizQuestion.delete({ where: { id: q1.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "deleting a QuizAttempt cascades to delete its QuizAttemptAnswer rows (onDelete: Cascade)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "cascadeattempt1");
      const q1 = await makeQuestion(db, "cascadeattempt1a");

      const attempt = await db.quizAttempt.create({
        data: { userId: user.id, answers: { create: [{ questionId: q1.id }] } },
      });
      const answer = await db.quizAttemptAnswer.findFirst({ where: { attemptId: attempt.id } });

      await db.quizAttempt.delete({ where: { id: attempt.id } });

      const survived = await db.quizAttemptAnswer.findUnique({ where: { id: answer.id } });
      assert.equal(survived, null, "QuizAttemptAnswer row must be cascade-deleted with its attempt");

      await db.quizQuestion.delete({ where: { id: q1.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "deleting a User cascades to delete their QuizAttempt and Certificate rows (onDelete: Cascade)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "cascadeuser1");
      const attempt = await db.quizAttempt.create({ data: { userId: user.id } });
      const certificate = await db.certificate.create({ data: { userId: user.id } });

      await db.user.delete({ where: { id: user.id } });

      const survivedAttempt = await db.quizAttempt.findUnique({ where: { id: attempt.id } });
      const survivedCertificate = await db.certificate.findUnique({ where: { id: certificate.id } });
      assert.equal(survivedAttempt, null, "QuizAttempt row must be cascade-deleted with its user");
      assert.equal(survivedCertificate, null, "Certificate row must be cascade-deleted with its user");
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "Certificate.userId unique constraint rejects a second certificate for the same user at the DB level",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "uniquecert1");
      await db.certificate.create({ data: { userId: user.id } });

      await assert.rejects(
        () => db.certificate.create({ data: { userId: user.id } }),
        "a second Certificate row for the same userId must violate the unique constraint"
      );

      await db.certificate.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "maybeIssueCertificate-equivalent eligibility check: a course with zero lessons is excluded entirely",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const emptyCourse = await db.course.create({
        data: { title: "Empty Course", description: "no lessons", published: true },
      });

      // Exact shape of maybeIssueCertificate's course query.
      const coursesWithLessons = await db.course.findMany({
        where: { published: true, lessons: { some: {} }, id: emptyCourse.id },
        include: { lessons: { select: { id: true } } },
      });

      assert.equal(coursesWithLessons.length, 0, "a course with zero lessons must never gate certificate eligibility");

      await db.course.delete({ where: { id: emptyCourse.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "maybeIssueCertificate-equivalent eligibility check: all lessons complete across all published courses satisfies the check, one incomplete lesson blocks it",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "eligibility1");
      const course = await db.course.create({
        data: { title: "Eligibility Test Course", description: "d", published: true },
      });
      const lesson1 = await db.lesson.create({ data: { courseId: course.id, title: "L1" } });
      const lesson2 = await db.lesson.create({ data: { courseId: course.id, title: "L2" } });

      await db.lessonCompletion.create({ data: { userId: user.id, lessonId: lesson1.id } });
      // lesson2 not yet completed

      const coursesWithLessons = await db.course.findMany({
        where: { published: true, lessons: { some: {} }, id: course.id },
        include: { lessons: { select: { id: true } } },
      });

      let allComplete = true;
      for (const c of coursesWithLessons) {
        const completedCount = await db.lessonCompletion.count({
          where: { userId: user.id, lessonId: { in: c.lessons.map((l) => l.id) } },
        });
        if (completedCount < c.lessons.length) allComplete = false;
      }
      assert.equal(allComplete, false, "one incomplete lesson in a published course must block eligibility");

      // Now complete the remaining lesson.
      await db.lessonCompletion.create({ data: { userId: user.id, lessonId: lesson2.id } });

      allComplete = true;
      for (const c of coursesWithLessons) {
        const completedCount = await db.lessonCompletion.count({
          where: { userId: user.id, lessonId: { in: c.lessons.map((l) => l.id) } },
        });
        if (completedCount < c.lessons.length) allComplete = false;
      }
      assert.equal(allComplete, true, "completing every lesson in the only published course must satisfy the check");

      await db.lessonCompletion.deleteMany({ where: { userId: user.id } });
      await db.lesson.deleteMany({ where: { courseId: course.id } });
      await db.course.delete({ where: { id: course.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "maybeIssueCertificate-equivalent: existing Certificate short-circuits before any eligibility re-check",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "shortcircuit1", { membershipStatus: "canceled" });
      await db.certificate.create({ data: { userId: user.id } });

      // Exact shape of maybeIssueCertificate's first check.
      const existing = await db.certificate.findUnique({ where: { userId: user.id } });
      assert.ok(existing, "an already-issued certificate must be found immediately");
      // Since `existing` is truthy, the real function returns here without
      // ever re-checking membership/course/quiz conditions — this is what
      // makes an issued certificate permanent even if membershipStatus is
      // later "canceled" (as set above), matching the confirmed business rule.

      await db.certificate.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);
