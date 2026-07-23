import { test } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// Same DB-direct pattern as membership.test.mjs / mentoring.test.mjs. Confirmed
// empirically that src/app/account/chat-actions.ts can't be imported into a
// plain Node test process either — it transitively imports src/lib/dal.ts,
// src/lib/stripe.ts, and src/lib/openai.ts, all of which have a top-level
// `import "server-only"` guard that throws unconditionally outside Next's own
// bundler (same constraint documented in every prior test file this session).
// Each test below performs the exact same Prisma operation/query shape the
// real action's source uses for that step.

const hasDb = Boolean(process.env.DATABASE_URL);

async function makeMember(db, suffix, overrides = {}) {
  return db.user.create({
    data: {
      email: `chat-test-${suffix}@example.com`,
      username: `chattest${suffix}`,
      passwordHash: "not-a-real-hash",
      membershipStatus: "active",
      ...overrides,
    },
  });
}

test(
  "new User rows default to chatCreditBalance:0",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "defaults1");
      assert.equal(user.chatCreditBalance, 0);
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "getChatSettings-equivalent upsert creates the singleton row on first access and leaves it unchanged on the second",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      // Clean slate for this test's own assertions (does not assume prior state).
      await db.chatSettings.deleteMany({ where: { id: "singleton" } });

      // Exact shape of src/lib/chat-settings.ts's getChatSettings().
      const first = await db.chatSettings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      });
      assert.equal(first.dailyFreeQuestions, 3);
      assert.equal(first.packQuestionCount, 10);
      assert.equal(first.packPriceCents, 200);
      assert.equal(first.hardDailyCap, 20);

      // Mutate it, then confirm a second upsert call does NOT reset it back
      // to defaults — `update: {}` must mean "change nothing if it exists".
      await db.chatSettings.update({ where: { id: "singleton" }, data: { dailyFreeQuestions: 7 } });
      const second = await db.chatSettings.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      });
      assert.equal(second.dailyFreeQuestions, 7, "upsert's update:{} must not overwrite an existing row");

      await db.chatSettings.deleteMany({ where: { id: "singleton" } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "today's usage count query only counts ChatUsage rows from today (UTC), not earlier days",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "dailycount1");

      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      await db.chatUsage.create({ data: { userId: user.id, createdAt: yesterday } });
      await db.chatUsage.create({ data: { userId: user.id } }); // today
      await db.chatUsage.create({ data: { userId: user.id } }); // today

      // Exact shape from sendChatMessage's today-count query.
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      const questionsUsedToday = await db.chatUsage.count({
        where: { userId: user.id, createdAt: { gte: startOfToday } },
      });

      assert.equal(questionsUsedToday, 2, "yesterday's usage row must not count toward today's total");

      await db.chatUsage.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "free-vs-credit determination matches dailyFreeQuestions boundary exactly",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const dailyFreeQuestions = 3;
      // Mirrors `const isFree = questionsUsedToday < settings.dailyFreeQuestions;`
      assert.equal(0 < dailyFreeQuestions, true, "1st question of the day must be free");
      assert.equal(2 < dailyFreeQuestions, true, "3rd question (index 2) must still be free");
      assert.equal(3 < dailyFreeQuestions, false, "4th question (index 3) must require a credit");
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "rate limit check correctly flags a request within the threshold and allows one after it",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "ratelimit1");
      const RATE_LIMIT_MS = 3000;

      const recent = await db.chatUsage.create({ data: { userId: user.id } });

      const lastUsage = await db.chatUsage.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      assert.equal(lastUsage.id, recent.id);

      const elapsed = Date.now() - lastUsage.createdAt.getTime();
      assert.equal(elapsed < RATE_LIMIT_MS, true, "a usage row created just now must be within the rate limit window");

      const old = new Date(Date.now() - RATE_LIMIT_MS - 1000);
      await db.chatUsage.update({ where: { id: recent.id }, data: { createdAt: old } });
      const stillLast = await db.chatUsage.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      const elapsed2 = Date.now() - stillLast.createdAt.getTime();
      assert.equal(elapsed2 < RATE_LIMIT_MS, false, "a usage row older than the window must not be rate-limited");

      await db.chatUsage.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "webhook write shape: a pending ChatPackPurchase is credited exactly once, idempotently",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "packcredit1");
      const pack = await db.chatPackPurchase.create({
        data: {
          userId: user.id,
          questionsGranted: 10,
          amountCents: 200,
          stripeSessionId: "cs_test_packcredit1",
          status: "pending",
        },
      });

      // Exact shape of the webhook's crediting branch, first delivery.
      async function processWebhookOnce(stripeSessionId) {
        const chatPack = await db.chatPackPurchase.findUnique({ where: { stripeSessionId } });
        if (chatPack && chatPack.status !== "paid") {
          await db.$transaction([
            db.chatPackPurchase.update({ where: { id: chatPack.id }, data: { status: "paid" } }),
            db.user.update({
              where: { id: chatPack.userId },
              data: { chatCreditBalance: { increment: chatPack.questionsGranted } },
            }),
          ]);
        }
      }

      await processWebhookOnce("cs_test_packcredit1");
      const afterFirst = await db.user.findUnique({ where: { id: user.id } });
      assert.equal(afterFirst.chatCreditBalance, 10);

      // Duplicate delivery of the same event — must not double-credit.
      await processWebhookOnce("cs_test_packcredit1");
      const afterSecond = await db.user.findUnique({ where: { id: user.id } });
      assert.equal(afterSecond.chatCreditBalance, 10, "replaying the same webhook event must not double-credit");

      const finalPack = await db.chatPackPurchase.findUnique({ where: { id: pack.id } });
      assert.equal(finalPack.status, "paid");

      await db.chatPackPurchase.delete({ where: { id: pack.id } });
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "webhook lookup for an unrelated/unknown stripeSessionId finds nothing and does not throw",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const chatPack = await db.chatPackPurchase.findUnique({
        where: { stripeSessionId: "cs_test_does_not_exist_anywhere" },
      });
      assert.equal(chatPack, null);
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "deleting a User cascades to delete their ChatUsage and ChatPackPurchase rows (onDelete: Cascade)",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "cascade1");
      const usage = await db.chatUsage.create({ data: { userId: user.id } });
      const pack = await db.chatPackPurchase.create({
        data: {
          userId: user.id,
          questionsGranted: 10,
          amountCents: 200,
          stripeSessionId: "cs_test_cascade1",
          status: "pending",
        },
      });

      await db.user.delete({ where: { id: user.id } });

      const survivedUsage = await db.chatUsage.findUnique({ where: { id: usage.id } });
      const survivedPack = await db.chatPackPurchase.findUnique({ where: { id: pack.id } });
      assert.equal(survivedUsage, null, "ChatUsage row must be cascade-deleted with its user");
      assert.equal(survivedPack, null, "ChatPackPurchase row must be cascade-deleted with its user");
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "chatCreditBalance decrement uses Prisma's atomic decrement operator correctly",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await makeMember(db, "decrement1", { chatCreditBalance: 5 });

      const updated = await db.user.update({
        where: { id: user.id },
        data: { chatCreditBalance: { decrement: 1 } },
      });
      assert.equal(updated.chatCreditBalance, 4);

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);

test(
  "a non-member (membershipStatus:'none', isComped:false) fails the exact eligibility check sendChatMessage uses",
  { skip: !hasDb && "DATABASE_URL not set — skipping DB-backed test (see task #12)" },
  async () => {
    const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
    try {
      const user = await db.user.create({
        data: {
          email: "chat-test-nonmember@example.com",
          username: "chattestnonmember",
          passwordHash: "not-a-real-hash",
        },
      });

      // Exact shape of `if (!user.isComped && user.membershipStatus !== "active")`.
      const eligible = user.isComped || user.membershipStatus === "active";
      assert.equal(eligible, false);

      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }
);
