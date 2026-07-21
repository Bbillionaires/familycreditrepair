import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// Same DB-direct pattern as purchase-cascade.test.mjs — bypasses src/lib/db.ts's
// "server-only" guard (which throws unconditionally outside Next's own bundler).
// The application-level hashing/session/action code (src/lib/password.ts,
// src/lib/user-session.ts, src/app/{signup,login,account}/actions.ts) all
// import "server-only" transitively and cannot be exercised this way — those
// were verified via real Playwright runs against `next build`/`next start`
// instead (see .pipeline/test-report.md), matching this repo's established
// precedent for anything that needs Next's own module bundling.
//
// What IS worth locking in here as a permanent regression guard is the schema
// guarantee the whole account system depends on: email/username uniqueness at
// the database level (the app-level findFirst-before-create check in
// signupAction is a best-effort guard against the common case, not a
// substitute for a real DB constraint under concurrent signups), and that
// resetToken's uniqueness doesn't collide across the many users who have no
// active reset request (null resetToken) at any given time.

const hasDb = Boolean(process.env.DATABASE_URL);

test(
  "email must be unique at the database level",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const email = `unique-test-${Date.now()}@example.com`;
      const user = await db.user.create({
        data: { email, username: `u1_${Date.now()}`, passwordHash: "salt:hash" },
      });

      await assert.rejects(() =>
        db.user.create({
          data: { email, username: `u2_${Date.now()}`, passwordHash: "salt:hash" },
        })
      );

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "username must be unique at the database level",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const username = `unique-user-${Date.now()}`;
      const user = await db.user.create({
        data: { email: `a1-${Date.now()}@example.com`, username, passwordHash: "salt:hash" },
      });

      await assert.rejects(() =>
        db.user.create({
          data: { email: `a2-${Date.now()}@example.com`, username, passwordHash: "salt:hash" },
        })
      );

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "multiple users can simultaneously have a null resetToken (nullable unique field, not a false collision)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const userA = await db.user.create({
        data: { email: `null-a-${Date.now()}@example.com`, username: `nulla_${Date.now()}`, passwordHash: "salt:hash" },
      });
      const userB = await db.user.create({
        data: { email: `null-b-${Date.now()}@example.com`, username: `nullb_${Date.now()}`, passwordHash: "salt:hash" },
      });

      assert.equal(userA.resetToken, null);
      assert.equal(userB.resetToken, null);

      await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "resetToken must be unique when set (a real token collision is rejected)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const token = `dup-token-${Date.now()}`;
      const userA = await db.user.create({
        data: {
          email: `token-a-${Date.now()}@example.com`,
          username: `tokena_${Date.now()}`,
          passwordHash: "salt:hash",
          resetToken: token,
        },
      });

      await assert.rejects(() =>
        db.user.create({
          data: {
            email: `token-b-${Date.now()}@example.com`,
            username: `tokenb_${Date.now()}`,
            passwordHash: "salt:hash",
            resetToken: token,
          },
        })
      );

      await db.user.delete({ where: { id: userA.id } });
    } finally {
      await db.$disconnect();
    }
  }
);
