#!/usr/bin/env bash
set -euo pipefail

OWNER="Shannon1980"
REPO="Claw-Command"
BRANCH="main"

# Require PR, 1 review, dismiss stale reviews, and required status checks
# Uses classic branch protection API for broad compatibility.
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts[]='hardening' \
  -f enforce_admins=true \
  -F required_pull_request_reviews.dismiss_stale_reviews=true \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -f restrictions= \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f block_creations=false \
  -f required_linear_history=true

echo "✅ Branch protection applied for ${OWNER}/${REPO}:${BRANCH}"
