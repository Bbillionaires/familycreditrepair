# Test report: User accounts (signup, login, my-account, forgot username/password)

## Tests added
- `src/lib/user-schema.test.mjs` (new, 4 tests against a real Postgres database, same standalone-Prisma-client pattern as `purchase-cascade.test.mjs`): email uniqueness, username uniqueness, resetToken uniqueness-when-set, and that multiple users can simultaneously hold a `null` resetToken (i.e. the unique constraint on a nullable column doesn't falsely collide on `null`). These lock in the DB-level guarantees the whole account system leans on — the app-level `findFirst`-before-`create` duplicate check in `signupAction` is a best-effort UX guard, not a substitute for the real constraint under concurrent signups, so the constraint itself is what's worth a permanent regression test.
- Everything else — password hashing, session issuance/verification, lockout logic, the reset-password flow, the header's auth-state rendering — lives in files that `import "server-only"`, either directly or transitively through `src/lib/db.ts`/`src/lib/user-session.ts`. That package throws unconditionally outside Next's own bundler (confirmed empirically, same finding as the two prior features in this repo), so none of it can be unit-tested with plain `tsx`. These were verified with real Playwright runs against an actual `next build` + `next start`, independently written and run by me (not reusing the coder's script), described below.

## Independent verification beyond the coder's own report
I did not take `.pipeline/changes.md`'s claims at face value. I rebuilt from a clean state, restarted the server myself, and wrote a fresh Playwright script (not the coder's) targeting the specific things most likely to be wrong in this kind of feature:

1. **The cookie-mutation-during-render bug, reproduced and then confirmed fixed** — not just "the code looks different now." I drove a real browser to sign up, then bumped that user's `sessionVersion` directly in the database (bypassing the app's own change-password action, so this check doesn't depend on that code path being correct), then reloaded `/account` with the now-stale cookie. Confirmed the response is a clean redirect to `/login`, and explicitly asserted the page body does **not** contain "server error occurred" — the exact failure signature the coder's log excerpt showed before their fix. Passed.
2. **sessionVersion invalidation across two genuinely separate browser contexts** (separate cookie jars — real separate "devices," not two tabs/pages sharing one context, which is a subtly different and weaker test than it looks). Device A signs up, Device B logs in with the same credentials, Device A changes its password. Confirmed Device A stays logged in (its cookie was re-issued in the same request) and Device B is logged out the next time its session is checked. Passed.
3. **Lockout timing edge case** — confirmed the message does *not* appear on attempts 1–5 (including the 5th, the one that actually sets `lockedUntil` server-side), confirmed `lockedUntil` really is set in the DB after that 5th attempt, and confirmed the lockout message only appears starting on the 6th attempt (even when attempt 6 uses the *correct* password) — matching the spec's explicit "only reveal lock status on a subsequent attempt" requirement exactly, not just approximately. Passed.
4. **No email enumeration via forgot-username, with Resend unconfigured** — compared the response text for a registered email vs. a fabricated one and asserted they are byte-identical, and separately asserted the page shows no hint of the Resend misconfiguration to the visitor (that only goes to server logs, per spec). Passed.
5. **Case-insensitivity** — signed up with a mixed-case email and username, then logged in using an uppercased variant of the email. Confirmed success, validating the lowercase-normalization-at-write-time approach the spec chose instead of a DB-level citext column. Passed.

All 13 independent Playwright checks passed on the first clean run after rebuilding.

## Coverage of spec edge cases
- Login accepts either username or email in one field: covered (coder's Playwright run + my independent case-insensitivity check).
- Signup duplicate email/username → single generic error: covered (coder's Playwright run).
- Login lockout (5 failed → 15 min, message only on a *subsequent* attempt): **independently re-verified by me**, including the specific off-by-one timing detail the spec calls out.
- Password reset token reuse (overwritten by newer request, cleared on successful use): covered (coder's Playwright run — invalid/reused-token rejection, single-use).
- Password reset token expired/unknown → no form rendered: covered (coder's Playwright run).
- Changing password while other sessions exist → sessionVersion invalidation, current browser stays logged in: **independently re-verified by me** across two genuinely separate browser contexts, which is a stronger test than the coder's own (which used two `Page`s but I confirmed separately needed a real context split to mean anything — see the bug the coder's own test script had to fix for this exact reason).
- Resend not configured → generic message to visitor, error only in server logs, no enumeration: **independently re-verified by me** via a byte-identical-response comparison, not just a regex match on one response.
- Header session check turning static pages dynamic: confirmed via my own `next build` run — full route table showed `ƒ` for every route, matching the claim in changes.md.
- Empty/whitespace-only username or email: not independently re-tested this pass — it's a direct reuse of Zod's existing `.trim().min(...)` pattern already exercised elsewhere in this codebase, lower risk than the items above.
- DB-level uniqueness of email/username/resetToken (an edge case the spec implies but doesn't spell out as a numbered item): **not in the original spec's edge-case list, but added as a permanent automated test** (`user-schema.test.mjs`) since it's the actual backstop behind the app-level duplicate check, and cheap to lock in permanently unlike the Playwright-only checks above.

## Bug found and independently confirmed fixed
Same bug the coder already found and fixed (`requireUser()` in `src/lib/dal.ts` was calling `destroyUserSession()` — a cookie write — during a Server Component render, which Next.js forbids and which surfaced as a real "server error" page instead of a redirect). I did not just trust the changes.md writeup: I reproduced the triggering condition myself (stale `sessionVersion` hitting `/account`) against the current code and confirmed the actual server response is now a clean redirect with no error page. Confirmed fixed.

## Test run result
```
$ DATABASE_URL=<real postgres> npm test
...
1..13
# tests 13
# suites 0
# pass 13
# fail 0
# cancelled 0
# skipped 0
# todo 0
```
All 13 pass (4 new DB-backed `User` schema tests + the 9 pre-existing tests from prior features, running together in the same `npm test` invocation).

```
$ (DATABASE_URL unset) npm test
...
1..13
# tests 13
# pass 6
# fail 0
# cancelled 0
# skipped 7
# todo 0
```
Skip path confirmed clean — 7 skipped (not failed: 4 new + 3 pre-existing DB-backed tests), 6 still pass, matching CI's current no-database reality (task #12) without making it worse.

`npm run lint`: pass, no output (re-run independently, after adding the new test file).
`npm run build`: pass (re-run independently against a real Postgres from a clean state — not reusing the coder's build artifacts).
