# Changes: Lesson-completion tracking (checklist)

## Files changed
- `prisma/schema.prisma`: added `LessonCompletion` model (`userId`/`lessonId` both `onDelete: Cascade`, `@@unique([userId, lessonId])`, `@@index([lessonId])`), plus `User.lessonCompletions` and `Lesson.completions` relation arrays.
- `prisma/migrations/20260723190058_add_lesson_completion/migration.sql`: new migration (diff+deploy workaround, same as every prior schema change in this repo).
- `src/app/courses/[id]/lesson-completion-actions.ts` (new): `setLessonCompletion(lessonId, completed)` — re-verifies login via `verifyUserSession()` + a `sessionVersion` match check (mirroring `requireUser()`'s stale-cookie guard, without redirecting), re-derives course ownership via a case-insensitive `Purchase` email match (same pattern as `account/page.tsx`), then idempotently `upsert`s (complete) or `deleteMany`s (incomplete) the `LessonCompletion` row and revalidates the course page.
- `src/app/courses/[id]/lesson-complete-checkbox.tsx` (new): client checkbox that calls `setLessonCompletion` directly as an async function from `onChange` (same pattern as `chat-widget.tsx` calling `sendChatMessage`), optimistically flips and reverts on error.
- `src/app/courses/[id]/page.tsx`: computes `loggedIn`/`canTrackProgress`/`completedLessonIds` via `verifyUserSession()` (not `requireUser()`, so anonymous token-based access is untouched) and a `Purchase` ownership check scoped to the logged-in user's own account email; renders `LessonCompleteCheckbox` per lesson when `canTrackProgress` is true, otherwise shows a "log in" or "not linked to your account" prompt above the lesson list — only inside the existing `hasAccess` branch, so the `!hasAccess`/no-token behavior is completely unchanged.

## Notes / deviations from spec
- None. Implemented exactly as specified, including the explicit `completed: boolean` target (rather than a blind toggle) so double-submits/retries stay idempotent, and the `sessionVersion` re-check in both the page and the action.

## Build/lint status
- `npm run lint`: 0 errors, 6 warnings (all pre-existing, unrelated to this feature — `_prevState`/`_formData` unused params in `chat-actions.ts`/`membership-actions.ts`).
- `npm run build`: passes. `/courses/[id]` compiles and is listed in the route output alongside every other existing route.
