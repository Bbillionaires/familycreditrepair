import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// One-time/occasional bulk content loader for the quiz question bank, used
// when a large batch of already-reviewed questions needs to be loaded
// without submitting hundreds of individual admin forms. Gated by a secret
// header (not admin session cookies) since it's meant to be called as a
// script/curl request, not from a browser. Inert unless QUIZ_IMPORT_SECRET
// is set — matches this app's isStripeConfigured()/isOpenAIConfigured()
// "off unless explicitly configured" convention for optional capabilities.
// Every imported question is created as a draft (published: false); nothing
// here ever enters the live quiz pool without a human publishing it in
// /admin/quiz-questions.

function isAuthorized(request: Request): boolean {
  const expected = process.env.QUIZ_IMPORT_SECRET;
  if (!expected) return false;
  const provided = request.headers.get("x-import-secret");
  if (!provided) return false;
  // Compare fixed-length hashes rather than the raw strings directly so
  // timingSafeEqual never throws on a length mismatch and no timing signal
  // about the secret's length or content leaks either way.
  const expectedHash = createHash("sha256").update(expected).digest();
  const providedHash = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expectedHash, providedHash);
}

type ImportQuestion = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string;
  category: string;
};

function isValidQuestion(q: unknown): q is ImportQuestion {
  if (!q || typeof q !== "object") return false;
  const r = q as Record<string, unknown>;
  const requiredStrings = ["question", "optionA", "optionB", "optionC", "optionD", "category"];
  for (const field of requiredStrings) {
    if (typeof r[field] !== "string" || r[field] === "") return false;
  }
  if (!["A", "B", "C", "D"].includes(r.correctOption as string)) return false;
  if (r.explanation !== undefined && typeof r.explanation !== "string") return false;
  return true;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a JSON array of questions" }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;
  let invalid = 0;

  for (const item of body) {
    if (!isValidQuestion(item)) {
      invalid++;
      continue;
    }

    const existing = await db.quizQuestion.findFirst({ where: { question: item.question } });
    if (existing) {
      skipped++;
      continue;
    }

    await db.quizQuestion.create({
      data: {
        question: item.question,
        optionA: item.optionA,
        optionB: item.optionB,
        optionC: item.optionC,
        optionD: item.optionD,
        correctOption: item.correctOption,
        explanation: item.explanation ?? null,
        category: item.category,
        published: false,
      },
    });
    created++;
  }

  return NextResponse.json({ created, skipped, invalid, total: body.length });
}
