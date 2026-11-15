#!/usr/bin/env bash
# A failed workflow tells the Diwan: an urgent alert in the Diwan group's
# web topic and on the Desk (decisions.md, The site: no silent failures).
# Usage: alert-workflow.sh backup|migrate|deploy
# Needs CRON_SECRET (the site's own, in the production environment) and
# RUN_URL. Never fails the run itself: the run has already failed.
set -u
workflow="$1"
if [ -z "${CRON_SECRET:-}" ]; then
  echo "::error::The $workflow run failed and CRON_SECRET is not set in the production environment, so the Diwan was not told."
  exit 0
fi
jq -n --arg workflow "$workflow" --arg url "$RUN_URL" '{workflow: $workflow, run_url: $url}' |
  curl -sS --fail --max-time 20 -X POST "${SITE_URL:-https://auibsal.org}/api/hooks/workflow" \
    -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d @- ||
  echo "::error::The $workflow run failed and the site could not be told."
exit 0
