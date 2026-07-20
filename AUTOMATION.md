# Automation

This repo uses a four-stage skill pipeline for building features — `planner` → `coder` → `tester` → `reviewer` — plus a small set of scripts and a CI workflow that close the loop from "reviewed" to "shipped." This doc is the source of truth for how those pieces fit together, since the pieces themselves live in different places (this repo, `~/.claude/skills/`, and a Claude Code Remote Routine that isn't a file at all).

## What exists today (in this repo)

- **`.github/workflows/ci.yml`** — runs `npm ci`, `npm run lint`, and `npm run build` on every push/PR to `main`. Needs no secrets.
- **`scripts/health-check.mjs`** — checks whether a deployed URL returns a 2xx response. Run it as `node scripts/health-check.mjs <url>` or with `HEALTH_CHECK_URL` set. Exit codes: `0` up, `1` down/unreachable, `2` misconfigured (no URL given at all).
- **`scripts/ship.sh`** — the mechanical step after a reviewer `APPROVE`: commits any pending changes, pushes to `origin main`, and POSTs to `DEPLOY_HOOK_URL` if that env var is set. Safe to re-run with nothing pending (it no-ops rather than creating empty commits).
- **`package.json`'s `postinstall` script** — regenerates the Prisma client automatically after `npm install`/`npm ci`. Without this, a fresh clone or CI/host build fails because `src/generated/prisma` is gitignored and nothing else recreates it.

## What is still a manual, one-time setup step (not part of this repo's code)

1. **Connect a deploy host** (e.g. Vercel) to this repo, then copy its deploy hook URL into `DEPLOY_HOOK_URL` (see `.env.example`). Until this is done, `scripts/ship.sh` still commits and pushes correctly, it just skips the redeploy step and says so.
2. **Create a Claude Code Remote Routine** for the periodic check-and-fix loop. This can't be a file in this repo — it's a scheduled trigger on the Claude Code Remote platform. Suggested cadence: every 30 minutes (adjust to taste; there's nothing repo-specific about this number). Suggested prompt, to hand to whoever/whatever creates the Routine:

   > Run `npm run lint`, `npm run build`, and `node scripts/health-check.mjs` (against the deployed URL) in familycreditrepair. If everything passes, do nothing and end the turn. If something fails: diagnose it, then run the planner → coder → tester → reviewer pipeline to fix it, staying strictly within the bug's scope. If review.md's verdict is APPROVE, run `bash scripts/ship.sh`. If you cannot produce a fix you're confident in after one pass, or the issue touches payments, auth/session code, or requires a schema migration or a new secret, stop and report the diagnosis instead of guessing — do not loop indefinitely.

3. **Optional: register a `/ship` skill.** `~/.claude/skills/manifest.json` looks platform-managed (each entry has an externally-assigned `skillId`), so this repo's automation intentionally does *not* hand-edit it. If you want typing `/ship` to feel identical to `/planner`, `/coder`, etc., use the `skill-creator` skill to add a thin wrapper skill whose only job is to run `bash scripts/ship.sh`.

## Auto-fix scope boundary

This is the one policy that matters most for unattended runs, stated once here rather than duplicated (and risking drift) across script comments and Routine prompts:

- **Safe to auto-fix and ship without asking:** build errors, type errors, lint errors, failing existing tests, a health-check failure whose root cause is a clearly identifiable bug in this repo's own code.
- **Must stop and report instead of auto-fixing:** anything touching Stripe/payments code, anything touching auth/session code, anything requiring a new secret or environment variable, anything requiring a database schema migration, anything where the root cause is still ambiguous after one diagnostic pass, or anything that would require a force-push to `main`.
- **Retry cap:** if `reviewer` sends the same issue back to `coder` twice (i.e. two `REQUEST_CHANGES` verdicts in a row for the same underlying problem), stop and report rather than trying a third time. Nothing in this repo enforces that cap in code — it's a rule for whatever is driving the loop (a human, or the Routine's prompt) to follow.
