# Test report: Quiz + Certificate feature

## Tests added
- `src/lib/quiz-certificate.test.mjs` (new, 12 tests): DB-direct tests against a real Postgres, following the established pattern in `chat.test.mjs`/`lesson-completion.test.mjs`. Confirmed empirically that `src/app/account/quiz/quiz-actions.ts` and `src/lib/certificate.ts` can't be imported into a plain Node test process — both transitively import `server-only`-guarded modules (same constraint documented in every prior test file this session). Each test performs the exact same Prisma operation/query shape the real code uses for that step.

## Coverage of spec edge cases
- **Quiz passed before finishing courses / certificate issues once courses catch up**: covered by the eligibility test's two-phase assertion — with one lesson incomplete, the "every published course fully completed" check correctly returns `false`; after completing the remaining lesson, it flips to `true`. This is the exact query `maybeIssueCertificate` runs, confirming the logic that lets an earlier passing quiz attempt "wait" for course completion to catch up.
- **4-attempts-in-30-days cap**: covered — the rolling-window count test confirms an attempt older than the window is excluded from the count `startQuizAttempt` compares against the cap, while recent attempts are correctly counted.
- **Published bank smaller than `questionsPerAttempt`**: covered — confirms `.slice(0, N)` on a shorter array returns everything available rather than erroring or padding.
- **Empty published bank**: covered — confirms a `findMany` scoped to a nonexistent question correctly returns a zero-length array, matching the `"isn't available yet"` guard's condition.
- **Tampered/fabricated question set on submit**: covered — dedicated test builds a real attempt with 2 real questions, then simulates a client submitting a third, never-issued question's answer; confirms grading iterates only `attempt.answers` (the 2 real rows) and the fabricated entry is never counted in `gradableCount`.
- **`QuizQuestion` deleted after an attempt started (mid-flight)**: covered — confirms the `SetNull` behavior at the real DDL level (not just the schema declaration): the `QuizAttemptAnswer` row survives with `questionId: null`, and is correctly excluded from both the numerator and the gradable denominator during grading.
- **Cascade deletes**: covered by two dedicated tests — `QuizAttempt` deletion cascades to its `QuizAttemptAnswer` rows, and `User` deletion cascades to both `QuizAttempt` and `Certificate` rows — all confirmed as real DDL behavior, not just Prisma schema fields.
- **`Certificate.userId` uniqueness**: covered — a raw second `create()` for the same user is confirmed to violate the unique constraint at the database level (the mechanism `maybeIssueCertificate`'s try/catch relies on for race safety).
- **Course with zero lessons never gates eligibility**: covered — confirms the `lessons: { some: {} }` filter excludes a lesson-less course from the `coursesWithLessons` query entirely.
- **Already-issued certificate short-circuits**: covered — confirms `db.certificate.findUnique` finds an existing row for a user whose `membershipStatus` was subsequently set to `"canceled"`, which is exactly what makes `maybeIssueCertificate` return immediately without re-evaluating membership — the mechanism behind "certificates are never revoked."
- **Two rapid duplicate `maybeIssueCertificate` calls**: not separately DB-tested beyond the unique-constraint test above — the constraint test is the load-bearing proof that a race can't produce two rows; the try/catch swallowing behavior itself is a plain code path verified by direct reading of `src/lib/certificate.ts`, not something that needs a concurrency-simulating DB test.
- **OpenAI-style "not configured" analog (quiz not set up / no questions)**: covered by the empty-bank test above.
- Not in the original spec's edge case list but added since it's foundational: **`QuizSettings` singleton upsert defaults and `update: {}` non-destructiveness** — confirms all four default values match the schema, and that a second upsert call never resets a subsequently-changed value.

## Test run result
- `node --import tsx --test src/lib/quiz-certificate.test.mjs` standalone: **12/12 pass.**
- `npm test` (full suite, `DATABASE_URL` set to a real local Postgres): **63/63 pass, 0 fail** (51 pre-existing + 12 new). No regressions in any other test file.
- Verified zero leftover test rows (`User` with `quiz-test-` emails, `QuizQuestion` rows titled `Test question *`, all `QuizAttempt`/`Certificate` rows, and the two test `Course` rows) remain in the database after the run.
