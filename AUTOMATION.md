# Automation

This repo uses a four-stage skill pipeline for building features — `planner` → `coder` → `tester` → `reviewer` — plus a small set of scripts and a CI workflow that close the loop from "reviewed" to "shipped." This doc is the source of truth for how those pieces fit together, since the pieces themselves live in different places (this repo, `~/.claude/skills/`, and a Claude Code Remote Routine that isn't a file at all).

## What exists today (in this repo)

- **`.github/workflows/ci.yml`** — runs `npm ci`, `npm run lint`, and `npm run build` on every push/PR to `main`. Needs no secrets.
- **`scripts/health-check.mjs`** — checks whether a deployed URL returns a 2xx response. Run it as `node scripts/health-check.mjs <url>` or with `HEALTH_CHECK_URL` set. Exit codes: `0` up, `1` down/unreachable, `2` misconfigured (no URL given at all).
- **`scripts/ship.sh`** — the mechanical step after a reviewer `APPROVE`: commits any pending changes, pushes to `origin main`, and POSTs to `DEPLOY_HOOK_URL` if that env var is set. Safe to re-run with nothing pending (it no-ops rather than creating empty commits).
- **`package.json`'s `postinstall` script** — regenerates the Prisma client automatically after `npm install`/`npm ci`. Without this, a fresh clone or CI/host build fails because `src/generated/prisma` is gitignored and nothing else recreates it.

## Periodic check-and-fix loop: live

A Claude Code Remote Routine (`familycreditrepair health check`, id `trig_01HvsejmDS6FypqKVr6Um8PM`) runs this loop automatically. It's not a file in this repo — it's a scheduled trigger on the Claude Code Remote platform, so this section is its documentation of record.

- **Cadence: hourly, at :17 past.** The platform's minimum interval is hourly — the 30-minute cadence originally proposed here isn't available.
- **Mode:** spawns a fresh, standalone session on every fire (no memory of prior runs) rather than resuming a persistent one. Each run re-reads this file for context.
- **Notifications:** push only, and only "when a run finishes with something noteworthy" (i.e. it stays silent on healthy runs rather than pinging every hour).
- **What it actually does each run:** `npm ci && npm run lint && npm run build` (skips the build step gracefully if it has no `DATABASE_URL` available in that environment, rather than guessing), then `node scripts/health-check.mjs` against the live URL. On failure, it runs the planner → coder → tester → reviewer pipeline and ships via `scripts/ship.sh` on `APPROVE`, subject to the scope boundary below.
- **Known limitation:** fresh-session Routines created this way don't carry over MCP connector tools (e.g. the GitHub MCP server) — only the base tool set (Bash, file tools, `Skill`, etc.). This hasn't mattered so far since `scripts/ship.sh` uses plain `git`, not the GitHub API, but if a future fix genuinely needs GitHub-API-only capability, that's a real gap to solve, not something to route around silently.
- **To change cadence, prompt, or stop it entirely:** update or delete trigger `trig_01HvsejmDS6FypqKVr6Um8PM` (list/update/delete trigger tools, or the claude.ai Routines UI).

**Optional: register a `/ship` skill.** `~/.claude/skills/manifest.json` looks platform-managed (each entry has an externally-assigned `skillId`), so this repo's automation intentionally does *not* hand-edit it. If you want typing `/ship` to feel identical to `/planner`, `/coder`, etc., use the `skill-creator` skill to add a thin wrapper skill whose only job is to run `bash scripts/ship.sh`.

## Auto-fix scope boundary

This is the one policy that matters most for unattended runs, stated once here rather than duplicated (and risking drift) across script comments and Routine prompts:

- **Safe to auto-fix and ship without asking:** build errors, type errors, lint errors, failing existing tests, a health-check failure whose root cause is a clearly identifiable bug in this repo's own code.
- **Must stop and report instead of auto-fixing:** anything touching Stripe/payments code, anything touching auth/session code, anything requiring a new secret or environment variable, anything requiring a database schema migration, anything where the root cause is still ambiguous after one diagnostic pass, or anything that would require a force-push to `main`.
- **Retry cap:** if `reviewer` sends the same issue back to `coder` twice (i.e. two `REQUEST_CHANGES` verdicts in a row for the same underlying problem), stop and report rather than trying a third time. Nothing in this repo enforces that cap in code — it's a rule for whatever is driving the loop (a human, or the Routine's prompt) to follow.
