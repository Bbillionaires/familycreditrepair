# Changes: 1-on-1 mentoring request (request-then-approve, no booking/payment)

## Files changed
- `prisma/schema.prisma`: added `Mentor` and `MentorRequest` models. `MentorRequest.mentorId` is nullable with `onDelete: SetNull`, matching the `Purchase` precedent (deleting a mentor keeps request history intact instead of destroying it).
- `prisma/migrations/20260723163403_add_mentor_and_mentor_request/migration.sql`: new migration (diff+deploy workaround, same non-interactive-environment constraint as the two prior schema-changing tasks).
- `src/app/mentoring/actions.ts` (new): `createMentorRequest` — validates input, re-checks the mentor is still active server-side, creates the request, and sends best-effort notification emails (admin via new `ADMIN_NOTIFICATION_EMAIL`, plus the mentor if `notifyMentorOnRequest` is set) using the existing `src/lib/email.ts` Resend pattern.
- `src/app/mentoring/page.tsx` (new): public page, empty-mentor-list message, passes only the fields the form needs to the client component.
- `src/app/mentoring/mentor-request-form.tsx` (new): client form with the mentor dropdown, request fields, and the clearly-commented placeholder agreement checkbox.
- `src/app/admin/mentoring/actions.ts` (new): `approveMentorRequest`/`declineMentorRequest` — idempotency guard (`if (request.status !== "pending") return;`), then status update + best-effort outcome email to the requester. Factored the actual email-send call into one shared `sendOutcomeEmail` helper (not exported) to avoid duplicating the Resend-call boilerplate between the two actions — the two actions themselves remain separate, explicit exported functions per the spec, not one parameterized action.
- `src/app/admin/mentoring/page.tsx` (new): admin list of every request across all mentors, status badges, Approve/Decline forms shown only for `"pending"` rows, `"(mentor removed)"` fallback for a `null` mentor relation.
- `src/app/admin/mentors/actions.ts`, `mentor-form.tsx`, `page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx` (all new): full Mentor CRUD, replicating `admin/classes`'s exact file layout/conventions (dollars↔cents conversion mirrors `MaterialSchema`'s `priceDollars`→`priceCents`).
- `src/app/admin/layout.tsx`: added `Mentors` and `Mentoring requests` nav links, after `Users` and before `Export`.
- `.env.example`: added `ADMIN_NOTIFICATION_EMAIL` (optional), documented in the same comment style as existing entries.

## Notes / deviations from spec
- `z.literal(true, { errorMap: () => ... })` from the spec doesn't compile against the installed Zod 4 (`^4.4.3`) — that's a Zod 3-era API. Fixed to `z.literal(true, { message: "You must agree to continue" })`, which is Zod 4's actual second-argument shape. Confirmed via the real compiler error, not guessed; no other file in this codebase uses `z.literal` with a custom message to cross-check against, so this was a genuine spec/library-version mismatch, not an existing-convention violation.
- Everything else implemented exactly as specified, including the two open questions the spec deliberately left unresolved (no nav link added anywhere to `/mentoring` yet; `Mentor.bio` included as specified, unused beyond being passed through to the form).

## Build/lint status
- `npm run lint`: 0 errors, 4 warnings — all four are pre-existing (from the earlier membership feature's `_prevState`/`_formData` unused params), none new from this change.
- `npm run build`: passes after the Zod fix above. All new routes (`/mentoring`, `/admin/mentors`, `/admin/mentors/new`, `/admin/mentors/[id]/edit`, `/admin/mentoring`) compiled and are listed in the route output.
