# Changes: User accounts (signup, login, my-account, forgot username/password)

## Files changed

### Schema / data
- `prisma/schema.prisma`: added `User` model (email, username, passwordHash, sessionVersion, failedLoginAttempts, lockedUntil, resetToken, resetTokenExpiresAt).
- `prisma/migrations/20260721161054_add_users/`: migration for the above, generated and applied against a real local Postgres instance.

### Core libraries
- `src/lib/password.ts` (new): scrypt-based password hashing/verification, zero new dependencies (`crypto.scrypt` + `crypto.timingSafeEqual`).
- `src/lib/user-session.ts` (new): jose/JWT httpOnly-cookie session, cookie name `fcr_user_session`, fully independent of the admin session (`fcr_admin_session`). Payload carries `sessionVersion` so changing/resetting a password invalidates all other outstanding sessions without a server-side blocklist.
- `src/lib/dal.ts`: added `requireUser()` alongside the existing `requireAdmin()`.
- `src/lib/email.ts` (new): Resend wrapper mirroring `src/lib/stripe.ts`'s `isStripeConfigured()` pattern — `isResendConfigured()` / `getResend()` / `EMAIL_FROM`. Degrades gracefully (server-side `console.error`, generic success response to the client) when `RESEND_API_KEY` is unset.

### Routes
- `src/app/signup/{actions.ts,signup-form.tsx,page.tsx}`: email + username + password signup, duplicate-email/username rejected with one generic message (no field-level enumeration).
- `src/app/login/{actions.ts,login-form.tsx,page.tsx}`: login by username OR email. Database-backed brute-force lockout (5 failed attempts → 15 min lockout on the `User` row) — no in-memory state, safe for Vercel's serverless model.
- `src/app/account/{actions.ts,change-password-form.tsx,page.tsx}`: account info display, change-password (re-issues a fresh session for the current browser while bumping `sessionVersion` to invalidate all other sessions), logout.
- `src/app/account/forgot-username/{actions.ts,forgot-username-form.tsx,page.tsx}`: always returns a generic success message regardless of whether the email exists.
- `src/app/account/forgot-password/{actions.ts,forgot-password-form.tsx,page.tsx}`: generates a 1-hour single-use reset token (nanoid), same generic-response posture as forgot-username.
- `src/app/account/reset-password/{actions.ts,page.tsx,reset-password-form.tsx}`: `page.tsx` server-checks the token before rendering anything — invalid/expired tokens get a message and no form at all; valid tokens render the form. Completing the reset clears the token (single-use), bumps `sessionVersion`, and auto-logs the user in.

### Header
- `src/components/site-header.tsx`: converted to `async function SiteHeader()`, reads `verifyUserSession()` (never redirects) to show Log In/Sign Up when logged out, or My Account/Log out when logged in.

### Config
- `.env.example`: documented `USER_SESSION_SECRET` (required) and `RESEND_API_KEY`/`EMAIL_FROM` (optional).

## Bug found and fixed during verification
`requireUser()` originally called `destroyUserSession()` (a cookie write) when it detected a stale `sessionVersion` — but that check runs during a Server Component render (e.g. loading `/account`), and Next.js throws `Cookies can only be modified in a Server Action or Route Handler` if you mutate cookies there. This surfaced as a real "A server error occurred" page, not a redirect, the first time an old session was reused after a password change/reset. Fixed by dropping the cookie-clear and just redirecting to `/login` — the stale cookie is harmless since every future request re-runs the same check, and it's overwritten the next time the user actually logs in.

## Side effect (expected, verified)
Every route in the app is now server-rendered on demand (`ƒ`) instead of some being static (`○`) — confirmed in the `next build` output. This is expected: `SiteHeader` is in the root layout and now reads the session cookie on every request, so no page under it can be statically prerendered anymore. Not a regression to fix, just documented per the original spec's callout.

## Explicitly out of scope (documented follow-ups, not built)
- Linking existing anonymous Course/Material `Purchase` records to logged-in accounts ("my courses" library).
- Any Cloudflare Turnstile/CAPTCHA integration — still an open decision with the site owner.

## Build/lint status
- `npm run lint`: pass, no warnings.
- `npm run build` (against a real local Postgres): pass. Migration applies cleanly, `next build` compiles and typechecks with no errors.
- Manual/Playwright verification against `next start` (production build) on a real local Postgres instance, exercising: signup, duplicate-signup rejection, header auth-state in both directions, login by username and by email, 5-failed-attempt lockout and the lockout message, correct password still rejected while locked, login succeeding once lockout clears, change-password (current session stays logged in, other sessions invalidated by `sessionVersion`), forgot-username and forgot-password in the Resend-not-configured degraded mode (generic success message, no enumeration, no crash), full reset-password flow including invalid-token and single-use-token rejection, and cross-session invalidation after a password reset. All 27 checks passed.
