#!/usr/bin/env bash
# Deploys main to production through the Deploy Hook, once the migrations
# are applied (.github/workflows/migrate.yml), and waits for that build.
#
# With VERCEL_TOKEN set, it follows the newest production build of this
# commit made after the hook fired. A build that ends CANCELED or ERROR
# (November 15, 2026: #273's hook build was canceled mid-build while a
# second build of the same commit ran) is fired once more; if that one
# also fails to go READY, the run fails, so a site left behind its schema
# never goes unnoticed. Without the token it only fires the hook.
set -euo pipefail

: "${VERCEL_DEPLOY_HOOK:?}"
: "${SHA:?}"

fire() {
  curl -fsS --retry 3 -X POST "$VERCEL_DEPLOY_HOOK" > /dev/null
}

if [ -z "${VERCEL_TOKEN:-}" ]; then
  fire
  echo "::warning::VERCEL_TOKEN is not set: the hook fired, but its build isn't followed."
  exit 0
fi

api="https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT}&teamId=${VERCEL_TEAM}&target=production&limit=10"

# The state of the newest production build of $SHA created after $1 (ms).
state_since() {
  curl -fsS --retry 3 -H "Authorization: Bearer ${VERCEL_TOKEN}" "$api" |
    jq -r --arg sha "$SHA" --argjson since "$1" '
      [.deployments[] | select(.meta.githubCommitSha == $sha and .created >= $since)]
      | sort_by(.created) | last | (.state // .readyState // "NONE")'
}

attempt() {
  local since state
  since=$(( $(date +%s) * 1000 - 5000 ))
  fire
  for _ in $(seq 1 60); do
    sleep 15
    state=$(state_since "$since")
    echo "Production build of ${SHA:0:7}: ${state}"
    case "$state" in
      READY) return 0 ;;
      CANCELED | ERROR) return 1 ;;
    esac
  done
  return 1
}

attempt && exit 0
echo "::warning::The production build didn't go live; firing the hook once more."
attempt && exit 0
echo "::error::Production did not go live for ${SHA}. Redeploy it from Vercel."
exit 1
