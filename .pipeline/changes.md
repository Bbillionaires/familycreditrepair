# Changes: Self-maintaining pipeline (CI + health check + ship script)

## Files changed
- `package.json`: added `"postinstall": "prisma generate"` — fixes a real bug where a fresh clone/CI/host build fails because `src/generated/prisma` is gitignored and nothing regenerated it. This is almost certainly what just broke the user's Vercel build.
- `scripts/health-check.mjs` (new): `checkHealth(url, timeoutMs)` + a CLI entry point. Exit `0` up, `1` down, `2` misconfigured (no URL given).
- `scripts/ship.sh` (new, executable): gated on `.pipeline/review.md`'s verdict being exactly `APPROVE`; commits + pushes pending changes to `origin main` (one rebase-and-retry on push conflict, never force-push); POSTs to `DEPLOY_HOOK_URL` if set, otherwise skips redeploy with a clear message; appends a line to `.pipeline/ship-log.md`.
- `.github/workflows/ci.yml` (new): `npm ci` → `npm run lint` → `npm run build` on push/PR to `main`. No secrets required.
- `.env.example`: documented the new optional `DEPLOY_HOOK_URL` variable that `scripts/ship.sh` reads.
- `AUTOMATION.md` (new): end-to-end explanation of the loop, including the two manual one-time setup steps that are explicitly *not* part of this change (connecting a deploy host, creating the periodic Routine), the proposed Routine prompt text, and the auto-fix scope boundary / retry cap policy.

## Notes / deviations from spec
- **Fixed a bug I introduced while implementing `scripts/ship.sh`, not present in the spec itself:** the spec's step 6 (always append a log line) combined with step 3's plain `git status --porcelain` check meant every run's own uncommitted log entry would make the *next* run look "dirty," causing an empty-ish commit on every single invocation forever — defeating the spec's own "re-running ship isn't destructive when there's nothing new" edge case. Fixed by (a) excluding `.pipeline/ship-log.md` from the dirty-check via pathspec, and (b) when there *is* a real change to ship, folding the log line into that same commit via `git commit --amend --no-edit` (computed after the redeploy step, since the log line wants to reference the redeploy outcome) instead of leaving it as a perpetual second diff. Verified with a sandboxed git repo: repeated no-op runs now correctly report "nothing to commit" and never touch `origin`; a real change still produces exactly one pushed commit.
- One accepted cosmetic quirk from that same fix: because the log line is folded into the commit via `--amend` *after* being written, the SHA it records is the pre-amend SHA, one step "behind" the actual final commit it ends up living inside. This is an inherent self-reference limit (a log can't durably record its own final hash without infinite regress) and doesn't affect correctness — the log entry is still part of the right commit, just references it by an sha that no longer resolves standalone. Not fixed further to avoid reintroducing commit spam.
- Did not touch `.env` (only `.env.example` was in scope per spec) and did not touch `~/.claude/skills/manifest.json` or create a `/ship` skill, per the spec's explicit "does NOT do" list.
- Did not create the Claude Code Remote Routine — no MCP tool access from this agent's toolset (Read/Edit/Write/Bash/Grep/Glob only), as the spec anticipated. Documented as a manual follow-up in `AUTOMATION.md`.

## Build/lint status
- `npm run lint`: pass, no output.
- `npm run build`: pass. Verified from a genuinely clean state (removed `src/generated/prisma` and `.next`, ran `npm install` — confirmed `postinstall` regenerated the Prisma client automatically — then `npm run build` succeeded), which is the actual scenario that was failing on Vercel.
- `scripts/health-check.mjs`: manually exercised all four exit-code paths (no URL → 2, reachable 2xx → 0, reachable non-2xx → 1, unreachable host → 1) against real URLs.
- `scripts/ship.sh`: manually exercised in a sandboxed throwaway git repo (not this repo's real history) covering: missing review.md, `REQUEST_CHANGES` verdict, repeated no-op runs, a real-change run (single commit, pushed), and a push-conflict-then-rebase-retry run. All matched spec'd behavior after the fix above.
