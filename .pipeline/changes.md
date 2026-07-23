# Changes: Quiz + Certificate feature

## Files changed
- `prisma/schema.prisma`: added `QuizSettings` (singleton), `QuizQuestion`, `QuizAttempt`, `QuizAttemptAnswer`, `Certificate` models, plus `User.quizAttempts`/`User.certificate` relation arrays. `QuizAttempt.userId`/`Certificate.userId` use `onDelete: Cascade` (no standalone value once the user is gone, matching `ChatUsage`/`LessonCompletion`); `QuizAttemptAnswer.attemptId` uses `Cascade` (detail rows meaningless without their parent attempt); `QuizAttemptAnswer.questionId` deliberately uses `onDelete: SetNull` (nullable) — the one relation in this diff that departs from the Cascade-everything pattern, reasoned in code comments: the attempt's score is already stored as a plain `Int` on `QuizAttempt`, so this preserves historical per-answer detail (which option was selected, correct/incorrect) for admin review even after a question is edited/deleted, rather than silently destroying that history.
- `prisma/migrations/20260723193000_add_quiz_and_certificate/migration.sql`: new migration (diff+deploy workaround, same as every prior schema change in this repo).
- `src/lib/quiz-settings.ts` (new): `getQuizSettings()`, exact mirror of `chat-settings.ts`'s singleton upsert pattern.
- `src/lib/certificate.ts` (new): `maybeIssueCertificate(userId)` — re-checks membership eligibility, at-least-one-passing-quiz-attempt, and "every currently-published course with ≥1 lesson fully completed" fresh from the database every call; idempotent via a `findUnique`-then-`create` check plus a try/catch around the unique-constrained create to absorb a rare concurrent-caller race.
- `src/app/courses/[id]/lesson-completion-actions.ts`: added a call to `maybeIssueCertificate(user.id)` in the `completed: true` branch only (marking complete), not on un-marking.
- `src/app/account/quiz/quiz-actions.ts` (new): `startQuizAttempt()` (session/membership check → rolling-window retake-limit count → random subset of published questions, pre-creating server-locked `QuizAttemptAnswer` rows → returns attempt id + questions without correct answers) and `submitQuizAttempt(attemptId, answers)` (ownership + already-submitted checks → grades strictly from server-stored attempt-question rows, ignoring any client-submitted data not matching a locked-in question → persists score/passed → calls `maybeIssueCertificate` on a pass).
- `src/app/account/quiz/page.tsx`, `quiz-widget.tsx` (new): eligibility-gated entry page (reuses `BecomeMemberForm`) and an all-questions-on-one-page client widget calling the actions directly as async functions (same pattern as `chat-widget.tsx`).
- `src/app/account/certificate/page.tsx`, `print-button.tsx` (new): certificate display gated only on a `Certificate` row existing (never re-checks membership status), print-friendly layout using `window.print()` — no new PDF dependency.
- `src/app/globals.css`: added a `@media print { .no-print { display: none !important; } }` rule.
- `src/components/site-header.tsx`, `src/components/site-footer.tsx`: added the `no-print` class to each component's outermost element so site chrome doesn't appear in a printed certificate.
- `src/app/admin/quiz-questions/` (new: `actions.ts`, `question-form.tsx`, `page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`): full CRUD mirroring `admin/mentors/`'s file layout, with query-param pagination (`?page=N`, 25 per page) on the list page since this is the first admin list in the app expected to hold hundreds of rows.
- `src/app/admin/quiz-settings/` (new: `actions.ts`, `quiz-settings-form.tsx`, `page.tsx`): singleton settings form mirroring `admin/chat-settings/` exactly.
- `src/app/admin/layout.tsx`: added "Quiz Questions" and "Quiz Settings" nav links after "Chat Settings".
- `src/app/account/page.tsx`: added `certificate` to the existing parallel `Promise.all` query block, and a new "Certificate" section (issued/not-yet-issued) after "My class signups".

## Notes / deviations from spec
- The spec suggested a shared `verifySession()` helper for the two quiz actions; dropped it after a real TypeScript build error (the discriminated-union return type didn't narrow cleanly through `"error" in verified`). Inlined the session/membership check directly in each function instead, which is also what `chat-actions.ts` already does (no shared helper there either) — this is a closer match to established convention, not a functional deviation.
- Everything else implemented exactly as specified.

## Build/lint status
- `npm run lint`: 0 errors, 6 warnings (all pre-existing, unrelated to this feature).
- `npm run build`: passes. All new routes (`/account/quiz`, `/account/certificate`, `/admin/quiz-questions`, `/admin/quiz-questions/new`, `/admin/quiz-questions/[id]/edit`, `/admin/quiz-settings`) compile and are listed in the route output.
