import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// Same DB-direct pattern as purchase-cascade.test.mjs / user-schema.test.mjs.
// This locks in the single highest-risk piece of the My Account dashboard
// feature: Purchase.email/Signup.email are written without lowercasing
// (confirmed by reading src/app/materials/actions.ts, courses/actions.ts,
// calendar/actions.ts — none call .toLowerCase()), while User.email always
// is. src/app/account/page.tsx's queries rely on Prisma's
// `{ equals, mode: "insensitive" }` to bridge that gap — this test exercises
// that exact query shape directly against the database, independent of the
// page component, so a future edit that accidentally drops `mode:
// "insensitive"` back to a plain equals fails a test, not just a manual QA
// pass with identically-cased emails that would never catch it.

const hasDb = Boolean(process.env.DATABASE_URL);

test(
  "case-insensitive email match finds a Purchase row written with different casing",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const material = await db.material.create({
        data: { title: "Case Test Material", description: "temp", fileUrl: "https://example.com/x.pdf" },
      });
      const purchase = await db.purchase.create({
        data: {
          materialId: material.id,
          name: "Test",
          email: "MixedCase-Purchase@Example.COM",
          amountCents: 0,
          stripeSessionId: `test_case_${material.id}`,
          status: "paid",
          downloadToken: `test_case_token_${material.id}`,
        },
      });

      const found = await db.purchase.findMany({
        where: {
          email: { equals: "mixedcase-purchase@example.com", mode: "insensitive" },
          status: "paid",
        },
      });
      assert.equal(found.length, 1, "case-insensitive query should find the row despite differing case");
      assert.equal(found[0].id, purchase.id);

      const notFoundPlainEquals = await db.purchase.findMany({
        where: { email: "mixedcase-purchase@example.com", status: "paid" },
      });
      assert.equal(
        notFoundPlainEquals.length,
        0,
        "sanity check: a PLAIN equals (no insensitive mode) genuinely does NOT match — proves the insensitive query above isn't a false positive from some other cause"
      );

      await db.purchase.delete({ where: { id: purchase.id } });
      await db.material.delete({ where: { id: material.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "case-insensitive email match finds a Signup row written with different casing",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const classSession = await db.classSession.create({
        data: { title: "Case Test Class", startsAt: new Date(Date.now() + 86400000) },
      });
      const signup = await db.signup.create({
        data: { classSessionId: classSession.id, name: "Test", email: "MixedCase-Signup@Example.COM" },
      });

      const found = await db.signup.findMany({
        where: { email: { equals: "mixedcase-signup@example.com", mode: "insensitive" } },
      });
      assert.equal(found.length, 1);
      assert.equal(found[0].id, signup.id);

      await db.classSession.delete({ where: { id: classSession.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "a Purchase with status 'pending' is excluded when queried with status: 'paid'",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const material = await db.material.create({
        data: { title: "Pending Test Material", description: "temp", fileUrl: "https://example.com/x.pdf" },
      });
      const purchase = await db.purchase.create({
        data: {
          materialId: material.id,
          name: "Test",
          email: "pending-test@example.com",
          amountCents: 500,
          stripeSessionId: `test_pending_${material.id}`,
          status: "pending",
          downloadToken: `test_pending_token_${material.id}`,
        },
      });

      const found = await db.purchase.findMany({
        where: {
          email: { equals: "pending-test@example.com", mode: "insensitive" },
          status: "paid",
        },
      });
      assert.equal(found.length, 0, "a pending purchase must not match a status:'paid' filter");

      await db.purchase.delete({ where: { id: purchase.id } });
      await db.material.delete({ where: { id: material.id } });
    } finally {
      await db.$disconnect();
    }
  }
);
