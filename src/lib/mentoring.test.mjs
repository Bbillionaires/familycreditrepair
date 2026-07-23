import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// Same DB-direct pattern as membership.test.mjs / account-dashboard.test.mjs.
// Confirmed empirically (not assumed) that src/app/mentoring/actions.ts and
// src/app/admin/mentoring/actions.ts can't be imported into a plain Node test
// process either: both import src/lib/email.ts, which has a top-level
// `import "server-only"` guard that throws unconditionally outside Next's
// own bundler — the same constraint already documented for src/lib/stripe.ts
// (membership.test.mjs) and src/lib/db.ts (purchase-cascade.test.mjs).
// Each test below exercises the exact same Prisma operation/query shape the
// real action's source performs, against a standalone PrismaClient.

const hasDb = Boolean(process.env.DATABASE_URL);

async function makeMentor(db, suffix, overrides = {}) {
  return db.mentor.create({
    data: {
      name: `Test Mentor ${suffix}`,
      email: `mentor-${suffix}@example.com`,
      ...overrides,
    },
  });
}

test(
  "new Mentor rows default to active:true, notifyMentorOnRequest:false, sessionRateCents:null",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const mentor = await makeMentor(db, "defaults1");
      assert.equal(mentor.active, true);
      assert.equal(mentor.notifyMentorOnRequest, false);
      assert.equal(mentor.sessionRateCents, null);
      await db.mentor.delete({ where: { id: mentor.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "public mentor listing query only returns active mentors",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const activeMentor = await makeMentor(db, "listing-active", { active: true });
      const inactiveMentor = await makeMentor(db, "listing-inactive", { active: false });

      // Exact query shape used by src/app/mentoring/page.tsx.
      const listed = await db.mentor.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      });

      const ids = listed.map((m) => m.id);
      assert.ok(ids.includes(activeMentor.id), "active mentor must appear in the public listing");
      assert.ok(!ids.includes(inactiveMentor.id), "inactive mentor must not appear in the public listing");

      await db.mentor.delete({ where: { id: activeMentor.id } });
      await db.mentor.delete({ where: { id: inactiveMentor.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "creating a MentorRequest for a valid, active mentor succeeds and defaults status to 'pending'",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const mentor = await makeMentor(db, "request1");

      // Exact shape of createMentorRequest's db.mentorRequest.create call.
      const request = await db.mentorRequest.create({
        data: {
          mentorId: mentor.id,
          name: "Jane Requester",
          email: "jane@example.com",
          preferredTimes: "Weekday evenings",
          message: "Need help understanding my credit report.",
          agreedToTerms: true,
          status: "pending",
        },
      });

      assert.equal(request.status, "pending");
      assert.equal(request.mentorId, mentor.id);
      assert.equal(request.agreedToTerms, true);

      await db.mentorRequest.delete({ where: { id: request.id } });
      await db.mentor.delete({ where: { id: mentor.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "the exact query createMentorRequest uses to validate a mentor correctly signals inactive vs missing",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const inactiveMentor = await makeMentor(db, "guard-inactive", { active: false });

      // Exact lookup shape from createMentorRequest.
      const foundInactive = await db.mentor.findUnique({ where: { id: inactiveMentor.id } });
      assert.ok(foundInactive, "the mentor row itself must still be found");
      assert.equal(
        !foundInactive || !foundInactive.active,
        true,
        "the action's `!mentor || !mentor.active` guard must evaluate true for an inactive mentor"
      );

      const foundMissing = await db.mentor.findUnique({ where: { id: "nonexistent-mentor-id-xyz" } });
      assert.equal(foundMissing, null);
      assert.equal(
        !foundMissing || !foundMissing?.active,
        true,
        "the action's guard must also evaluate true for a mentor id that doesn't exist"
      );

      await db.mentor.delete({ where: { id: inactiveMentor.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "deleting a Mentor with an existing MentorRequest keeps the request row and sets mentorId to null (onDelete: SetNull)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const mentor = await makeMentor(db, "delete-setnull");
      const request = await db.mentorRequest.create({
        data: {
          mentorId: mentor.id,
          name: "Requester",
          email: "requester-setnull@example.com",
          preferredTimes: "Anytime",
          agreedToTerms: true,
          status: "pending",
        },
      });

      await db.mentor.delete({ where: { id: mentor.id } });

      const survived = await db.mentorRequest.findUnique({ where: { id: request.id } });
      assert.ok(survived, "the MentorRequest row must survive the mentor's deletion");
      assert.equal(survived.mentorId, null, "mentorId must be nulled out, not left dangling");
      assert.equal(survived.name, "Requester", "the rest of the request's data must be untouched");

      await db.mentorRequest.delete({ where: { id: request.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "deleting a Mentor with no existing requests succeeds with no error",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const mentor = await makeMentor(db, "delete-clean");
      await assert.doesNotReject(db.mentor.delete({ where: { id: mentor.id } }));
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "MentorRequest status can be independently set to 'approved' or 'declined', matching the admin actions' write shape",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const mentor = await makeMentor(db, "status-transitions");
      const request = await db.mentorRequest.create({
        data: {
          mentorId: mentor.id,
          name: "Requester",
          email: "requester-status@example.com",
          preferredTimes: "Anytime",
          agreedToTerms: true,
          status: "pending",
        },
      });

      // Exact update shape from approveMentorRequest.
      const approved = await db.mentorRequest.update({
        where: { id: request.id },
        data: { status: "approved" },
      });
      assert.equal(approved.status, "approved");

      // Idempotency guard (`if (request.status !== "pending") return;`) lives in
      // the action itself, which can't be imported here (see file header) — this
      // confirms the data-shape precondition the guard checks is correct: once
      // approved, the row's status is no longer "pending", so a second call would
      // correctly be skipped by that check. The control-flow branch itself is not
      // covered by an automated test in this environment.
      const reFetched = await db.mentorRequest.findUnique({ where: { id: request.id } });
      assert.notEqual(reFetched.status, "pending");

      await db.mentorRequest.delete({ where: { id: request.id } });
      await db.mentor.delete({ where: { id: mentor.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "long free-text message/preferredTimes are stored and read back intact (no length cap)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const mentor = await makeMentor(db, "long-text");
      const longText = "x".repeat(5000);

      const request = await db.mentorRequest.create({
        data: {
          mentorId: mentor.id,
          name: "Requester",
          email: "requester-longtext@example.com",
          preferredTimes: longText,
          message: longText,
          agreedToTerms: true,
          status: "pending",
        },
      });

      assert.equal(request.preferredTimes.length, 5000);
      assert.equal(request.message.length, 5000);

      await db.mentorRequest.delete({ where: { id: request.id } });
      await db.mentor.delete({ where: { id: mentor.id } });
    } finally {
      await db.$disconnect();
    }
  }
);
