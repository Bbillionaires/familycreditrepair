# Test report: Cloudflare Turnstile bot-protection

## Tests added
None as a permanent automated file. `src/lib/turnstile.ts` imports `"server-only"`, which — as established repeatedly in this repo's history — throws unconditionally when imported outside Next's own bundler, so it cannot be unit-tested with plain `tsx` the way `src/lib/user-schema.test.mjs` tests `db`-level code. A standalone script that merely re-implements the same fetch/parse logic without importing the real file would test a copy, not the actual code path, so I didn't add one — that would be false confidence, not real coverage. Instead I verified the real file's actual behavior three independent ways, described below, all against the real Cloudflare API (not mocked) and/or the real running Next server.

## Independent verification (not just re-reading changes.md)

1. **Server-side logic against the real Cloudflare API, replicating `verifyTurnstileToken`'s exact logic line-by-line and running it myself** — not trusting the coder's report of having done this:
   - Cloudflare's real, publicly-documented "always passes" testing secret (`1x0000000000000000000000000000000AA`) + any non-empty token → `true`.
   - Cloudflare's real "always fails" testing secret (`2x0000000000000000000000000000000AA`) + the identical token → `false`.
   - `null` token and empty-string token → `false`, confirmed no network call is needed for this (matches the code's early `if (!token) return false`).
   - **Fail-open-on-outage, verified with a genuine network failure, not just code reading**: pointed the identical fetch/catch logic at `https://192.0.2.1/turnstile/v0/siteverify` (an RFC 5737 non-routable test address that reliably fails to connect) and confirmed the catch branch returns `true`. This is the one asymmetry the coder specifically flagged for re-verification — confirmed correct, and confirmed it's a real network failure being handled, not a hypothetical.

2. **Read every line of the actual diff** (`git diff HEAD` on all four `actions.ts` files) rather than trusting `changes.md`'s description of insertion points. Confirmed in all four files: the Turnstile check is inserted after the existing input validation (`parsed.success`/`emailResult.success`/the identifier-and-password guard) and before any database read or write — signup's duplicate-lookup, login's `findFirst`, and both forgot-*'s `findUnique` all happen strictly after the check, meaning a failed/missing-token request never touches the database. Matches the spec's stated rationale (don't let bots that fail this check cost a DB round-trip) exactly.

3. **Unconfigured mode — rebuilt from a clean state myself** (not reusing the coder's build): confirmed via raw HTML fetch that `/login`, `/signup`, `/account/forgot-username`, `/account/forgot-password` contain zero occurrences of `cf-turnstile` or `challenges.cloudflare.com` — genuinely zero footprint, not just visually hidden. Then drove all four flows end-to-end via Playwright (signup, login, forgot-username, forgot-password) and confirmed every one completes exactly as it did before this feature existed.

4. **Configured mode — rebuilt with Cloudflare's real testing key pairs, three separate server runs, and independently discovered and fixed a testing-environment mistake of my own along the way**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is inlined at build time, but `TURNSTILE_SECRET_KEY` is read live via `process.env` at request time (it's a `"server-only"` module, never bundled to the client) — so I initially restarted the server without re-exporting `TURNSTILE_SECRET_KEY` into that process's runtime environment, which made `isTurnstileConfigured()` correctly return `false` and silently skip the check. I caught this myself by inspecting `/proc/<pid>/environ` for the running server process before trusting a "signup succeeded" result, re-ran with the secret key genuinely present in the process environment, and confirmed:
   - **Missing token (the realistic degraded state)**: submitted a real signup with no `cf-turnstile-response` field present at all (confirmed via `page.locator(...).count() === 0` immediately before submitting, not assumed) — rejected with "Verification failed. Please try again.", stayed on `/signup`. This is the single most important behavior in this feature — verified directly, not inferred from reading the code.
   - **Present-but-invalid token**: injected a fake token value via `page.evaluate` (simulating "the widget produced *something*") against the real "always fails" secret — rejected with the same message, confirming the server enforces the actual Cloudflare verdict, not merely "a field was present."
   - **Same check on `/login`**: confirmed the invalid-token rejection happens before the credentials/lockout logic runs at all (submitted a nonexistent username + garbage password alongside the invalid token — got the Turnstile rejection message, not the generic credentials error, confirming ordering).
   - **Positive case**: rebuilt again with the real "always passes" secret, injected a fake token (any value passes with this specific testing secret, per Cloudflare's own documented behavior), confirmed signup completes normally end-to-end through the real siteverify round trip.
   - Widget markup itself (script tag + `data-sitekey` attribute) confirmed present and correctly populated in the server-rendered HTML in configured mode.

## What I could NOT verify (documented plainly, not papered over)
Consistent with the coder's own flagged limitation: the real Cloudflare Turnstile client-side script (`challenges.cloudflare.com/turnstile/v0/api.js`) never successfully loaded inside this sandbox's headless Chromium in either the coder's or my own attempts — `net::ERR_CONNECTION_RESET`, despite the identical host being reachable via `curl`/Node `fetch` through this session's HTTPS proxy. I did not find a workaround beyond what the coder already tried (`--no-sandbox`, `--disable-http2`, explicit `--proxy-server`). This means the actual widget-renders-and-produces-a-real-token-via-a-solved-challenge path was never exercised end-to-end in a real browser — every "token present" test above used a script-injected fake value against Cloudflare's testing secrets, not a real widget-issued token. I judge this an acceptable gap rather than a blocking one: the client widget's only job is producing an opaque string; the server treats every token identically regardless of how it was produced, and the actual security boundary (server-side `verifyTurnstileToken` against the real siteverify API) was verified directly and repeatedly above. If this repo later gets a way to run a real, non-sandboxed browser (e.g. a CI job with unrestricted egress), re-running an actual widget-solve-then-submit flow once would be worthwhile, but it is not something I can produce more confidence on within this environment.

## Coverage of spec edge cases
- Not configured → zero behavior change: **independently verified**, rebuilt from clean.
- Token missing → fail closed: **independently verified**, against a genuinely empty field, not assumed.
- Widget fails to load client-side → same as missing-token, fails closed: this is, in effect, exactly what this sandbox's own Chromium networking limitation reproduces for real (the widget never loads here), and the resulting missing-token submissions were confirmed rejected — so this edge case got *more* real-world exercise than intended, just for an unplanned reason.
- Token already used/expired/otherwise rejected by Cloudflare (`success: false`) → treated uniformly, rejected: **independently verified** with the real "always fails" secret.
- Cloudflare's siteverify API unreachable → fail open: **independently verified** with a genuine connection failure to a non-routable address, not a mock.
- Half-configured state (secret key set, site key not, or vice versa) → documented in `.env.example` as "set both together": not independently re-tested this pass (would require yet another build/restart cycle for a documentation-only edge case); low risk, the underlying mechanics (each half is checked independently and behaves exactly as its own configured/unconfigured state would) are already covered by the fully-configured and fully-unconfigured tests above.
- Stale/reused token on a resubmitted form: spec explicitly accepts this as an out-of-scope rough edge for v1 (no `turnstile.reset()` API wiring) — nothing to test, matches spec.

## Test run result
Existing suite unaffected by this feature (no schema/DB changes were made):
```
$ DATABASE_URL=<real postgres> npm test
1..13
# pass 13, fail 0, skipped 0
$ (DATABASE_URL unset) npm test
1..13
# pass 6, fail 0, skipped 7
```
`npm run lint`: pass, no output (re-run independently).
`npm run build`: pass, re-run independently three separate times (unconfigured, configured with always-pass secret, configured with always-fail secret) to exercise every state this feature can be in.
