# Spec: End-user account system (signup, login, my account, forgot username/password)

## Summary
Add a real, multi-user account system for site visitors — email + username + password signup, login, a "my account" page (view info, change password, log out), and forgot-username/forgot-password recovery emails via Resend. This is entirely separate and independent from the existing single-shared-admin-password system: different cookie name, different signing secret, different DAL guard, no shared code paths. It is the foundation the future quiz feature will require, but the quiz itself is not part of this task. Linking existing anonymous Course/Material `Purchase` records to a logged-in account (a "my courses" library) and any CAPTCHA/Turnstile integration are explicitly out of scope, noted as open follow-ups, not silently built or silently skipped without mention.

## Files to change

### `prisma/schema.prisma`
- Change: add a `User` model.
- Signature:
  ```prisma
  model User {
    id                  String    @id @default(cuid())
    email               String    @unique
    username            String    @unique
    passwordHash        String
    sessionVersion      Int       @default(0)
    failedLoginAttempts Int       @default(0)
    lockedUntil         DateTime?
    resetToken          String?   @unique
    resetTokenExpiresAt DateTime?
    createdAt           DateTime  @default(now())
    updatedAt           DateTime  @updatedAt
  }
  ```
  `email` and `username` are always stored lowercase (normalized at the point of writing in the action code, not via a DB-level trigger — see actions below), so uniqueness is effectively case-insensitive without needing citext or a computed column.
- Generate the migration with `npx prisma migrate dev --name add_users` against a real reachable Postgres (start the local one if needed), exactly as done for the two prior schema changes in this repo. Do not hand-write the SQL.

### `src/lib/password.ts` (new file)
- Change: password hashing using Node's built-in `crypto.scrypt` (promisified), no new dependency. Stored format is a single string `"<saltHex>:<hashHex>"`, matching this codebase's flat-field convention (e.g. `Purchase.downloadToken`).
- Signatures:
  ```ts
  import "server-only";
  export async function hashPassword(password: string): Promise<string>
  export async function verifyPassword(password: string, stored: string): Promise<boolean>
  ```
  `hashPassword`: generate a random 16-byte salt (`crypto.randomBytes(16).toString("hex")`), compute `scrypt(password, salt, 64)` (promisified), return `` `${saltHex}:${hashHex}` `` with the derived key hex-encoded.
  `verifyPassword`: split `stored` on `:` into `saltHex`/`hashHex`; if the split doesn't produce exactly two parts, return `false` (malformed stored value, don't throw). Recompute `scrypt(password, saltHex, 64)`, then compare the recomputed hex against `hashHex` using `crypto.timingSafeEqual` on `Buffer.from(...)` of each (mirroring the existing `safeCompare` helper in `src/app/admin/auth-actions.ts` — same pattern, new file, since this one operates on password hashes, not the admin's single shared password).

### `src/lib/user-session.ts` (new file)
- Change: mirrors `src/lib/session.ts`'s exact jose/cookie pattern, as a fully separate, parallel implementation — different cookie name, different env var for the signing secret, different payload shape. Do not modify `src/lib/session.ts`.
- Signatures:
  ```ts
  import "server-only";
  const COOKIE_NAME = "fcr_user_session";
  const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // same 7-day duration as admin, for consistency

  export async function createUserSession(userId: string, sessionVersion: number): Promise<void>
  export async function destroyUserSession(): Promise<void>
  export async function verifyUserSession(): Promise<{ userId: string; sessionVersion: number } | null>
  ```
  - `createUserSession`: JWT payload `{ userId, sessionVersion }`, signed with `getSecretKey()` reading a **new, separate** env var `USER_SESSION_SECRET` (not `SESSION_SECRET` — the admin and user systems must not share a signing secret, so a leak of one never compromises the other). Same cookie options as `createAdminSession` (httpOnly, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`, `path: "/"`, `expires` matching the JWT's expiry) but under `COOKIE_NAME = "fcr_user_session"`.
  - `verifyUserSession`: reads the cookie, `jwtVerify`s it, and returns the decoded `{ userId, sessionVersion }` on success or `null` on any failure (missing cookie, bad signature, expired, malformed payload) — same defensive try/catch-returns-false pattern as `verifyAdminSession`, adapted to return the payload instead of a boolean since callers need `userId`. **This function does not by itself check the payload's `sessionVersion` against the database** — that check belongs in the DAL (`requireUser`, below), which is the one place with DB access in the current call chain; keeping `verifyUserSession` cookie-only (like `verifyAdminSession` is) keeps this function's contract simple and matches the existing file's shape as closely as possible given the one genuine difference (stateful version check) this system needs.
  - If `USER_SESSION_SECRET` is not set, throw the same style of error `verifyAdminSession`'s `getSecretKey()` throws for `SESSION_SECRET` (fail loudly at signing/verifying time, not silently).

### `src/lib/dal.ts`
- Change: add `requireUser`, alongside the existing `requireAdmin` (this file is generically named/purposed as the auth-guard DAL, not admin-specific — extend it rather than creating a second file).
- Signature:
  ```ts
  export async function requireUser(): Promise<{ userId: string }> {
    const session = await verifyUserSession();
    if (!session) redirect("/login");

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user || user.sessionVersion !== session.sessionVersion) {
      await destroyUserSession();
      redirect("/login");
    }

    return { userId: user.id };
  }
  ```
  This is where the `sessionVersion` staleness check actually happens (requires `db`, which `user-session.ts` deliberately doesn't import, keeping that file's concerns to cookies/JWTs only). A version mismatch means the password was changed elsewhere since this cookie was issued — treat it exactly like no session at all, and clear the stale cookie while we're here so the browser doesn't keep resending a dead token.

### `src/lib/email.ts` (new file)
- Change: mirrors `src/lib/stripe.ts`'s exact `getStripe`/`isStripeConfigured` pattern for Resend.
- Signatures:
  ```ts
  import "server-only";
  import { Resend } from "resend";

  let resendClient: Resend | null = null;

  export function getResend(): Resend {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not set. Add it to your environment to send account recovery emails."
      );
    }
    if (!resendClient) {
      resendClient = new Resend(apiKey);
    }
    return resendClient;
  }

  export function isResendConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
  }
  ```
  Also export one more constant here: `export const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";` — Resend's shared sandbox sender address works with no domain verification but can only deliver to the Resend account's own verified address; a real deployment will set `EMAIL_FROM` once a domain is verified. Document this in `.env.example` (below) rather than hardcoding an assumption about which one is active — the code doesn't need to know or care which mode it's in, it just uses whatever `EMAIL_FROM` resolves to.

### `.env.example`
- Change: document the two new optional variables and the one new required-for-user-accounts variable.
- Add:
  ```
  # Required for user accounts (signup/login). Generate with: openssl rand -base64 32
  USER_SESSION_SECRET=""

  # Optional: only needed for forgot-username/forgot-password emails.
  RESEND_API_KEY=""
  # Optional: defaults to Resend's shared sandbox sender (only deliverable to your
  # own Resend account email until you verify a domain). Set this once you have
  # a verified sending domain in Resend.
  EMAIL_FROM=""
  ```

### `src/app/signup/actions.ts` (new file)
- Change: `signupAction`, creating a `User` row, hashing the password, and logging the new user in immediately (auto-login after signup — no separate "please log in" step).
- Signature:
  ```ts
  export type SignupFormState = { error?: string } | undefined;
  export async function signupAction(_prevState: SignupFormState, formData: FormData): Promise<SignupFormState>
  ```
- Validation (Zod): `email` (valid email, trimmed, lowercased), `username` (trimmed, lowercased, 3–20 chars, pattern `^[a-z0-9_-]+$`), `password` (min 8 chars — do not add composition/complexity rules beyond length, per current NIST guidance; this codebase has no precedent for complex regex password rules and shouldn't invent one here), `confirmPassword` (must match `password`, checked in code after the schema parse, not via a Zod `.refine` if that's more awkward to wire into this codebase's existing `safeParse` + `issues[0]` error-message pattern — your call on the cleanest way, just surface a clear "Passwords don't match" error).
- Logic: check `db.user.findFirst({ where: { OR: [{ email }, { username }] } })` first; if found, return a single generic error `"An account with that email or username already exists."` — do not reveal which of the two collided (avoids leaking which specific emails/usernames are registered via a duplicate-signup probe). Hash the password, create the user, `createUserSession(user.id, user.sessionVersion)`, `redirect("/account")`.

### `src/app/signup/page.tsx`, `signup-form.tsx` (new files)
- Change: mirror `src/app/admin/login/page.tsx` + `login-form.tsx`'s exact layout/style (centered card, `useActionState`), adapted for four fields (username, email, password, confirmPassword) instead of one.

### `src/app/login/actions.ts` (new file)
- Change: `loginAction`. This is a **different file and different function** from `src/app/admin/auth-actions.ts`'s `loginAction` — no naming collision since they live in separate modules, but do not confuse the two or attempt to share code between them; they're independent by design.
- Signature:
  ```ts
  export type LoginFormState = { error?: string } | undefined;
  export async function loginAction(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState>
  ```
- Fields: `username` (or email — accept either in the same input, see edge cases), `password`.
- Logic:
  1. Normalize the submitted identifier to lowercase, look up `db.user.findFirst({ where: { OR: [{ email: identifier }, { username: identifier }] } })`.
  2. If no user found: return a generic `"Incorrect username/email or password."` (never reveal whether the identifier itself was wrong vs. the password).
  3. If `user.lockedUntil` is set and in the future: return `"Too many failed attempts. Try again after " + <formatted time> + "."` — **check this before checking the password**, and return this same message regardless of whether the submitted password would have been correct (don't leak "your password was actually right, you're just locked out").
  4. Otherwise verify the password. On failure: increment `failedLoginAttempts`; if it reaches `5`, set `lockedUntil` to 15 minutes from now; save; return the same generic incorrect-credentials message as step 2 (don't reveal "you're now locked out" vs. "wrong password" on the attempt that triggers the lock — only reveal lock status on a *subsequent* attempt, once `lockedUntil` is actually checked at the top of a later request per step 3). On success: reset `failedLoginAttempts` to `0` and `lockedUntil` to `null`, `createUserSession(user.id, user.sessionVersion)`, `redirect("/account")`.

### `src/app/login/page.tsx`, `login-form.tsx` (new files)
- Change: mirror the admin login page's layout, one field for username-or-email + one for password, link to `/signup` and to `/account/forgot-username` / `/account/forgot-password`.

### `src/app/account/actions.ts` (new file)
- Change: `changePasswordAction`, `logoutAction`.
- Signatures:
  ```ts
  export type ChangePasswordFormState = { error?: string; success?: boolean } | undefined;
  export async function changePasswordAction(_prevState: ChangePasswordFormState, formData: FormData): Promise<ChangePasswordFormState>
  export async function logoutAction(): Promise<void>
  ```
- `changePasswordAction`: `requireUser()` first. Fields: `currentPassword`, `newPassword`, `confirmNewPassword`. Verify `currentPassword` against the stored hash — if wrong, return `{ error: "Current password is incorrect." }` (do not proceed). Validate `newPassword` (same min-8 rule as signup) and that it matches `confirmNewPassword`. On success: hash the new password, `db.user.update` setting `passwordHash` **and incrementing `sessionVersion` by 1** in the same update (invalidates every other device's session), **then immediately call `createUserSession(user.id, newSessionVersion)`** to re-issue a fresh cookie for the current browser with the new version — otherwise the user who just changed their password would immediately be logged out by their own action, which is confusing UX for zero security benefit (they just proved they know the new password). Return `{ success: true }` rather than redirecting, so the my-account page can show an inline confirmation instead of a jarring navigation.
- `logoutAction`: `destroyUserSession()`, `redirect("/")` (not `/login` — logging out of a *user* account should land you back on the public homepage, unlike admin logout which lands on the admin login screen since there's nothing else for an admin session to do; a logged-out visitor is just a visitor again).

### `src/app/account/page.tsx`, `change-password-form.tsx` (new files)
- Change: `requireUser()` at the top, load `db.user.findUnique({ where: { id: userId } })`, display `username` and `email` (read-only text, no edit-email/edit-username in this v1 — not asked for, don't add it), a change-password form (colocated client component, mirroring `src/app/calendar/signup-form.tsx`'s colocation pattern), and a logout button/form matching the exact style of `src/app/admin/layout.tsx`'s logout `<form action={logoutAction}>` button.

### `src/app/account/forgot-username/actions.ts`, `page.tsx`, `forgot-username-form.tsx` (new files)
- Change: `forgotUsernameAction(_prevState, formData)` — single `email` field. **Always** returns the same generic success state (e.g. `{ success: true }`, no error branch surfaced to the client for "email not found" — a malformed/empty email is the only client-visible validation error worth showing) regardless of whether the email exists, to avoid confirming which emails are registered.
  - If the email exists in `db.user`: if `isResendConfigured()`, send an email (via `getResend().emails.send({ from: EMAIL_FROM, to: user.email, subject: "Your username", text/html: \`Your username is: ${user.username}\` })`) containing the username. If Resend isn't configured, `console.error("RESEND_API_KEY not set — cannot send forgot-username email for", user.email)` (so the admin can diagnose from server logs why a real user says they never got the email) but still return the same generic success to the client.
  - If the email doesn't exist: do nothing, still return the same generic success.
- The page always shows a message like "If that email is registered, we've sent the username to it." after submission — no separate error/success UI branch based on whether the account actually existed.

### `src/app/account/forgot-password/actions.ts`, `page.tsx`, `forgot-password-form.tsx` (new files)
- Change: `forgotPasswordAction(_prevState, formData)` — single `email` field, same generic-response posture as forgot-username.
  - If the email exists: generate `resetToken = nanoid(32)`, `resetTokenExpiresAt = now + 1 hour`, `db.user.update` (this **overwrites** any previously-requested token — only the most recently requested reset link is ever valid, per the edge cases below). If Resend configured, email a link to `` `${origin}/account/reset-password?token=${resetToken}` `` (reuse the exact `getSiteOrigin()` helper already duplicated in `src/app/materials/actions.ts` and `src/app/courses/actions.ts` — copy that same small function here too, matching the existing precedent of it being duplicated per-module rather than factored out, don't factor it out now as an unrelated refactor). If Resend not configured, `console.error(...)` same as forgot-username, still return generic success.
  - If the email doesn't exist: do nothing, same generic success.

### `src/app/account/reset-password/actions.ts`, `page.tsx`, `reset-password-form.tsx` (new files)
- Change: `page.tsx` reads `?token=` from `searchParams`. Look up `db.user.findUnique({ where: { resetToken: token } })`. If not found, or `resetTokenExpiresAt` is in the past, render a clear "This link is invalid or has expired." message with a link back to `/account/forgot-password` — do not render a password form at all in this case.
  If valid: render `reset-password-form.tsx`, a client component posting to `resetPasswordAction(token, _prevState, formData)` (bind the token, mirroring how e.g. `updateMaterial.bind(null, id)` binds an id in the existing codebase). Fields: `newPassword`, `confirmNewPassword`.
  `resetPasswordAction`: re-validate the token server-side (don't trust that the page's earlier check is still true — re-check existence/expiry inside the action itself, since time has passed and this is a separate request). On success: hash the new password, update `passwordHash`, increment `sessionVersion`, **clear `resetToken` and `resetTokenExpiresAt` to `null`** (single-use — the same link cannot be used twice), `createUserSession(user.id, newSessionVersion)` (auto-login after a successful reset, redirect to `/account` — nicer UX than making them log in again with the password they just set, and there's no security reason to force a second step here since they just proved control of the reset link), `redirect("/account")`.

### `src/components/site-header.tsx`
- Change: convert to an `async function SiteHeader()` (currently synchronous) so it can check the visitor's session, and add an auth-state area to the header **separate from the existing content `links` array** — do not add Login/Sign Up/Account into that array, which is for content-section navigation; add a distinct element (e.g. a `<div className="flex items-center gap-2">` placed after the `<nav>`, adjusting the outer flex container as needed) showing:
  - Logged out: `Log In` and `Sign Up` links (to `/login`, `/signup`).
  - Logged in: `My Account` link (to `/account`) and a small inline `<form action={logoutAction}>` logout button (import `logoutAction` from `src/app/account/actions.ts`).
  Determine logged-in state via `requireUser`'s lower-level building block — call `verifyUserSession()` directly here (not `requireUser()`, which redirects; the header must never redirect, it just needs to know yes/no) — a `sessionVersion` mismatch check is not necessary in the header (worst case a just-invalidated session shows "My Account" for one nav render before `requireUser()` on the actual `/account` page redirects it to `/login` — acceptable, the header is a hint, not an authorization boundary).

## Edge cases
- **Login accepts either username or email in one field**: the single `identifier` input is checked against both columns via `OR`. If someone's chosen username happens to collide with someone else's email address (impossible today since both are globally unique across the same table, but confirm this is actually impossible: `username` and `email` are both `@unique` on the *same* `User` model, so a value can be *either* one user's email *or* another user's username, and the `OR` lookup could theoretically match two different rows if user A's username equals user B's email) — **use `findFirst` deliberately, not `findUnique`**, and if this scenario is a real concern it's already handled correctly by only ever authenticating against whichever single row `findFirst` returns and then checking that specific row's password; a same-value collision across the two different rows on two different columns doesn't create a security hole, it just means the login form would authenticate whichever one Postgres happens to return first for an ambiguous identifier — extremely unlikely in practice (would require user B to have registered a username exactly matching an existing user's email), not worth adding extra schema complexity to prevent for a v1.
- **Signup duplicate email/username**: single generic error, no distinction, as specified above.
- **Login lockout**: 5 failed attempts → 15-minute lockout, checked before password verification on every subsequent attempt during the lockout window; a successful login always resets both counters.
- **Password reset token reuse**: each new forgot-password request invalidates the previous token (overwritten, not appended); a used token is cleared immediately upon successful reset so it cannot be replayed.
- **Password reset token expired or unknown**: no password form rendered at all, just a message + link to request a new one.
- **Changing password while other sessions exist**: `sessionVersion` increments, invalidating all other devices' cookies on their next `requireUser()` check; the current browser gets a freshly re-issued cookie in the same request so it isn't logged out by its own action.
- **Resend not configured**: forgot-username/forgot-password still show the same generic "check your email" message to the visitor (no error, no mention of misconfiguration) but log a clear server-side error naming which email address's request couldn't actually be sent, so the site owner can diagnose from logs — this deliberately differs from the Stripe pattern (which *does* show a visible "not set up yet" message), because revealing recovery-flow success/failure to the public is itself an information-disclosure risk (email enumeration) that outweighs the operability convenience Stripe's pattern optimizes for.
- **Header session check on every request**: converting `SiteHeader` to async and calling `verifyUserSession()` (a cookie read) inside it, given `SiteHeader` renders inside the root layout wrapping every page, will very likely convert previously-static pages (`/free-credit-reports` currently builds as `○` static) into dynamically-rendered ones, since accessing cookies anywhere in a request's render tree marks that render as dynamic in this Next.js version. **This is an accepted, expected side effect of this feature, not a regression to prevent** — verify it by checking the build output's route table after this change and confirm in `changes.md` which routes changed from `○` to `ƒ`, rather than being surprised by it.
- **Empty/whitespace-only username or email**: rejected by the existing Zod `.trim().min(...)`-style validation already used throughout this codebase's other forms — apply the same pattern, don't invent a new one.

## Dependencies / config changes
- No new npm packages (`resend` is already installed; password hashing uses Node's built-in `crypto`).
- One new database migration (`add_users`) — generate with `prisma migrate dev` against a real Postgres, as with the two prior schema changes.
- One new **required** environment variable for this feature to function at all: `USER_SESSION_SECRET`. Two new **optional** ones: `RESEND_API_KEY`, `EMAIL_FROM`.

## Open questions
- None on the mechanics of this task. Restating the two explicitly out-of-scope items already agreed with the site owner: (1) no linking of existing Course/Material `Purchase` records to accounts yet (still anonymous-token-based, per the prior Course task's own deferred note); (2) no Cloudflare Turnstile/CAPTCHA (still an open, unresolved decision from an earlier conversation) — this task's login/signup throttling is server-side/database-backed only, no CAPTCHA widget.
