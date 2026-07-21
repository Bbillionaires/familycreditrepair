# Spec: Cloudflare Turnstile bot-protection on signup/login/forgot-username/forgot-password

## Summary
Add Cloudflare Turnstile as a bot-protection layer on the four public forms most exposed to automated abuse: `/signup`, `/login`, `/account/forgot-username`, `/account/forgot-password`. This sits on top of the already-shipped database-backed lockout and scrypt password hashing — it does not replace either. It follows this codebase's established graceful-degradation convention exactly (`isStripeConfigured()` in `src/lib/stripe.ts`, `isResendConfigured()` in `src/lib/email.ts`): when the two new env vars aren't set, every form works exactly as it does today, with zero behavior change and zero Cloudflare network calls. `/account` (change password) and `/account/reset-password` are explicitly out of scope — an active session and a possession-proven token respectively are already stronger anti-abuse signals than a CAPTCHA, so adding one there would be redundant.

## Files to change

### `src/lib/turnstile.ts` (new file)
- Change: server-side configuration check + verification helper, no new npm dependency (plain `fetch` to Cloudflare's REST endpoint).
- Signatures:
  ```ts
  import "server-only";

  export function isTurnstileConfigured(): boolean

  export async function verifyTurnstileToken(token: string | null, remoteip?: string): Promise<boolean>
  ```
  - `isTurnstileConfigured()`: `return Boolean(process.env.TURNSTILE_SECRET_KEY);` — same one-liner shape as `isStripeConfigured`/`isResendConfigured`.
  - `verifyTurnstileToken(token, remoteip?)`:
    1. If `!token` (missing/empty/null — covers the "widget never produced a token" and "field omitted entirely" cases), return `false` immediately, no network call. **This is the one case that must fail closed** — see rationale in Edge cases.
    2. Otherwise `POST` to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `Content-Type: application/x-www-form-urlencoded` and body `secret=<TURNSTILE_SECRET_KEY>&response=<token>` (plus `&remoteip=<remoteip>` when provided), built via `new URLSearchParams({...})`.
    3. If the fetch itself throws (network error/timeout) or the response is not `ok`, `console.error(...)` the failure (mirroring the existing `console.error("RESEND_API_KEY not set — ...")` server-diagnosability convention) and return `true` — **fail open on Cloudflare-side/network infra failures, not on the token itself being invalid.** See rationale in Edge cases; this is a deliberate, reasoned choice, not an oversight.
    4. Otherwise parse the JSON body and return `Boolean(data.success)`. A `success: false` response (expired token, already-used token, wrong secret, etc.) is treated uniformly — no special-casing individual `error-codes` values.
  - This function does **not** itself call `isTurnstileConfigured()` — callers (the four Server Actions) check that first and skip calling this function entirely when unconfigured, exactly like `getResend()`/`getStripe()` are only ever called after their own `isXConfigured()` guard. Keep `verifyTurnstileToken` simple and single-purpose.

### `.env.example`
- Change: document the two new variables, matching the existing comment style/placement (grouped near `RESEND_API_KEY`/`EMAIL_FROM` since both are optional bot/abuse-mitigation-adjacent features).
- Add:
  ```
  # Optional: enables Cloudflare Turnstile bot-protection on signup/login/
  # forgot-username/forgot-password. Get these from the Cloudflare dashboard
  # under Turnstile — no DNS or domain change required, this works standalone.
  NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
  TURNSTILE_SECRET_KEY=""
  ```

### `src/components/turnstile-widget.tsx` (new file)
- Change: one shared client component, used by all four forms instead of duplicating script-loading logic.
- Signature:
  ```tsx
  "use client";
  export default function TurnstileWidget()
  ```
- Logic: reads `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` directly (safe in a Client Component — Next.js inlines `NEXT_PUBLIC_*` vars into the client bundle at build time, no server round-trip needed). If falsy/empty, `return null` — renders nothing at all when not configured, matching the "forms work exactly as today" requirement. Otherwise renders:
  ```tsx
  <>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
    <div className="cf-turnstile" data-sitekey={siteKey} />
  </>
  ```
  using `Script` from `next/script` (default `afterInteractive` strategy — loads promptly once the page hydrates, not deferred like `lazyOnload`, since this gates form submission). Cloudflare's script auto-scans the DOM for `.cf-turnstile` elements and renders the widget into them implicitly (no `turnstile.render()` JS API call needed) — the widget injects its own `<input type="hidden" name="cf-turnstile-response" value="...">` as a descendant of that `div`, which is automatically included in the form's `FormData` on submit as long as the `div` is placed inside the `<form>` element. No props needed on `TurnstileWidget` — it is a self-contained, drop-in element.

### `src/app/signup/signup-form.tsx`
- Change: import `TurnstileWidget` from `@/components/turnstile-widget`, render `<TurnstileWidget />` immediately before the submit `<button>` (after the `confirmPassword` field's `<div>` and after the `{state?.error && ...}` line, i.e. as the last element inside the `<form>` before the button). No other changes to this file.

### `src/app/login/login-form.tsx`
- Change: same pattern — `<TurnstileWidget />` immediately before the submit `<button>`, after the `{state?.error && ...}` line. No other changes.

### `src/app/account/forgot-username/forgot-username-form.tsx`
- Change: same pattern — `<TurnstileWidget />` immediately before the submit `<button>`, inside the same `<form>` branch that's rendered when `!state?.success` (i.e. it must NOT render inside the `state?.success` early-return branch, since there's no form there to attach it to). No other changes.

### `src/app/account/forgot-password/forgot-password-form.tsx`
- Change: identical pattern to `forgot-username-form.tsx`. No other changes.

### `src/app/signup/actions.ts`
- Change: add an early Turnstile check inside `signupAction`, positioned **after** the Zod `parsed.success` check succeeds (so a request that's already invalid on shape doesn't waste a network round-trip to Cloudflare) and **before** the password-match check / `db.user.findFirst` duplicate lookup (so a bot request that fails verification never reaches the database at all).
- Exact insertion point and code, right after:
  ```ts
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  ```
  insert:
  ```ts
  if (isTurnstileConfigured()) {
    const turnstileToken = formData.get("cf-turnstile-response");
    const verified = await verifyTurnstileToken(
      typeof turnstileToken === "string" ? turnstileToken : null
    );
    if (!verified) {
      return { error: "Verification failed. Please try again." };
    }
  }
  ```
  Add `import { isTurnstileConfigured, verifyTurnstileToken } from "@/lib/turnstile";` to the top imports. Return type stays `SignupFormState` (`{ error?: string } | undefined`) — reusing the existing shape exactly, per the "do not invent a new error shape" requirement.

### `src/app/login/actions.ts`
- Change: add the same early Turnstile check inside `loginAction`, positioned **after** the existing `if (!identifier || !password) return { error: ... }` guard and **before** `db.user.findFirst` — i.e. before any database access at all, since login is the highest-value target for credential-stuffing bots and this check should gate the DB round-trip too.
- Exact insertion point: right after
  ```ts
  if (!identifier || !password) {
    return { error: "Incorrect username/email or password." };
  }
  ```
  insert:
  ```ts
  if (isTurnstileConfigured()) {
    const turnstileToken = formData.get("cf-turnstile-response");
    const verified = await verifyTurnstileToken(
      typeof turnstileToken === "string" ? turnstileToken : null
    );
    if (!verified) {
      return { error: "Verification failed. Please try again." };
    }
  }
  ```
  Add the same import. Return type stays `LoginFormState`. Note this message is deliberately distinct from `"Incorrect username/email or password."` — a CAPTCHA failure is not sensitive account information (unlike "wrong password" vs. "no such user," which the existing code correctly keeps indistinguishable), so there's no reason to blur it into the same generic string; "shape" in the "don't invent a new error shape" requirement means the `{ error: string }` type, not necessarily identical wording.

### `src/app/account/forgot-username/actions.ts`
- Change: add the same check inside `forgotUsernameAction`, positioned **after** the `emailResult.success` check and **before** `db.user.findUnique`.
- Exact insertion point: right after
  ```ts
  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message };
  }
  ```
  insert the same `isTurnstileConfigured()` / `verifyTurnstileToken` block as above, returning `{ error: "Verification failed. Please try again." }` on failure. Add the same import. Return type stays `ForgotUsernameFormState`.

### `src/app/account/forgot-password/actions.ts`
- Change: identical pattern, inserted after the `emailResult.success` check and before `db.user.findUnique`. Add the same import. Return type stays `ForgotPasswordFormState`.

## Edge cases
- **Turnstile not configured (`TURNSTILE_SECRET_KEY` unset)**: `isTurnstileConfigured()` returns `false`, every action skips the check entirely — zero behavior change from today, zero Cloudflare network calls, `TurnstileWidget` renders `null` so no script tag or div appears in the HTML either. This is the default state right now and must ship working exactly as today until real keys are added.
- **Token missing from form submission** (widget never rendered, JS disabled, field stripped, or a bot simply omits the field entirely): `verifyTurnstileToken(null)` returns `false` with no network call → the action rejects with `"Verification failed. Please try again."`. **This must fail closed.** If it failed open instead, Turnstile would provide zero actual protection — any scripted bot could bypass it for free simply by never submitting the field, which is exactly the population this feature exists to stop. This is the one case where "fail closed" is not a judgment call but a logical requirement of the feature doing anything at all.
- **Widget fails to load client-side** (ad blocker, privacy extension, or Cloudflare's own script being blocked/unreachable for that visitor): from the server's point of view this is indistinguishable from "token missing" above, and is rejected the same way. **This is a deliberate, accepted trade-off, not an oversight**: Cloudflare's default "Managed" mode is specifically designed to pass the overwhelming majority of real visitors invisibly (no visible challenge at all in most cases), so the realistic exposure is a small minority of users running aggressive script-blocking. Given the four affected forms are exactly the ones bots target most (credential stuffing on login, mass fake signups, recovery-email spam), the site owner's stated priority (avoid false-positive lockouts of real users) is better served by *not* enabling this feature until ready, or by choosing Turnstile's more lenient widget mode in the Cloudflare dashboard, than by having the code silently fail open here — a silent fail-open would make the feature a no-op against the exact threat it's meant to address. Recommendation only, easy to revisit: if real users report being blocked after this ships, the fix is a Cloudflare dashboard setting (widget mode), not a code change.
- **Token already used, expired, or otherwise rejected by Cloudflare (`success: false` in the siteverify response)**: treated identically to "token missing" — reject with the same generic message. No special-casing of individual `error-codes` values; there's no user-facing benefit to distinguishing "expired" from "invalid" from "already used," and doing so risks leaking implementation details to an attacker probing the endpoint.
- **Cloudflare's siteverify API itself is unreachable, slow, or erroring (network failure, non-2xx, malformed response)** — distinct from the token being wrong: here the *verification service*, not the *visitor*, is the source of failure. `verifyTurnstileToken` catches this, logs a `console.error` for the site owner to notice in server logs, and **returns `true` (fails open)**. Rationale, matching the site owner's stated priority for this feature: a transient Cloudflare-side outage should not be able to lock every real visitor out of signing up, logging in, or recovering their account — the existing database-backed lockout (5 failed attempts → 15-minute lock) remains fully active as the primary defense regardless of Turnstile's availability, so failing open here only means this one *secondary* layer briefly stands down during a rare outage, not that the site becomes undefended.
- **Stale/already-consumed token on a resubmitted form after a validation error** (e.g. a user fixes a typo in their password and clicks submit again without the Turnstile widget re-issuing a fresh token): out of scope for this v1 to solve with an explicit `turnstile.reset()` JS API call — the implicit auto-render mode this spec uses doesn't expose a widget handle to reset programmatically without materially more client-side code (holding a widget ID via the explicit `turnstile.render()` API instead of implicit auto-render). Accepted minor rough edge: in the rare case this happens, the user sees the same generic `"Verification failed. Please try again."` message as any other rejected-token case, and a normal page refresh resolves it (a fresh widget mount issues a fresh token). Not worth the added complexity for a first version; revisit if it turns out to affect real users in practice.
- **`remoteip` parameter**: optional per Cloudflare's API and not required for verification to work. Not wired up in this v1 (would require reading the request's IP from headers via `next/headers`, which varies by hosting environment/proxy setup) — omit it entirely for now rather than guessing at header names; `verifyTurnstileToken`'s signature already accepts an optional `remoteip` so it can be wired up later without a signature change.

## Dependencies / config changes
- No new npm packages — `next/script` is part of Next.js itself, and Cloudflare's siteverify API is called with a plain `fetch`.
- No database/schema changes.
- Two new **optional** environment variables: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. The feature is fully inert until both are set (the site key controls whether the widget renders client-side; the secret key controls whether the server enforces the check — in practice the site owner will set both together, but the code degrades correctly even if only one is set: widget renders but server-side `isTurnstileConfigured()` stays `false` and skips verification, or vice versa, widget doesn't render so real users could never produce a token and every submission would be rejected as "token missing" — **this specific half-configured state is worth calling out**: setting only `TURNSTILE_SECRET_KEY` without `NEXT_PUBLIC_TURNSTILE_SITE_KEY` would lock out every real visitor, since the server would enforce a check that the client-side widget was never rendered to satisfy. Document this in the `.env.example` comment as "set both together.").

## Open questions
None blocking. One judgment call was made rather than left open (the fail-open-on-Cloudflare-outage vs. fail-closed-on-missing-token asymmetry) — both sides of that decision are explicitly reasoned through in the Edge cases section above, with the specific trade-off flagged for the site owner to revisit if real-world behavior doesn't match expectations after this ships.
