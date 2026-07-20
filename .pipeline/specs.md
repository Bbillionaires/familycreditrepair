# Spec: Self-maintaining pipeline (CI + health check + ship script)

## Summary
Close the loop on the existing planner → coder → tester → reviewer pipeline so the user can give one feature prompt and have it built, checked, and (once a deploy target exists) shipped with minimal follow-up prompts, plus lay the groundwork for an unattended periodic bug-check-and-fix loop. This spec covers exactly what a coder agent can build with file edits and shell commands: a CI workflow, a deterministic health-check script, a deterministic `ship` script that commits/pushes/redeploys after a reviewer APPROVE, a fix to a real gap in the repo's Prisma setup that would otherwise break CI, and documentation tying it together. It explicitly does NOT cover: creating the actual scheduled trigger (a Claude Code Remote "Routine"), or registering a new invokable `/ship` skill in `~/.claude/skills/manifest.json` — both require platform/MCP actions outside a coder agent's tool access (Read/Edit/Write/Bash/Grep/Glob) and are called out under Open Questions / Dependencies instead of silently attempted.

## Files to change

### `package.json`
- Change: add a `postinstall` script so the Prisma client is always regenerated after `npm install`/`npm ci`. Today `src/generated/prisma` is gitignored and nothing in `package.json` regenerates it — a fresh clone or CI checkout currently fails on `npm run build` with "Cannot find module '@/generated/prisma/client'" because `prisma migrate dev` does not itself run generate in this Prisma version (confirmed: only an explicit `npx prisma generate` produced `src/generated/prisma/`).
- Signatures: none (JSON edit). Add key `"postinstall": "prisma generate"` to the `"scripts"` object, after `"lint"` and before `"db:migrate"` to match existing alphabetическая-by-purpose grouping (lint/build-adjacent first, db: prefixed next).

### `scripts/health-check.mjs` (new file)
- Change: create a zero-dependency Node script (uses global `fetch`, available in Node 22 which is what this repo already targets per local dev — no new dependency needed) that checks whether a URL is reachable and returns 2xx.
- Signatures:
  ```js
  // scripts/health-check.mjs
  export async function checkHealth(url, timeoutMs = 10000) {
    // returns: { ok: boolean, status?: number, error?: string }
    // - wraps fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    // - ok: true only when response.status is 200-299
    // - on non-2xx: { ok: false, status: response.status }
    // - on thrown error (network failure, timeout): { ok: false, error: error.message }
  }

  async function main() {
    // url resolution order: process.argv[2], then process.env.HEALTH_CHECK_URL
    // if neither present: print "HEALTH_CHECK_URL not set and no URL argument given" to stderr, process.exit(2)
    // else: call checkHealth(url), print a one-line JSON result to stdout, then:
    //   - result.ok === true  -> process.exit(0)
    //   - result.ok === false -> process.exit(1)
  }
  // main() is invoked immediately when the file is run directly (import.meta.url === process.argv[1] check, or just always call main() since this file has no other entry point)
  ```
- This is the deterministic signal the (future, manually-created) periodic Routine and/or a scheduled CI job use to decide "is the deployed site actually up," distinct from `npm run build`/`npm run lint` which only catch build-time problems, not runtime/deployed problems.

### `scripts/ship.sh` (new file)
- Change: create a deterministic (no-LLM) shell script that performs the mechanical "ship" step after the reviewer has approved: commit any pending working-tree changes, push to `origin main`, and redeploy if a deploy hook is configured. This intentionally is NOT implemented as a Claude skill — skills in this environment are registered in `~/.claude/skills/manifest.json`, which appears to be managed by the platform (each entry has a `skillId` assigned externally), so a coder agent hand-editing that file is unsupported and may silently fail to register. A plain script avoids that dependency entirely and can still be invoked from a skill, a Routine prompt, or by hand.
- Signatures / exact behavior (bash, `set -euo pipefail` at the top):
  1. Require `.pipeline/review.md` to exist; if missing, print `"ship: .pipeline/review.md not found — run reviewer first"` to stderr and `exit 1`.
  2. Grep `.pipeline/review.md` for a line matching `^APPROVE$` under the `## Verdict` heading (i.e. the verdict section's content is exactly `APPROVE`, not `REQUEST_CHANGES`). If the verdict is not `APPROVE`, print `"ship: latest review verdict is not APPROVE — aborting"` to stderr and `exit 1`.
  3. Run `git status --porcelain`. If output is empty (nothing to commit), print `"ship: no pending changes — nothing to commit"`, skip step 4, and continue to step 5 (redeploy can still be triggered manually via re-running this script even with no new commit — see edge cases).
  4. If there are pending changes: `git add -A`, then `git commit -m "<message>"` where `<message>` is the first `## Files changed` bullet line from `.pipeline/changes.md` if present, else the literal string `"Automated ship: apply reviewed changes"`. Then `git push origin main`. If `git push` fails once (e.g. non-fast-forward), run `git pull --rebase origin main` exactly once and retry the push exactly once; if it fails again, print `"ship: push failed after one rebase retry — stopping, do not force-push"` to stderr and `exit 1`.
  5. Redeploy: if environment variable `DEPLOY_HOOK_URL` is set and non-empty, run `curl -fsS -X POST "$DEPLOY_HOOK_URL"`. On success, print `"ship: redeploy triggered"`. On curl failure, print `"ship: redeploy hook call failed (see above), but code was already pushed to main"` to stderr — this is a non-fatal warning, script still exits 0 if the commit/push in step 4 succeeded. If `DEPLOY_HOOK_URL` is unset or empty, print `"ship: DEPLOY_HOOK_URL not set — skipping redeploy (see README/AUTOMATION.md to configure)"`.
  6. Append one line to `.pipeline/ship-log.md` (create the file with a `# Ship log` header if it doesn't exist) in the form: `- <UTC ISO 8601 timestamp> | commit <short SHA of HEAD> | deploy: <triggered|skipped|failed>`.

### `.github/workflows/ci.yml` (new file)
- Change: add a GitHub Actions workflow that runs on `push` and `pull_request` targeting `main`, running install + lint + build so build-breaking bugs are caught automatically on every push, not just when someone remembers to run `npm run build` locally.
- Exact steps: checkout (`actions/checkout@v4`) → setup Node 22 (`actions/setup-node@v4` with `node-version: '22'`, `cache: 'npm'`) → `npm ci` → `npm run lint` → `npm run build`. No secrets/env vars required — confirmed the app has safe fallback defaults for `DATABASE_URL` and never reads `SESSION_SECRET`/`STRIPE_SECRET_KEY` during build/prerender (all pages that touch those are dynamic `ƒ` routes, not statically prerendered), so a bare `npm run build` succeeds with zero configured secrets, same as it does locally.

### `.env.example`
- Change: document the new optional `DEPLOY_HOOK_URL` variable that `scripts/ship.sh` reads, in the same style as the existing optional-variable comments.
- Add:
  ```
  # Optional: only needed for scripts/ship.sh to trigger a redeploy after shipping.
  # Get this from your host's dashboard (e.g. Vercel: Project Settings -> Git -> Deploy Hooks).
  DEPLOY_HOOK_URL=""
  ```

### `AUTOMATION.md` (new file, repo root)
- Change: document the full loop end-to-end in one place, since it spans a script, a workflow file, and a manual setup step (the Routine) that doesn't live in this repo at all. Must explicitly state, in plain language:
  1. What exists today after this spec ships: CI on every push (`.github/workflows/ci.yml`), a health-check script, a ship script.
  2. What is still a manual one-time step for the user/orchestrating session to do, and is NOT part of this spec's file changes: (a) connect a deploy host (e.g. Vercel) to this repo and put its deploy hook URL into `DEPLOY_HOOK_URL`; (b) create a Claude Code Remote Routine that periodically (proposed default: every 30 minutes) runs the check-and-fix loop; (c) optionally, use the `skill-creator` skill to register a `/ship` slash-command wrapper around `scripts/ship.sh` if the user wants it to feel identical to invoking planner/coder/tester/reviewer.
  3. The exact proposed Routine prompt text (so the user can copy it verbatim when creating the Routine themselves, or hand it to the orchestrating session to create), e.g.:
     > "Run `npm run lint`, `npm run build`, and `node scripts/health-check.mjs` (using the deployed URL) in familycreditrepair. If everything passes, do nothing and end the turn. If something fails: diagnose it, then run the planner → coder → tester → reviewer pipeline to fix it, staying strictly within the bug's scope. If review.md's verdict is APPROVE, run `bash scripts/ship.sh`. If you cannot produce a fix you're confident in after one pass, or the issue touches payments, auth/session code, or requires a schema migration or new secret, stop and report the diagnosis instead of guessing — do not loop indefinitely."
  4. The explicit auto-fix scope boundary (see Edge cases below), stated once here as the canonical source of truth rather than duplicated/drifting across the script comments and the Routine prompt.

## Edge cases

- `scripts/health-check.mjs` called with no URL and no `HEALTH_CHECK_URL` env var: exit code `2` (distinct from a real down-site failure, which is exit `1`), so a caller can tell "misconfigured" apart from "actually down."
- `scripts/health-check.mjs` target times out: treated the same as any other failure — `{ ok: false, error: "..." }`, exit `1`.
- `scripts/ship.sh` run when `.pipeline/review.md`'s last verdict is `REQUEST_CHANGES`: hard stop, `exit 1`, no commit/push/deploy attempted.
- `scripts/ship.sh` run with a clean working tree (nothing changed since last ship) and a caller just wants to force a redeploy: step 3/4 skip the commit cleanly (no error), and the script still proceeds to the redeploy step — this is intentional so re-running ship isn't destructive when there's nothing new.
- `scripts/ship.sh` push conflict (someone/something else pushed to main in between): one rebase + retry, then hard stop rather than ever force-pushing.
- `scripts/ship.sh` with `DEPLOY_HOOK_URL` unset (current state of this repo — no host connected yet): script still succeeds (exit 0) for the commit/push portion; redeploy is clearly logged as skipped, not silently ignored.
- CI workflow triggered from a fork/PR with no repo secrets available: unaffected, since no step requires secrets.
- Unattended fix loop (documented in AUTOMATION.md, not code the coder writes) touching Stripe/payments code, auth/session code, or requiring a new secret or DB migration: must halt and report rather than auto-fix, per the boundary this spec defines. This can't be enforced by the coder's file changes alone — it's a policy documented in AUTOMATION.md that the Routine's prompt text must encode.
- Reviewer sends changes back to coder repeatedly for the same issue: not bounded by any file in this repo (no retry counter exists in Claude Code's skill mechanism) — AUTOMATION.md must state a hard cap (recommend: after 2 REQUEST_CHANGES cycles on the same issue, stop and report instead of continuing) as a instruction for whoever/whatever is driving the loop, since there's no code-level place to enforce a counter across separate skill invocations.

## Dependencies / config changes / things this spec does NOT do
- No new npm dependencies. `scripts/health-check.mjs` uses Node's built-in `fetch`/`AbortSignal.timeout`, both available in Node 22.
- Requires no new secrets to function in CI (confirmed no build-time env var is mandatory).
- Does NOT create the Claude Code Remote Routine — that's an MCP tool call (`create_trigger`), not a file change, and must be done by whoever has that tool available after this spec's code is reviewed/shipped.
- Does NOT register a new `/ship` skill in `~/.claude/skills/manifest.json` — that file looks platform-managed (externally-assigned `skillId`s); hand-editing it from a coder agent is unsupported and may not actually make the skill invocable. Use the existing `skill-creator` skill for that if the user wants a `/ship` slash command instead of running `bash scripts/ship.sh` directly.
- Does NOT connect a deploy host. `DEPLOY_HOOK_URL` stays empty/no-op until the user connects Vercel (or another host) and fills it in — `scripts/ship.sh` degrades gracefully in the meantime rather than erroring.

## Open questions
- **Ship-to-main vs. ship-via-PR**: this spec has `scripts/ship.sh` push directly to `main`, matching how this repo has been worked on so far in this session (no feature-branch/PR convention currently in use here). If the user wants unattended fixes to land as a PR for a human to click-merge instead of landing directly on `main`, that changes step 4 of `scripts/ship.sh` materially (would need to create a branch + `gh`-equivalent PR call instead of pushing to main) — flagging this as a real design choice, not assuming it.
- **Routine cadence**: AUTOMATION.md proposes every 30 minutes as a default polling interval for the periodic check; this is a guess at a reasonable balance between "catches problems fairly quickly" and "doesn't burn tokens constantly on a low-traffic site," not something the user specified. Should be confirmed/adjusted when the Routine is actually created.
- **Retry cap on reviewer REQUEST_CHANGES**: recommended 2 cycles in Edge cases above; not a number the user specified.
