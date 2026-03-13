# Branch Protection Setup (main)

This repo should require CI checks before merge.

## Recommended settings

- Protect branch: `main`
- Require a pull request before merging
- Require approvals: `1`
- Dismiss stale approvals on new commits
- Require status checks to pass before merging
  - Required check: `hardening` (from **Security Hardening Gates**)
- Require branches to be up to date before merging
- Restrict force pushes and deletions

## Apply via GitHub CLI

```bash
# run from any shell with gh auth
./scripts/apply-branch-protection.sh
```

If your org/repo policy differs, edit `scripts/apply-branch-protection.sh` and rerun.
