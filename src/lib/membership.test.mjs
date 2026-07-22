import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// Same DB-direct pattern as account-dashboard.test.mjs / purchase-cascade.test.mjs.
// These tests do NOT import src/app/api/stripe/webhook/route.ts directly —
// confirmed empirically that it can't be: it transitively imports
// src/lib/stripe.ts, which has a top-level `import "server-only"` guard that
// throws unconditionally outside Next's own bundler (same constraint already
// documented in purchase-cascade.test.mjs for src/lib/db.ts). Instead, each
// test below performs the exact same Prisma operation (same where/data
// shape) that the webhook handler's source performs for that event type, so
// a regression in the underlying query shape or schema (e.g. someone
// changes membershipStatus's default, or drops the stripeSubscriptionId
// unique constraint the updateMany-by-subscription-id lookup relies on for
// precision) fails a test instead of only surfacing in production.

const hasDb = Boolean(process.env.DATABASE_URL);

async function makeTestUser(db, suffix) {
  return db.user.create({
    data: {
      email: `membership-test-${suffix}@example.com`,
      username: `membertest${suffix}`,
      passwordHash: "not-a-real-hash",
    },
  });
}

test(
  "new User rows default to membershipStatus:'none' and isComped:false",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeTestUser(db, "defaults1");
      assert.equal(user.membershipStatus, "none");
      assert.equal(user.isComped, false);
      assert.equal(user.stripeCustomerId, null);
      assert.equal(user.stripeSubscriptionId, null);
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "checkout.session.completed (subscription) write shape activates membership for the referenced user",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeTestUser(db, "activate1");

      // Exact shape of route.ts's checkout.session.completed (mode: "subscription") branch.
      await db.user.updateMany({
        where: { id: user.id },
        data: {
          stripeCustomerId: "cus_test_activate1",
          stripeSubscriptionId: "sub_test_activate1",
          membershipStatus: "active",
        },
      });

      const updated = await db.user.findUnique({ where: { id: user.id } });
      assert.equal(updated.membershipStatus, "active");
      assert.equal(updated.stripeCustomerId, "cus_test_activate1");
      assert.equal(updated.stripeSubscriptionId, "sub_test_activate1");

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "customer.subscription.updated write shape (status:past_due) marks membership past_due by subscription id",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await db.user.create({
        data: {
          email: "membership-test-pastdue@example.com",
          username: "membertestpastdue",
          passwordHash: "not-a-real-hash",
          stripeCustomerId: "cus_test_pastdue",
          stripeSubscriptionId: "sub_test_pastdue",
          membershipStatus: "active",
        },
      });

      // Exact shape of route.ts's customer.subscription.updated/deleted branch,
      // for a Stripe subscription.status of "past_due" (maps to our "past_due").
      await db.user.updateMany({
        where: { stripeSubscriptionId: "sub_test_pastdue" },
        data: { membershipStatus: "past_due" },
      });

      const updated = await db.user.findUnique({ where: { id: user.id } });
      assert.equal(updated.membershipStatus, "past_due");

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "customer.subscription.deleted write shape cancels membership by subscription id",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await db.user.create({
        data: {
          email: "membership-test-deleted@example.com",
          username: "membertestdeleted",
          passwordHash: "not-a-real-hash",
          stripeCustomerId: "cus_test_deleted",
          stripeSubscriptionId: "sub_test_deleted",
          membershipStatus: "active",
        },
      });

      await db.user.updateMany({
        where: { stripeSubscriptionId: "sub_test_deleted" },
        data: { membershipStatus: "canceled" },
      });

      const updated = await db.user.findUnique({ where: { id: user.id } });
      assert.equal(updated.membershipStatus, "canceled");

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "webhook write shape for an unknown user id / subscription id matches zero rows instead of throwing",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      // updateMany (not update) is the whole point: a not-found id/subscription
      // id must resolve to { count: 0 } rather than a P2025 throw.
      const byId = await db.user.updateMany({
        where: { id: "nonexistent-user-id-xyz" },
        data: { stripeCustomerId: "cus_orphan", stripeSubscriptionId: "sub_orphan", membershipStatus: "active" },
      });
      assert.equal(byId.count, 0);

      const bySub = await db.user.updateMany({
        where: { stripeSubscriptionId: "sub_does_not_exist_anywhere" },
        data: { membershipStatus: "active" },
      });
      assert.equal(bySub.count, 0);

      const orphan = await db.user.findFirst({ where: { stripeSubscriptionId: "sub_orphan" } });
      assert.equal(orphan, null, "no user should have been created or matched by the orphan write");
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "replaying the same checkout.session.completed write twice is idempotent",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeTestUser(db, "idempotent1");

      const data = {
        stripeCustomerId: "cus_test_idempotent1",
        stripeSubscriptionId: "sub_test_idempotent1",
        membershipStatus: "active",
      };
      const first = await db.user.updateMany({ where: { id: user.id }, data });
      const second = await db.user.updateMany({ where: { id: user.id }, data });
      assert.equal(first.count, 1);
      assert.equal(second.count, 1, "replaying the same event must succeed again, not conflict");

      const updated = await db.user.findUnique({ where: { id: user.id } });
      assert.equal(updated.membershipStatus, "active");
      assert.equal(updated.stripeSubscriptionId, "sub_test_idempotent1");

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "isComped and membershipStatus are independent — un-comping a never-paid user leaves membershipStatus at 'none'",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeTestUser(db, "comptoggle1");
      assert.equal(user.isComped, false);
      assert.equal(user.membershipStatus, "none");

      // Mirrors exactly what src/app/admin/users/actions.ts's toggleComp does
      // (that action itself requires an admin cookie session via requireAdmin(),
      // which needs a real request scope — this test exercises the same
      // read-invert-write semantics directly against the database instead).
      const compedOn = await db.user.update({
        where: { id: user.id },
        data: { isComped: !user.isComped },
      });
      assert.equal(compedOn.isComped, true);
      assert.equal(compedOn.membershipStatus, "none", "comping must not touch membershipStatus");

      const compedOff = await db.user.update({
        where: { id: user.id },
        data: { isComped: !compedOn.isComped },
      });
      assert.equal(compedOff.isComped, false);
      assert.equal(
        compedOff.membershipStatus,
        "none",
        "un-comping a user who never had a real subscription must leave membershipStatus at 'none'"
      );

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "stripeSubscriptionId uniqueness allows two different users to each hold their own subscription id",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const userA = await db.user.create({
        data: {
          email: "membership-test-unique-a@example.com",
          username: "membertestuniquea",
          passwordHash: "not-a-real-hash",
          stripeSubscriptionId: "sub_test_unique_a",
        },
      });
      const userB = await db.user.create({
        data: {
          email: "membership-test-unique-b@example.com",
          username: "membertestuniqueb",
          passwordHash: "not-a-real-hash",
          stripeSubscriptionId: "sub_test_unique_b",
        },
      });

      await assert.rejects(
        db.user.update({
          where: { id: userB.id },
          data: { stripeSubscriptionId: "sub_test_unique_a" },
        }),
        /Unique constraint/,
        "two users must never be able to hold the same stripeSubscriptionId"
      );

      await db.user.delete({ where: { id: userA.id } });
      await db.user.delete({ where: { id: userB.id } });
    } finally {
      await db.$disconnect();
    }
  }
);
