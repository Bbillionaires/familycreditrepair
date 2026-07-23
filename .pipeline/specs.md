# Spec: Lesson-completion tracking (checklist)

## Summary

Add the ability for a logged-in member to mark individual lessons within a course as complete/incomplete, and to see which lessons they've completed when viewing a course. This is phase 1 of a larger certificates+quiz feature (not built here — certificates/quizzes are a separate, later task still pending a business decision on quiz structure). Course access today is entirely anonymous and token-based (`Purchase.downloadToken` matched against a `?token=` query param, no FK from `Purchase` to `User`), so this feature must layer real per-`User` progress tracking on top of that anonymous flow without breaking it — a logged-out visitor with a valid token must keep seeing full course content exactly as today, just without functional checkboxes.

Tracking is tied to the logged-in user's own account, verified independently of whatever token was used to view the page: a lesson's completion can only be tracked if the logged-in user's own account email has a matching `paid` `Purchase` for that lesson's course (case-insensitive, same pattern as `account/page.tsx`'s "My courses" list). This is deliberate — it means viewing a course via someone else's shared token never lets you track progress against your own account unless you also, separately, paid for that course under your own account's email. Since certificates will eventually depend on this data, tracking must reflect genuine ownership, not just "whoever holds a working link right now."

## Files to change

### `prisma/schema.prisma`

Add one new model and two new relation array fields:

```prisma
model User {
  // ...all existing fields unchanged...
  lessonCompletions LessonCompletion[]
}

model Lesson {
  // ...all existing fields unchanged...
  completions LessonCompletion[]
}

model LessonCompletion {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  lessonId    String
  completedAt DateTime @default(now())

  @@unique([userId, lessonId])
  @@index([lessonId])
}
```

**Both `onDelete: Cascade`** — a `LessonCompletion` row's only meaning is "this specific user completed this specific lesson." Compared against the two existing precedents in this schema:
- `Purchase`/`MentorRequest` use `SetNull`/no-FK because those rows are standalone business/financial records (a receipt, a request log) with value even after the referenced Material/Mentor/Course is gone.
- `ChatUsage`/`ChatPackPurchase` use `Cascade` because they're pure per-user state with zero standalone value once their `User` is gone.

`LessonCompletion` is exactly the `ChatUsage` case on **both** sides, not a mixed case: if the `User` is deleted, a leftover "someone completed this lesson" row with no owner is meaningless. If the `Lesson` is deleted (already `Cascade`s from its `Course` today), a leftover "this user completed lesson `X`" row referencing a lesson that no longer exists in the course's current content is equally meaningless — it can never be displayed, counted toward a checklist, or matched against a certificate's current lesson list again. There is no receipt-like reason to preserve either side, so `Cascade` on both, matching `ChatUsage`'s exact reasoning applied twice.

Generate the migration with the same non-interactive workaround used for every prior schema change in this repo: create `prisma/migrations/<timestamp>_add_lesson_completion/`, run `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/<timestamp>_add_lesson_completion/migration.sql`, then `npx prisma migrate deploy`, then `npx prisma generate`.

### `src/app/courses/[id]/lesson-completion-actions.ts` (new file)

Colocated with the `[id]` page (mirrors `course-unlock-form.tsx` living alongside `page.tsx` here, distinct from the course-list-level `src/app/courses/actions.ts`).

```ts
"use server";

import { revalidatePath } from "next/cache";
import { verifyUserSession } from "@/lib/user-session";
import { db } from "@/lib/db";

export type SetLessonCompletionResult = { error: string } | { ok: true };

export async function setLessonCompletion(
  lessonId: string,
  completed: boolean
): Promise<SetLessonCompletionResult> {
  const session = await verifyUserSession();
  if (!session) return { error: "You must be logged in to track progress." };

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.sessionVersion !== session.sessionVersion) {
    return { error: "Your session has expired. Please log in again." };
  }

  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return { error: "Lesson not found." };

  const ownsCourse = await db.purchase.findFirst({
    where: {
      courseId: lesson.courseId,
      status: "paid",
      email: { equals: user.email, mode: "insensitive" },
    },
  });
  if (!ownsCourse) {
    return { error: "This course isn't linked to your account." };
  }

  if (completed) {
    await db.lessonCompletion.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      update: {},
      create: { userId: user.id, lessonId },
    });
  } else {
    await db.lessonCompletion.deleteMany({ where: { userId: user.id, lessonId } });
  }

  revalidatePath(`/courses/${lesson.courseId}`);
  return { ok: true };
}
```

Key points for the coder:
- Uses `verifyUserSession()`, **not** `requireUser()` — this action must return a plain error object for an anonymous/expired caller, never redirect (a redirect here would be a confusing UX for what's meant to be a background checkbox toggle, and `requireUser()`'s redirect behavior doesn't fit a non-form-field server action called from a client event handler).
- Re-checks `user.sessionVersion !== session.sessionVersion` explicitly, matching `requireUser()`'s exact stale-cookie check in `src/lib/dal.ts` — `verifyUserSession()` alone only validates the JWT signature/expiry, it does **not** check the DB `sessionVersion`, so without this line a cookie issued before a password change (which increments `sessionVersion`) would still be able to toggle completions. This must not be skipped.
- Re-derives course ownership itself via the same case-insensitive `Purchase` email match `account/page.tsx` already uses — never trusts that the client only renders/calls this from a legitimate state. A crafted call with a `lessonId` from a course the caller never paid for (under their own account email) is rejected here regardless of what the UI shows.
- `completed: true` uses `upsert` with `update: {}` (idempotent create-or-noop, same pattern as `ChatSettings`'s singleton upsert) — calling it twice in a row never creates a duplicate row or errors.
- `completed: false` uses `deleteMany` (not `delete`), which is a no-op if no matching row exists rather than throwing — calling it twice in a row (or on a lesson never marked complete) never errors.
- Because both branches are idempotent based on the explicit `completed` target value (not a blind flip), double form-submits/network retries can never leave the wrong end state — this is why the action takes an explicit `completed: boolean` rather than being a stateless toggle like `admin/users/actions.ts`'s `toggleComp`.

### `src/app/courses/[id]/lesson-complete-checkbox.tsx` (new file)

`"use client"`. Calls `setLessonCompletion` directly as an async function from the checkbox's `onChange` (same established pattern as `chat-widget.tsx` calling `sendChatMessage` directly, not via `useActionState`/a bound form — there's no multi-field form here, just a single instant toggle).

```tsx
"use client";

import { useState, useTransition } from "react";
import { setLessonCompletion } from "./lesson-completion-actions";

export default function LessonCompleteCheckbox({
  lessonId,
  initiallyComplete,
}: {
  lessonId: string;
  initiallyComplete: boolean;
}) {
  const [completed, setCompleted] = useState(initiallyComplete);
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={completed}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.checked;
          setCompleted(next);
          startTransition(async () => {
            const result = await setLessonCompletion(lessonId, next);
            if ("error" in result) {
              setCompleted(!next); // revert the checkbox on failure
            }
          });
        }}
        className="h-4 w-4 rounded border-slate-300 text-blue-600"
      />
      Mark as complete
    </label>
  );
}
```

- Optimistically flips the checkbox immediately, then reverts it if the server call errors (e.g. stale session) — no separate error banner needed for this small a UI element; the checkbox visually snapping back is enough feedback.
- `initiallyComplete` is computed server-side on the course page (see below) and passed down as a prop — no client-side data fetch needed.

### `src/app/courses/[id]/page.tsx`

Add, after the existing `hasAccess` computation and before the return statement:

```ts
import { verifyUserSession } from "@/lib/user-session";
import LessonCompleteCheckbox from "./lesson-complete-checkbox";
// (Link already needs importing from "next/link" if not already present)

// ...after the existing `hasAccess` block...

let loggedIn = false;
let canTrackProgress = false;
let completedLessonIds = new Set<string>();

const session = await verifyUserSession();
if (session) {
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (user && user.sessionVersion === session.sessionVersion) {
    loggedIn = true;
    const ownsCourse = await db.purchase.findFirst({
      where: {
        courseId: course.id,
        status: "paid",
        email: { equals: user.email, mode: "insensitive" },
      },
    });
    if (ownsCourse) {
      canTrackProgress = true;
      const completions = await db.lessonCompletion.findMany({
        where: { userId: user.id, lessonId: { in: course.lessons.map((l) => l.id) } },
      });
      completedLessonIds = new Set(completions.map((c) => c.lessonId));
    }
  }
}
```

In the existing `hasAccess` render branch (the `<div className="mt-8 space-y-8">` block), inside each lesson's card, render the checkbox right after the lesson title when `canTrackProgress` is true:

```tsx
<h2 className="text-lg font-semibold text-slate-900">{lesson.title}</h2>
{canTrackProgress && (
  <div className="mt-2">
    <LessonCompleteCheckbox
      lessonId={lesson.id}
      initiallyComplete={completedLessonIds.has(lesson.id)}
    />
  </div>
)}
```

And once, above the lessons list in the `hasAccess` branch (only rendered when there's at least one lesson, and only one of the two applies at a time):

```tsx
{course.lessons.length > 0 && !canTrackProgress && (
  <p className="mb-4 text-sm text-slate-500">
    {!loggedIn ? (
      <>
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>{" "}
        to track your progress toward a future certificate.
      </>
    ) : (
      "These lessons aren't linked to your account yet, so progress can't be tracked here."
    )}
  </p>
)}
```

This directly implements the three required states:
1. Token valid + logged in + user's own account has a matching paid Purchase for this course → `canTrackProgress` true → working checkboxes, real per-user state.
2. Token valid + not logged in → `loggedIn` false → content unchanged, no checkboxes, "Log in to track..." prompt with a link to `/login`. Content access itself (`hasAccess`) is completely untouched — this is purely additive.
3. Token valid + logged in but no matching Purchase under their own account email (e.g. viewing someone else's shared link, never purchased this course themselves) → `loggedIn` true, `canTrackProgress` false → content unchanged, no checkboxes, distinct "isn't linked to your account" copy (does not imply logging in would help, since they already are).
4. No valid token → unchanged from today, this entire block is inside the existing `hasAccess` branch and never runs.

Zero-lesson course: `course.lessons.length > 0` guards the prompt paragraph so nothing extra renders; the existing "Lessons coming soon" fallback is untouched.

## Out of scope (confirmed, not built)

- Any quiz/certificate/question-bank logic.
- Any change to how `Purchase.downloadToken` is generated or validated — `hasAccess`'s computation is completely untouched.
- Any change to `/account`'s existing "My courses" list — no progress indicator added there in this pass. This is a natural small future addition (the same `completedLessonIds`-style query could compute a "3/8 lessons complete" count per course), but adding it now would touch a page this spec doesn't otherwise need to change, so it's deferred rather than bundled in.

## Edge cases

- **Logged in, valid token, but token's Purchase email ≠ user's own account email**: resolved above — tracking is gated on the *logged-in user's own* account email having a matching paid Purchase for the course, completely independent of which token is in the URL. Viewing via someone else's shared link never enables tracking unless the viewer *also* separately owns the course themselves.
- **Toggling a lesson in a course the user has no matching Purchase for (crafted `lessonId`)**: rejected server-side in `setLessonCompletion` via the same `Purchase` re-check — the client-side `canTrackProgress` gate is a UI convenience only, never trusted as the real authorization boundary.
- **Marking complete twice / unmarking twice in a row**: idempotent by construction (`upsert`/`deleteMany` on the explicit target value) — no duplicate rows, no error, covered in the action's design above.
- **Course with zero lessons**: `course.lessons.map(...)` is empty, no checkboxes or prompts render, existing "Lessons coming soon" text unchanged.
- **User has no Purchase match at all under their own email (never bought anything, just logged in via someone else's link)**: same resolution as the email-mismatch case — `ownsCourse` query finds nothing, `canTrackProgress` stays false, "isn't linked to your account" copy shown.
- **Admin deletes a Lesson with existing `LessonCompletion` rows**: cascade-deleted along with the lesson (per the `onDelete: Cascade` decision above) — no orphaned rows, no FK error.
- **Admin/user deletes a User with existing `LessonCompletion` rows**: cascade-deleted along with the user, same reasoning.
- **Stale session cookie (password changed elsewhere, `sessionVersion` bumped, JWT not yet expired)**: both the page's read path and the action's write path explicitly re-check `user.sessionVersion === session.sessionVersion` (mirroring `requireUser()`'s exact check) — a stale cookie is treated as logged-out for this feature's purposes, consistent with how every other authenticated read/write in this app already behaves.

## Open questions

None — every ambiguity called out in the original request (onDelete behavior, the token/account-email mismatch case, whether to touch `/account`'s course list) is resolved explicitly above with reasoning, not left as a placeholder for the coder.
