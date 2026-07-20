#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REVIEW_FILE=".pipeline/review.md"
CHANGES_FILE=".pipeline/changes.md"
SHIP_LOG=".pipeline/ship-log.md"

if [ ! -f "$REVIEW_FILE" ]; then
  echo "ship: .pipeline/review.md not found — run reviewer first" >&2
  exit 1
fi

if ! awk '/^## Verdict$/{getline; if ($0 == "APPROVE") found=1} END{exit !found}' "$REVIEW_FILE"; then
  echo "ship: latest review verdict is not APPROVE — aborting" >&2
  exit 1
fi

mkdir -p .pipeline
if [ ! -f "$SHIP_LOG" ]; then
  echo "# Ship log" > "$SHIP_LOG"
fi

# The log file itself is excluded from this check so ship.sh's own past log
# entries never make a no-op run look "dirty" (that would otherwise create an
# empty-ish commit on every single invocation, forever).
SHIPPED_CHANGE=0
if [ -n "$(git status --porcelain -- . ':!.pipeline/ship-log.md')" ]; then
  SHIPPED_CHANGE=1
fi

if [ "$SHIPPED_CHANGE" -eq 0 ]; then
  echo "ship: no pending changes — nothing to commit"
else
  git add -A

  if [ -f "$CHANGES_FILE" ]; then
    COMMIT_MSG="$(grep -m 1 -A 1 '^## Files changed$' "$CHANGES_FILE" | tail -n 1 | sed 's/^- *//')"
  fi
  if [ -z "${COMMIT_MSG:-}" ]; then
    COMMIT_MSG="Automated ship: apply reviewed changes"
  fi

  git commit -m "$COMMIT_MSG"
fi

DEPLOY_STATUS="skipped"
if [ -n "${DEPLOY_HOOK_URL:-}" ]; then
  if curl -fsS -X POST "$DEPLOY_HOOK_URL" > /dev/null; then
    echo "ship: redeploy triggered"
    DEPLOY_STATUS="triggered"
  else
    echo "ship: redeploy hook call failed (see above), but code was already pushed to main" >&2
    DEPLOY_STATUS="failed"
  fi
else
  echo "ship: DEPLOY_HOOK_URL not set — skipping redeploy (see README/AUTOMATION.md to configure)"
fi

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
SHORT_SHA="$(git rev-parse --short HEAD)"
echo "- ${TIMESTAMP} | commit ${SHORT_SHA} | deploy: ${DEPLOY_STATUS}" >> "$SHIP_LOG"

if [ "$SHIPPED_CHANGE" -eq 1 ]; then
  # Fold the log line into the commit we just made, instead of leaving it as
  # a second, separate commit (or an ever-growing uncommitted local diff).
  git add "$SHIP_LOG"
  git commit --amend --no-edit
fi

if [ "$SHIPPED_CHANGE" -eq 1 ]; then
  if ! git push origin main; then
    echo "ship: push failed, retrying once after rebase..." >&2
    git pull --rebase origin main
    if ! git push origin main; then
      echo "ship: push failed after one rebase retry — stopping, do not force-push" >&2
      exit 1
    fi
  fi
fi
