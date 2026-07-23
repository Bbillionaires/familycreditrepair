// One-time content loader for the certification quiz question bank.
// Reads scripts/quiz-questions-data.json and upserts each question as a
// DRAFT (published: false) — nothing here enters the live random-selection
// pool until an admin reviews and publishes it at /admin/quiz-questions.
// Safe to re-run: matches on exact question text and skips ones already
// present, so a second run only inserts newly-added questions.
//
// Usage: DATABASE_URL="postgresql://..." node scripts/seed-quiz-questions.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const dataPath = join(__dirname, "quiz-questions-data.json");
const questions = JSON.parse(readFileSync(dataPath, "utf-8"));

const REQUIRED_FIELDS = [
  "question",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctOption",
  "category",
];

for (const [i, q] of questions.entries()) {
  for (const field of REQUIRED_FIELDS) {
    if (!q[field] || typeof q[field] !== "string") {
      throw new Error(`Question at index ${i} is missing or has an invalid "${field}" field.`);
    }
  }
  if (!["A", "B", "C", "D"].includes(q.correctOption)) {
    throw new Error(`Question at index ${i} has an invalid correctOption: ${q.correctOption}`);
  }
}

const db = new PrismaClient({ adapter: new PrismaPg(DATABASE_URL) });

let created = 0;
let skipped = 0;

try {
  for (const q of questions) {
    const existing = await db.quizQuestion.findFirst({ where: { question: q.question } });
    if (existing) {
      skipped++;
      continue;
    }
    await db.quizQuestion.create({
      data: {
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation ?? null,
        category: q.category,
        published: false,
      },
    });
    created++;
  }
} finally {
  await db.$disconnect();
}

console.log(`Loaded ${questions.length} questions from ${dataPath}`);
console.log(`Created: ${created}, skipped (already present): ${skipped}`);
console.log("All questions loaded as drafts (published: false) — review and publish at /admin/quiz-questions.");
