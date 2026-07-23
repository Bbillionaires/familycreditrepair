# Review: 1-on-1 mentoring request (request-then-approve, no booking/payment)

## Verdict
APPROVE

## Spec compliance
- **Schema**: `Mentor`/`MentorRequest` match the spec's fields exactly. `mentorId` is nullable with `onDelete: SetNull`, matching the `Purchase` precedent and the spec's explicit reasoning — verified this is real DDL, not just a Prisma-level illusion, via the test suite actually deleting a mentor with an existing request and confirming survival + null FK.
- **`mentoring/actions.ts`**: `createMentorRequest` re-validates the mentor server-side (`!mentor || !mentor.active`) rather than trusting the submitted dropdown value, matches the exact email body/subject copy specified, and both email sends (admin, optional mentor) are independently gated so one send attempt never blocks the other.
- **`admin/mentoring/actions.ts`**: `approveMentorRequest`/`declineMentorRequest` both check `if (request.status !== "pending") return;` before doing anything — correct, concrete answer to the double-approve edge case. Reasonable, non-deviating implementation choice: the shared `sendOutcomeEmail` helper isn't exported and doesn't change the two actions' required separate-named-exports shape.
- **Mentor CRUD**: full replication of the `admin/classes` file layout/conventions, including the dollars↔cents conversion mirroring `MaterialSchema`'s existing pattern.
- **Public page/form**: empty-mentor-list message present; only the fields the form needs are passed to the client component; the placeholder agreement text is clearly commented as non-final, exactly as directed — this is important given the CROA sensitivity flagged earlier for this specific feature, and it would have been easy to accidentally ship something that reads as "real" legal copy. It doesn't.
- **`.env.example`**: `ADMIN_NOTIFICATION_EMAIL` documented, no other new env vars — matches spec.
- **Out-of-scope items honored**: no calendar/slot-booking UI, no email relay/masking, no payment collection anywhere in the diff.

## Issues found
- None blocking.
- Non-blocking: the public `/mentoring` request form has no bot-protection (Turnstile), unlike the site's other public forms (login/signup/forgot-password/forgot-username). This wasn't in the spec — flagging as a genuine gap worth considering later, not a defect in what was asked for, since an unauthenticated form that triggers real emails (to the admin, and potentially to a mentor) is a mild spam vector as-is.
- Non-blocking: same defense-in-depth note as the membership review — `db.mentor.findMany()`/`db.mentorRequest.findMany()` in admin pages select all columns rather than an explicit `select`. Not an actual leak today (Server Components only serialize the rendered JSX), but cheap to tighten later.

## Recommendation
Merge. Build, lint (0 errors, the same 4 pre-existing warnings from the earlier membership feature, nothing new), and the full test suite (32/32 pass, including all 8 new mentoring tests, verified independently by re-running everything rather than trusting the tester's report alone) all check out. The one genuine spec deviation (Zod 4's `z.literal` API differing from what the spec assumed) was caught by the real compiler and fixed correctly, not silently worked around.
