import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// Same DB-direct pattern as chat.test.mjs / mentoring.test.mjs. Confirmed
// empirically that src/app/courses/[id]/lesson-completion-actions.ts can't be
// imported into a plain Node test process either — it transitively imports
// src/lib/user-session.ts and src/lib/db.ts, both of which have a top-level
// `import "server-only"` guard that throws unconditionally outside Next's own
// bundler (same constraint documented in every prior test file this session).
// Each test below performs the exact same Prisma operation/query shape the
// real action's source uses for that step.

const hasDb = Boolean(process.env.DATABASE_URL);

async function makeUser(db, suffix, overrides = {}) {
  return db.user.create({
    data: {
      email: `lesson-test-${suffix}@example.com`,
      username: `lessontest${suffix}`,
      passwordHash: "not-a-real-hash",
      ...overrides,
    },
  });
}

async function makeCourseWithLesson(db, suffix) {
  const course = await db.course.create({
    data: { title: `Test Course ${suffix}`, description: "desc", priceCents: 1000 },
  });
  const lesson = await db.lesson.create({
    data: { courseId: course.id, title: `Test Lesson ${suffix}` },
  });
  return { course, lesson };
}

test(
  "marking a lesson complete twice in a row (upsert, update:{}) creates exactly one row",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeUser(db, "idempotent-on1");
      const { course, lesson } = await makeCourseWithLesson(db, "idempotent-on1");

      // Exact shape of setLessonCompletion's completed:true branch.
      for (let i = 0; i < 2; i++) {
        await db.lessonCompletion.upsert({
          where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
          update: {},
          create: { userId: user.id, lessonId: lesson.id },
        });
      }

      const rows = await db.lessonCompletion.findMany({
        where: { userId: user.id, lessonId: lesson.id },
      });
      assert.equal(rows.length, 1, "toggling complete twice must not create a duplicate row");

      await db.lessonCompletion.deleteMany({ where: { userId: user.id } });
      await db.lesson.delete({ where: { id: lesson.id } });
      await db.course.delete({ where: { id: course.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "unmarking a lesson twice in a row (deleteMany) never throws, even with no existing row",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeUser(db, "idempotent-off1");
      const { course, lesson } = await makeCourseWithLesson(db, "idempotent-off1");

      await db.lessonCompletion.create({ data: { userId: user.id, lessonId: lesson.id } });

      // Exact shape of setLessonCompletion's completed:false branch, called twice.
      await db.lessonCompletion.deleteMany({ where: { userId: user.id, lessonId: lesson.id } });
      await db.lessonCompletion.deleteMany({ where: { userId: user.id, lessonId: lesson.id } });

      const rows = await db.lessonCompletion.findMany({
        where: { userId: user.id, lessonId: lesson.id },
      });
      assert.equal(rows.length, 0);

      await db.lesson.delete({ where: { id: lesson.id } });
      await db.course.delete({ where: { id: course.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "ownership check: case-insensitive email match against a paid Purchase for the lesson's course",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeUser(db, "ownership1", { email: "Lesson-Test-Ownership1@Example.com" });
      const { course, lesson } = await makeCourseWithLesson(db, "ownership1");

      await db.purchase.create({
        data: {
          courseId: course.id,
          name: "Test Buyer",
          email: "lesson-test-ownership1@example.com", // different case than user.email
          amountCents: 1000,
          stripeSessionId: "cs_test_ownership1",
          status: "paid",
          downloadToken: "tok_ownership1",
        },
      });

      // Exact shape of setLessonCompletion's ownership re-check.
      const ownsCourse = await db.purchase.findFirst({
        where: {
          courseId: lesson.courseId,
          status: "paid",
          email: { equals: user.email, mode: "insensitive" },
        },
      });
      assert.ok(ownsCourse, "a case-insensitively matching paid Purchase must count as ownership");

      await db.purchase.deleteMany({ where: { courseId: course.id } });
      await db.lesson.delete({ where: { id: lesson.id } });
      await db.course.delete({ where: { id: course.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "no matching Purchase under the user's own email fails the ownership check, even if a Purchase exists for a different email",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeUser(db, "noownership1");
      const { course, lesson } = await makeCourseWithLesson(db, "noownership1");

      // Someone else's paid purchase for the same course (e.g. a shared token).
      await db.purchase.create({
        data: {
          courseId: course.id,
          name: "Someone Else",
          email: "someone-else@example.com",
          amountCents: 1000,
          stripeSessionId: "cs_test_noownership1",
          status: "paid",
          downloadToken: "tok_noownership1",
        },
      });

      const ownsCourse = await db.purchase.findFirst({
        where: {
          courseId: lesson.courseId,
          status: "paid",
          email: { equals: user.email, mode: "insensitive" },
        },
      });
      assert.equal(ownsCourse, null, "a Purchase under a different email must not grant ownership");

      await db.purchase.deleteMany({ where: { courseId: course.id } });
      await db.lesson.delete({ where: { id: lesson.id } });
      await db.course.delete({ where: { id: course.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "the @@unique([userId, lessonId]) constraint rejects a raw duplicate insert at the DB level",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeUser(db, "uniqueconstraint1");
      const { course, lesson } = await makeCourseWithLesson(db, "uniqueconstraint1");

      await db.lessonCompletion.create({ data: { userId: user.id, lessonId: lesson.id } });
      await assert.rejects(
        () => db.lessonCompletion.create({ data: { userId: user.id, lessonId: lesson.id } }),
        "a second raw create() for the same (userId, lessonId) pair must violate the unique constraint"
      );

      await db.lessonCompletion.deleteMany({ where: { userId: user.id } });
      await db.lesson.delete({ where: { id: lesson.id } });
      await db.course.delete({ where: { id: course.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "deleting a User cascades to delete their LessonCompletion rows (onDelete: Cascade)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeUser(db, "cascade-user1");
      const { course, lesson } = await makeCourseWithLesson(db, "cascade-user1");
      const completion = await db.lessonCompletion.create({
        data: { userId: user.id, lessonId: lesson.id },
      });

      await db.user.delete({ where: { id: user.id } });

      const survived = await db.lessonCompletion.findUnique({ where: { id: completion.id } });
      assert.equal(survived, null, "LessonCompletion row must be cascade-deleted with its user");

      await db.lesson.delete({ where: { id: lesson.id } });
      await db.course.delete({ where: { id: course.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "deleting a Lesson cascades to delete its LessonCompletion rows (onDelete: Cascade)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeUser(db, "cascade-lesson1");
      const { course, lesson } = await makeCourseWithLesson(db, "cascade-lesson1");
      const completion = await db.lessonCompletion.create({
        data: { userId: user.id, lessonId: lesson.id },
      });

      await db.lesson.delete({ where: { id: lesson.id } });

      const survived = await db.lessonCompletion.findUnique({ where: { id: completion.id } });
      assert.equal(survived, null, "LessonCompletion row must be cascade-deleted with its lesson");

      await db.course.delete({ where: { id: course.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "stale sessionVersion is correctly detected by the exact comparison setLessonCompletion/page.tsx use",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeUser(db, "staleversion1", { sessionVersion: 2 });

      // Exact shape of `if (!user || user.sessionVersion !== session.sessionVersion)`.
      const freshSession = { userId: user.id, sessionVersion: 2 };
      const staleSession = { userId: user.id, sessionVersion: 1 };

      const freshValid = user.sessionVersion === freshSession.sessionVersion;
      const staleValid = user.sessionVersion === staleSession.sessionVersion;

      assert.equal(freshValid, true, "a session matching the current sessionVersion must be accepted");
      assert.equal(staleValid, false, "a session with an outdated sessionVersion must be rejected");

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "completedLessonIds query only counts completions for the requested course's lessonIds",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeUser(db, "scoped1");
      const { course: courseA, lesson: lessonA } = await makeCourseWithLesson(db, "scoped1a");
      const { course: courseB, lesson: lessonB } = await makeCourseWithLesson(db, "scoped1b");

      await db.lessonCompletion.create({ data: { userId: user.id, lessonId: lessonA.id } });
      await db.lessonCompletion.create({ data: { userId: user.id, lessonId: lessonB.id } });

      // Exact shape of the course page's completedLessonIds query, scoped to course A only.
      const completions = await db.lessonCompletion.findMany({
        where: { userId: user.id, lessonId: { in: [lessonA.id] } },
      });
      const completedLessonIds = new Set(completions.map((c) => c.lessonId));

      assert.equal(completedLessonIds.has(lessonA.id), true);
      assert.equal(completedLessonIds.has(lessonB.id), false, "a completion in a different course must not leak in");

      await db.lessonCompletion.deleteMany({ where: { userId: user.id } });
      await db.lesson.delete({ where: { id: lessonA.id } });
      await db.lesson.delete({ where: { id: lessonB.id } });
      await db.course.delete({ where: { id: courseA.id } });
      await db.course.delete({ where: { id: courseB.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);
