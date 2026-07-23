# Test report: Lesson-completion tracking (checklist)

## Tests added
- `src/lib/lesson-completion.test.mjs` (new, 9 tests): DB-direct tests against a real Postgres, following the established pattern in `chat.test.mjs`/`mentoring.test.mjs`. Confirmed empirically that `src/app/courses/[id]/lesson-completion-actions.ts` cannot be imported into a plain Node test process — it transitively imports `src/lib/user-session.ts` and `src/lib/db.ts`, both `server-only`-guarded (same constraint documented in every prior test file this session). Each test performs the exact same Prisma operation/query shape the real code uses for that step.

## Coverage of spec edge cases
- **Marking complete twice in a row**: covered — "marking a lesson complete twice in a row (upsert, update:{}) creates exactly one row" confirms the exact `upsert`/`update:{}` shape from `setLessonCompletion`'s `completed:true` branch never creates a duplicate.
- **Unmarking twice in a row**: covered — "unmarking a lesson twice in a row (deleteMany) never throws" confirms `deleteMany` (not `delete`) is safe to call repeatedly, including when no row exists at all.
- **Token/account-email mismatch resolution (tracking gated on the logged-in user's own account email, not the token's Purchase email)**: covered by two tests — the case-insensitive-match test confirms a Purchase under a differently-cased version of the user's own email still grants ownership (matching `account/page.tsx`'s established pattern), and the no-ownership test confirms a Purchase under a genuinely different email (simulating someone else's shared token) does NOT grant ownership, even though a paid Purchase for that course exists.
- **Toggling a lesson in a course the user doesn't own (crafted lessonId)**: covered by the same no-ownership test — the `ownsCourse` query is the sole server-side authorization gate, and confirmed to correctly return `null` when the only Purchase for that course belongs to a different email.
- **`@@unique([userId, lessonId])` actually enforced at the DB level**: covered — dedicated test performs a raw second `create()` (bypassing the app's own upsert logic entirely) and confirms Prisma rejects it, exercising the real migration/constraint rather than just the schema declaration.
- **Admin deletes a Lesson with existing `LessonCompletion` rows**: covered — dedicated cascade test confirms the row is actually gone (real DDL behavior, not just the Prisma schema field), matching the `onDelete: Cascade` decision.
- **Admin deletes a User with existing `LessonCompletion` rows**: covered — same, on the `userId` side.
- **Stale session cookie (`sessionVersion` mismatch)**: covered — dedicated test confirms the exact `user.sessionVersion === session.sessionVersion` comparison both `setLessonCompletion` and `page.tsx` use correctly distinguishes a fresh session from a stale one.
- **Course with zero lessons**: not a DB-level concern — verified by reading `page.tsx` directly: `course.lessons.map(...)` over an empty array renders nothing, and the `course.lessons.length > 0 &&` guard on the prompt paragraph means neither the checkbox nor the login/ownership prompt render for a lesson-less course; the existing "Lessons coming soon" fallback is untouched by this diff.
- **`completedLessonIds` only reflects the current course's lessons**: not explicitly required as a "spec edge case" by name, but added since it's foundational to the page's correctness — dedicated test confirms a completion recorded against a lesson in a different course does not leak into the current course's `completedLessonIds` set, via the exact `lessonId: { in: [...] }` scoping query the page uses.

## Test run result
- `node --import tsx --test src/lib/lesson-completion.test.mjs` standalone (with `DATABASE_URL` set to a real local Postgres): **9/9 pass.**
- `npm test` (full suite): **51/51 pass, 0 fail** (42 pre-existing + 9 new). No regressions in any other test file.
- Verified zero leftover test rows (`User` with `lesson-test-` emails, all `LessonCompletion` rows, and `Course` rows titled `Test Course *`) remain in the database after the run.
