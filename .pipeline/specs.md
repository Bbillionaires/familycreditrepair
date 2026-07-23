# Spec: Quiz + Certificate feature

## Summary

Add a site-wide 4-option multiple-choice certification quiz (Option A: one flat question bank, not tied to any specific course's content) and a per-user `Certificate` that's issued once a member has (a) an active/comped membership, (b) completed every lesson in every currently-published course that has at least one lesson (via the just-shipped `LessonCompletion` data), and (c) passed the quiz at least once (≥80%). A certificate, once issued, is permanent — it is never revoked or invalidated by a later membership lapse or by new courses being added, matching how real-world certifications work and avoiding the bad UX/business optics of clawing back an earned credential. This is purely additive on top of the shipped lesson-completion feature; no existing behavior changes except one new call site inside `setLessonCompletion`.

Quiz attempts are capped at 4 per rolling 30-day window per user (both numbers admin-configurable), mirroring the `ChatUsage` daily-count-in-a-window pattern from the AI chat feature. Each attempt draws a random subset of the published question bank (admin-configurable size, default 50; uses fewer if the bank has fewer published questions). Grading is always computed server-side from a server-locked set of questions recorded at attempt-start time — a client can never influence which questions "count" or submit a fabricated score.

The actual ~300 questions' content is out of scope for this spec (separate content-generation/review task) — this spec builds the schema, the quiz-taking mechanics, admin CRUD (with pagination, since this list will eventually hold hundreds of rows unlike every other admin list in this app), and the certificate display page.

## Files to change

### `prisma/schema.prisma`

Five schema additions: four new models plus new relation array fields on `User` and `QuizQuestion`.

```prisma
model QuizSettings {
  id                        String   @id @default("singleton")
  questionsPerAttempt       Int      @default(50)
  passThresholdPercent      Int      @default(80)
  maxAttemptsPerRollingDays Int      @default(4)
  rollingWindowDays         Int      @default(30)
  updatedAt                 DateTime @updatedAt
}

model QuizQuestion {
  id            String              @id @default(cuid())
  question      String
  optionA       String
  optionB       String
  optionC       String
  optionD       String
  correctOption String
  explanation   String?
  category      String?
  published     Boolean             @default(false)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  answers       QuizAttemptAnswer[]
}

model QuizAttempt {
  id          String              @id @default(cuid())
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  startedAt   DateTime            @default(now())
  submittedAt DateTime?
  score       Int?
  passed      Boolean             @default(false)
  createdAt   DateTime            @default(now())
  answers     QuizAttemptAnswer[]

  @@index([userId, createdAt])
}

model QuizAttemptAnswer {
  id             String        @id @default(cuid())
  attempt        QuizAttempt   @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  attemptId      String
  question       QuizQuestion? @relation(fields: [questionId], references: [id], onDelete: SetNull)
  questionId     String?
  selectedOption String?
  correct        Boolean       @default(false)

  @@index([attemptId])
  @@index([questionId])
}

model Certificate {
  id       String   @id @default(cuid())
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId   String   @unique
  issuedAt DateTime @default(now())
}
```

Plus, on `User`, add three new relation array fields (alongside the existing `chatUsages`/`chatPackPurchases`/`lessonCompletions`):

```prisma
quizAttempts QuizAttempt[]
certificate  Certificate?
```

**`onDelete` reasoning, decided fresh for each relation (not copied by rote from either precedent):**

- **`QuizAttempt.userId` → `Cascade`**: a quiz attempt record has no standalone value once its user is gone — same reasoning as `ChatUsage`/`LessonCompletion`. Nobody needs "someone (unknown) scored 85% on some date" once the someone is deleted.
- **`QuizAttemptAnswer.attemptId` → `Cascade`**: per-question answer detail rows are meaningless without their parent attempt; deleting the attempt should always take its detail rows with it.
- **`QuizAttemptAnswer.questionId` → `SetNull`** (and `questionId` is nullable): this is the one relation in this spec that deliberately does NOT follow the `Cascade`-everything pattern of `LessonCompletion`/`ChatUsage`. Reasoning: the attempt's *score* is already stored as a plain `Int` directly on `QuizAttempt` at submission time, so deleting a `QuizQuestion` later never corrupts historical scoring. But the per-answer detail rows (which specific answer was selected, whether it was correct) have real ongoing value for admin review — "which questions are commonly missed" — even after a question is edited or removed for being a bad question. `SetNull` preserves that historical answer detail (the row survives, just with `questionId: null`) instead of silently deleting evidence of what a user actually answered. This mirrors the `Purchase`/`MentorRequest` record-preservation reasoning, applied to a new kind of "this financial/history record shouldn't disappear just because something it referenced was cleaned up" situation — not a copy-paste of either precedent, a genuinely different one considered on its own merits.
- **`Certificate.userId` → `Cascade`**: a certificate is intrinsically tied to the identity of a specific account (it displays that account's `username`) — if the `User` row itself is deleted (not just a membership lapse, an actual account deletion), there is no one left to hold the certificate, so `Cascade` is correct. This is a **different axis** from the "certificates are never revoked" business rule: "never revoked" means a later membership lapse or a newly-added course never un-issues an existing certificate; it does not mean the certificate outlives the account being deleted entirely. State this distinction explicitly in code comments so it isn't misread as a contradiction.

Generate the migration via the established non-interactive workaround used for every prior schema change in this repo: create `prisma/migrations/<timestamp>_add_quiz_and_certificate/`, run `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/<timestamp>_add_quiz_and_certificate/migration.sql`, then `npx prisma migrate deploy`, then `npx prisma generate`.

### `src/lib/quiz-settings.ts` (new file)

Mirrors `src/lib/chat-settings.ts` exactly:

```ts
import "server-only";
import { db } from "@/lib/db";

export async function getQuizSettings() {
  return db.quizSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}
```

### `src/lib/certificate.ts` (new file)

```ts
import "server-only";
import { db } from "@/lib/db";

export async function maybeIssueCertificate(userId: string): Promise<void> {
  const existing = await db.certificate.findUnique({ where: { userId } });
  if (existing) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (!user.isComped && user.membershipStatus !== "active") return;

  const hasPassingAttempt = await db.quizAttempt.findFirst({ where: { userId, passed: true } });
  if (!hasPassingAttempt) return;

  // "Every currently-published course with at least one lesson" — always
  // computed against the live published-course set, so an admin unpublishing
  // a course (or removing its last lesson) automatically excludes it from
  // this check for everyone going forward. This never affects a Certificate
  // already issued to someone else, since issuance is a one-time, permanent
  // event (see reasoning below) — it only affects who becomes newly eligible.
  const coursesWithLessons = await db.course.findMany({
    where: { published: true, lessons: { some: {} } },
    include: { lessons: { select: { id: true } } },
  });

  for (const course of coursesWithLessons) {
    const completedCount = await db.lessonCompletion.count({
      where: { userId, lessonId: { in: course.lessons.map((l) => l.id) } },
    });
    if (completedCount < course.lessons.length) return;
  }

  // All conditions hold. Guard against a rare race between two near-
  // simultaneous callers (e.g. a lesson-completion toggle and a quiz
  // submission landing at nearly the same moment) with try/catch around the
  // unique-constrained create, rather than a separate lock — the `userId`
  // unique constraint on Certificate makes a duplicate insert impossible at
  // the database level; the loser of the race just gets a (harmless, already-
  // satisfied) constraint violation here, which we swallow.
  try {
    await db.certificate.create({ data: { userId } });
  } catch {
    // Already issued by a concurrent call — nothing to do.
  }
}
```

**Important**: once a `Certificate` row exists for a user, `maybeIssueCertificate` returns immediately on the `existing` check — it never re-evaluates or re-issues, which is exactly what "permanent, never revoked" means in code: nothing in this function can ever remove a `Certificate` row, and nothing calls it with intent to revoke.

Call sites (both already exist in the codebase from the shipped lesson-completion feature or added by this spec):
1. `src/app/courses/[id]/lesson-completion-actions.ts`'s `setLessonCompletion`, but **only** in the `if (completed)` branch (marking complete) — add `if (completed) { ...upsert...; await maybeIssueCertificate(user.id); }`. Un-marking a lesson can only ever remove a completion, never newly satisfy eligibility, so there's no reason to check on that path.
2. The new `submitQuizAttempt` action below, only when the attempt is graded as `passed: true`.

### `src/app/account/quiz/quiz-actions.ts` (new file)

```ts
"use server";

import { verifyUserSession } from "@/lib/user-session";
import { db } from "@/lib/db";
import { getQuizSettings } from "@/lib/quiz-settings";
import { maybeIssueCertificate } from "@/lib/certificate";

export type QuizQuestionForClient = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

export type StartQuizAttemptResult =
  | { error: string }
  | { attemptId: string; questions: QuizQuestionForClient[] };

async function verifySession() {
  const session = await verifyUserSession();
  if (!session) return { error: "You must be logged in to take the quiz." } as const;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.sessionVersion !== session.sessionVersion) {
    return { error: "Your session has expired. Please log in again." } as const;
  }
  return { user } as const;
}

export async function startQuizAttempt(): Promise<StartQuizAttemptResult> {
  const verified = await verifySession();
  if ("error" in verified) return verified;
  const { user } = verified;

  if (!user.isComped && user.membershipStatus !== "active") {
    return { error: "An active membership is required to take the certification quiz." };
  }

  const settings = await getQuizSettings();

  const windowStart = new Date(Date.now() - settings.rollingWindowDays * 24 * 60 * 60 * 1000);
  const attemptsInWindow = await db.quizAttempt.count({
    where: { userId: user.id, createdAt: { gte: windowStart } },
  });
  if (attemptsInWindow >= settings.maxAttemptsPerRollingDays) {
    return {
      error: `You've used all ${settings.maxAttemptsPerRollingDays} quiz attempts allowed in a ${settings.rollingWindowDays}-day period. Please try again later.`,
    };
  }

  const publishedQuestions = await db.quizQuestion.findMany({ where: { published: true } });
  if (publishedQuestions.length === 0) {
    return { error: "The certification quiz isn't available yet. Please check back later." };
  }

  const selected = [...publishedQuestions]
    .sort(() => Math.random() - 0.5)
    .slice(0, settings.questionsPerAttempt);

  const attempt = await db.quizAttempt.create({
    data: {
      userId: user.id,
      answers: {
        create: selected.map((q) => ({ questionId: q.id, correct: false })),
      },
    },
  });

  return {
    attemptId: attempt.id,
    questions: selected.map((q) => ({
      id: q.id,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
    })),
  };
}

export type SubmitQuizAttemptResult =
  | { error: string }
  | { score: number; passed: boolean; passThresholdPercent: number };

export async function submitQuizAttempt(
  attemptId: string,
  answers: { questionId: string; selectedOption: "A" | "B" | "C" | "D" }[]
): Promise<SubmitQuizAttemptResult> {
  const verified = await verifySession();
  if ("error" in verified) return verified;
  const { user } = verified;

  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: { include: { question: true } } },
  });
  if (!attempt || attempt.userId !== user.id) {
    return { error: "Quiz attempt not found." };
  }
  if (attempt.submittedAt) {
    return { error: "This quiz attempt has already been submitted." };
  }

  const selectedByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedOption]));

  let correctCount = 0;
  let gradableCount = 0;
  for (const answerRow of attempt.answers) {
    if (!answerRow.question) continue; // question was deleted after this attempt started
    gradableCount++;
    const selected = selectedByQuestionId.get(answerRow.questionId!) ?? null;
    const isCorrect = selected === answerRow.question.correctOption;
    if (isCorrect) correctCount++;
    await db.quizAttemptAnswer.update({
      where: { id: answerRow.id },
      data: { selectedOption: selected, correct: isCorrect },
    });
  }

  const score = gradableCount > 0 ? Math.round((correctCount / gradableCount) * 100) : 0;
  const settings = await getQuizSettings();
  const passed = score >= settings.passThresholdPercent;

  await db.quizAttempt.update({
    where: { id: attempt.id },
    data: { submittedAt: new Date(), score, passed },
  });

  if (passed) {
    await maybeIssueCertificate(user.id);
  }

  return { score, passed, passThresholdPercent: settings.passThresholdPercent };
}
```

Key points for the coder:
- `startQuizAttempt` pre-creates one `QuizAttemptAnswer` row per selected question (with `selectedOption: null`, `correct: false`) **before** returning questions to the client — this is what makes the attempt's question set server-locked. `submitQuizAttempt` only ever grades against `attempt.answers` (the rows created at start time), and looks up a client-submitted answer by `questionId` via a `Map` — any extra/garbage entries in the client's `answers` array for question ids not in the attempt are simply never looked at. A client can never inject a question into an attempt after the fact, and can never claim a different set of questions was asked.
- `attempt.submittedAt` is the single-submission guard — a second `submitQuizAttempt` call for the same `attemptId` is rejected outright, not re-graded.
- `attempt.userId !== user.id` check prevents one user from submitting/reading another user's attempt by guessing/reusing an `attemptId`.
- Grading loop skips any `answerRow` whose `question` relation is now `null` (deleted after the attempt started, per the `SetNull` decision above) and excludes it from both `correctCount` and the `gradableCount` denominator — the percentage is computed only over questions that can still be graded.
- Mirrors `sendChatMessage`'s check ordering exactly: session/login → membership eligibility → rate/quota limit → the actual operation.

### `src/app/account/quiz/page.tsx` (new file)

```tsx
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import BecomeMemberForm from "../become-member-form";
import QuizWidget from "./quiz-widget";

export const dynamic = "force-dynamic";

export default async function AccountQuizPage() {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const eligible = user.isComped || user.membershipStatus === "active";

  if (!eligible) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Certification Quiz</h1>
        <p className="mt-2 text-slate-600">
          The certification quiz is available to members. Become a member to unlock it.
        </p>
        <div className="mt-4">
          <BecomeMemberForm />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Certification Quiz</h1>
      <QuizWidget />
    </div>
  );
}
```

Uses `requireUser()` (not `verifyUserSession()`) — unlike the course page, there's no anonymous-token exception to preserve here; this page requires a real account, same as `/account/chat`.

### `src/app/account/quiz/quiz-widget.tsx` (new file)

`"use client"`. Simplest reasonable UX: all questions presented on one page at once (not one-at-a-time), a single submit button, following the existing `chat-widget.tsx` convention of calling Server Actions directly as async functions from event handlers (no `<form>`/`useActionState`, since this is a multi-step client flow with local state, not a single form submission).

Behavior:
- On an initial "Start quiz" button click, call `startQuizAttempt()`. On error, show it inline (e.g. the attempt-limit or no-questions-available message) with no further UI. On success, store `attemptId` and `questions` in local state and render one radio-button group per question (`name` unique per question, four `<label><input type="radio"></label>` per question for options A–D), plus a "Submit" button.
- Track selected answers in a local `Record<string, "A"|"B"|"C"|"D">` state object keyed by `questionId`.
- On submit, build the `{ questionId, selectedOption }[]` array from that state (skip/leave out any question the user never answered — the server treats a missing entry as `null`, i.e. automatically wrong, which is correct behavior for an unanswered question) and call `submitQuizAttempt(attemptId, answers)`.
- On a successful result, show the score, pass/fail, and the configured pass threshold; on pass, show a link to `/account/certificate`. On error (e.g. "already submitted" from a double-click), show it inline.
- No disclaimer banner needed here specifically (this is a knowledge test, not an AI-generated response) — but do show a brief, plain note that questions are randomly selected from a larger bank and that a passing score also requires having completed all course checklists to actually receive the certificate (matching this site's plain, expectation-setting tone).

### `src/app/admin/quiz-questions/` (new directory, mirrors `admin/mentors/`'s file layout)

- **`actions.ts`**: `createQuestion`, `updateQuestion`, `deleteQuestion`, following `admin/mentors/actions.ts`'s exact shape (`requireAdmin()` → Zod-validate → mutate → `revalidatePath` → `redirect` for create/update, plain `revalidatePath` for delete).

```ts
const QuizQuestionSchema = z.object({
  question: z.string().trim().min(1, "Question text is required"),
  optionA: z.string().trim().min(1, "Option A is required"),
  optionB: z.string().trim().min(1, "Option B is required"),
  optionC: z.string().trim().min(1, "Option C is required"),
  optionD: z.string().trim().min(1, "Option D is required"),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().trim().optional(),
  category: z.string().trim().optional(),
  published: z.boolean(),
});
```
  `createQuestion(_prevState, formData)`, `updateQuestion(id, _prevState, formData)`, `deleteQuestion(id)` — same signature shapes as `createMentor`/`updateMentor`/`deleteMentor`. `revalidatePath("/admin/quiz-questions")` after every mutation; no public page needs revalidating (unlike mentors, which also revalidate `/mentoring`), since quiz questions have no public-facing list page.

- **`question-form.tsx`**: mirrors `mentor-form.tsx`'s `useActionState` structure — text inputs for `question`/`optionA-D`/`category`/`explanation` (textarea for `question` and `explanation`), a `<select name="correctOption">` with options A–D, a `published` checkbox.

- **`page.tsx`**: paginated list. This app has no existing paginated admin list to copy, so specify exactly:

```tsx
const PAGE_SIZE = 25;

export default async function AdminQuizQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [questions, total] = await Promise.all([
    db.quizQuestion.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.quizQuestion.count(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ...render table (question text truncated, category, correctOption, a
  // published/draft badge like MentorsPage's active/inactive badge, edit/
  // delete links)...
  // ...render Prev/Next links to `/admin/quiz-questions?page=${page - 1}`
  // and `?page=${page + 1}`, omitting whichever is out of bounds (page <= 1
  // or page >= totalPages), plus a "Page X of Y" label...
}
```

- **`new/page.tsx`**, **`[id]/edit/page.tsx`**: mirror `admin/mentors/new/page.tsx` and `admin/mentors/[id]/edit/page.tsx` exactly (render `QuestionForm` bound to `createQuestion`/`updateQuestion.bind(null, id)`).

### `src/app/admin/quiz-settings/` (new directory, mirrors `admin/chat-settings/` exactly)

- **`actions.ts`**: `updateQuizSettings(_prevState, formData)` — Zod-validates `questionsPerAttempt`/`passThresholdPercent`/`maxAttemptsPerRollingDays`/`rollingWindowDays` (all `z.coerce.number().int()`, with sensible `.min()` bounds — e.g. `passThresholdPercent` between 1 and 100), calls `getQuizSettings()` first (ensures the row exists) then `db.quizSettings.update({ where: { id: "singleton" }, data: {...} })`, `revalidatePath("/admin/quiz-settings")`, returns `{ success: true }`.
- **`quiz-settings-form.tsx`**: mirrors `chat-settings-form.tsx` exactly, one labeled number input per field.
- **`page.tsx`**: mirrors `admin/chat-settings/page.tsx` exactly — `await getQuizSettings()`, render the form pre-filled.

### `src/app/admin/layout.tsx`

Add two new links to the `links` array, after `"Chat Settings"` and before `"Export"`:

```ts
{ href: "/admin/quiz-questions", label: "Quiz Questions" },
{ href: "/admin/quiz-settings", label: "Quiz Settings" },
```

### `src/app/account/certificate/page.tsx` (new file)

```tsx
import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatClassDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CertificatePage() {
  const { userId } = await requireUser();
  const [user, certificate] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.certificate.findUnique({ where: { userId } }),
  ]);
  if (!user) return null;

  if (!certificate) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Certificate</h1>
        <p className="mt-2 text-slate-600">
          You haven&apos;t earned your certificate yet. Complete every lesson checklist and pass
          the certification quiz to unlock it.
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <Link href="/courses" className="text-blue-600 hover:underline">Browse courses</Link>
          <Link href="/account/quiz" className="text-blue-600 hover:underline">Take the quiz</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 print:py-0 sm:px-6">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton />
      </div>
      <div className="rounded-2xl border-4 border-blue-700 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
          Certificate of Completion
        </p>
        <p className="mt-8 text-lg text-slate-600">This certifies that</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{user.username}</p>
        <p className="mt-6 text-lg text-slate-600">
          has completed the {"CreditCareCourse.com"} credit education program.
        </p>
        <p className="mt-8 text-sm text-slate-500">
          Issued {formatClassDate(certificate.issuedAt)}
        </p>
      </div>
    </div>
  );
}
```

- Note for the coder: this app has no separate "full name" field on `User` — only `username`/`email`. This spec deliberately uses `username` for the certificate rather than adding a new field/migration for a "display name" (that would be scope creep beyond what's needed here). Flagging this as confirmed, not silently invented.
- `formatClassDate` already exists in `src/lib/format.ts` (used elsewhere for class session dates) and is a reasonable existing date-formatting helper to reuse here rather than adding a new one — confirm it produces reasonable output for a plain date (if it's time-specific/class-specific in a way that reads oddly for a certificate date, the coder may write a small local one-line date formatter instead; either is acceptable).
- **Does NOT re-check membership status** — only checks whether a `Certificate` row exists, per the confirmed "permanent, never revoked" business decision. This must not be "fixed" to add a membership check.
- `PrintButton` (new tiny client component, e.g. inline in this file or a one-line separate file — coder's call) is just a button calling `window.print()`, given `.no-print` class hides it in print output (see the CSS addition below) so it never appears in the printed/saved-as-PDF result.

### `src/app/globals.css`

Add two small additions to support clean printing (no new PDF-generation dependency — browser print-to-PDF is the delivery mechanism, per the confirmed decision):

```css
@media print {
  .no-print {
    display: none !important;
  }
}
```

### `src/components/site-header.tsx`, `src/components/site-footer.tsx`

Add the class `no-print` to each component's outermost wrapping element, so the global site chrome doesn't appear in a printed/saved certificate. This is a minimal, surgical one-class addition to each file — do not otherwise restructure either component.

### `src/app/account/page.tsx`

Add a new "Certificate" section, placed after the existing "My class signups" section and before "Change password" (matching the existing card-list structure/spacing of every other section on this page):

```tsx
<div className="mt-8">
  <h2 className="text-lg font-semibold text-slate-900">Certificate</h2>
  {certificate ? (
    <p className="mt-2 text-sm text-slate-600">
      You&apos;ve earned your certificate.{" "}
      <Link href="/account/certificate" className="text-blue-600 hover:underline">
        View it
      </Link>
      .
    </p>
  ) : (
    <p className="mt-2 text-sm text-slate-500">
      Complete every course checklist and pass the{" "}
      <Link href="/account/quiz" className="text-blue-600 hover:underline">certification quiz</Link>{" "}
      to earn your certificate.
    </p>
  )}
</div>
```

Add `const certificate = await db.certificate.findUnique({ where: { userId } });` to the existing `Promise.all` block alongside `materialPurchases`/`coursePurchases`/`signups` (four-element array instead of three) — this page already runs several parallel queries for the logged-in user, so this fits the existing pattern rather than adding a separate later query.

## Edge cases

- **Quiz passed before finishing courses**: `QuizAttempt.passed` becomes `true` immediately, but `maybeIssueCertificate` returns early on the course-completion check — no certificate yet. Finishing the last remaining lesson later triggers `setLessonCompletion`'s `maybeIssueCertificate` call, which now finds the earlier passing attempt still satisfies condition (c) — certificate issues at that point. No requirement to retake the quiz.
- **4-attempts-in-30-days cap hit**: `startQuizAttempt` rejects before creating any `QuizAttempt` row, with a message distinct from the "no questions available" case.
- **Published bank smaller than `questionsPerAttempt`**: `selected` is simply the full shuffled array (`.slice(0, N)` on a shorter array just returns everything) — no error, no padding.
- **Zero published questions**: `startQuizAttempt` returns a clear "isn't available yet" error before creating any attempt or querying further.
- **Tampered/fabricated question set on submit**: grading only ever iterates `attempt.answers` (the server-locked rows created at start time); a client-submitted `answers` array is only used as a lookup table keyed by `questionId`, so it cannot introduce, remove, or reweight questions.
- **Double submission of the same attempt**: rejected via the `attempt.submittedAt` check — no re-grading, no double certificate-check side effects from resubmission.
- **Attempt ID belonging to another user**: rejected via `attempt.userId !== user.id`.
- **Admin edits/deletes a `QuizQuestion` referenced by past attempts**: `onDelete: SetNull` on `QuizAttemptAnswer.questionId` preserves the answer-detail row (with `questionId: null`); an in-flight attempt (started but not yet submitted) that referenced the now-deleted question simply excludes that question from both the numerator and denominator at grading time.
- **Admin unpublishes a course or deletes its last lesson after some users already hold a `Certificate`**: no effect on those already-issued certificates (permanent, per the confirmed decision); the "every currently-published course" check is always computed fresh against the live published-course set for anyone not yet certified, so this falls out naturally with no special-casing.
- **Concurrent near-simultaneous eligibility triggers** (e.g. a lesson-completion toggle and a quiz-pass landing close together): the `userId @unique` constraint on `Certificate` makes a true duplicate row impossible at the database level; the `try/catch` around `create` in `maybeIssueCertificate` absorbs the loser's constraint violation harmlessly.
- **Membership lapses after a certificate is already issued**: the certificate page only checks for the `Certificate` row's existence, never membership status — remains fully visible/valid, per the confirmed decision.
- **A course with zero lessons**: excluded entirely from the `coursesWithLessons` query (`lessons: { some: {} }` filters it out) — never blocks or contributes to certificate eligibility.

## Open questions

None — every ambiguity in the original request (certificate scope, onDelete choices, pagination approach, retake-limit implementation, certificate display's use of `username`) is resolved explicitly above with stated reasoning, not left as a placeholder for the coder. The actual quiz question content, its generation/review process, and any bulk-import tooling remain a separate, later task as explicitly scoped out above.
