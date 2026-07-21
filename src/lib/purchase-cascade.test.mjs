import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// These tests hit a real database (same pattern prisma/seed.ts already uses
// to construct its own client directly, sidestepping src/lib/db.ts's
// "server-only" guard, which throws unconditionally outside Next's own
// bundler — confirmed empirically, not assumed). They require DATABASE_URL
// to be a real reachable Postgres. CI does not currently have one
// configured (see task #12 / .pipeline/review.md from the prior task), so
// these tests skip cleanly rather than failing when it's absent, instead of
// turning an otherwise-passing `npm test` red for an unrelated, already-
// tracked infrastructure gap.

const hasDb = Boolean(process.env.DATABASE_URL);

test(
  "deleting a Material with an existing Purchase succeeds and sets Purchase.materialId to null (not blocked by RESTRICT)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const material = await db.material.create({
        data: {
          title: "Cascade Test Material",
          description: "temp",
          fileUrl: "https://example.com/x.pdf",
        },
      });

      const purchase = await db.purchase.create({
        data: {
          materialId: material.id,
          name: "Test",
          email: "cascade-test@example.com",
          amountCents: 0,
          stripeSessionId: `test_${material.id}`,
          status: "paid",
          downloadToken: `test_token_${material.id}`,
        },
      });

      // This is the exact behavior change flagged in .pipeline/changes.md:
      // making Purchase.materialId optional switched Prisma's generated FK
      // onDelete from RESTRICT (blocks deletion) to SET NULL (allows it,
      // orphans the row). Assert the ACTUAL current behavior, not the old
      // assumed one.
      await assert.doesNotReject(() => db.material.delete({ where: { id: material.id } }));

      const reloaded = await db.purchase.findUnique({ where: { id: purchase.id } });
      assert.ok(reloaded, "Purchase row should still exist after Material deletion");
      assert.equal(reloaded.materialId, null, "materialId should be nulled out, not left dangling");

      await db.purchase.delete({ where: { id: purchase.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "deleting a Course with an existing Purchase behaves the same way (SET NULL), for symmetry with Material",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const course = await db.course.create({
        data: { title: "Cascade Test Course", description: "temp" },
      });

      const purchase = await db.purchase.create({
        data: {
          courseId: course.id,
          name: "Test",
          email: "cascade-test-course@example.com",
          amountCents: 0,
          stripeSessionId: `test_course_${course.id}`,
          status: "paid",
          downloadToken: `test_token_course_${course.id}`,
        },
      });

      await assert.doesNotReject(() => db.course.delete({ where: { id: course.id } }));

      const reloaded = await db.purchase.findUnique({ where: { id: purchase.id } });
      assert.ok(reloaded);
      assert.equal(reloaded.courseId, null);

      await db.purchase.delete({ where: { id: purchase.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "deleting a Course cascades to delete its Lessons (onDelete: Cascade, as spec'd)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const course = await db.course.create({
        data: { title: "Cascade Lessons Test Course", description: "temp" },
      });
      const lesson = await db.lesson.create({
        data: { courseId: course.id, title: "temp lesson" },
      });

      await db.course.delete({ where: { id: course.id } });

      const reloadedLesson = await db.lesson.findUnique({ where: { id: lesson.id } });
      assert.equal(reloadedLesson, null, "Lesson should be cascade-deleted with its Course");
    } finally {
      await db.$disconnect();
    }
  }
);
