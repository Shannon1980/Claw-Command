# CI Runbook

## Workflows

### Security Hardening Gates
Runs on push to `main` and PRs to `main`.

Checks:
- required secrets are present
- startup security checks
- hardening tests (`npm run test:hardening`)

### PR Build Check
Runs on PRs to `main`.

Checks:
- install dependencies (`npm ci`)
- production build (`npm run build`)

## Required repository secrets

- `MC_API_KEY`
- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_TOKEN`

Set with:

```bash
gh secret set MC_API_KEY --repo Shannon1980/Claw-Command
gh secret set OPENCLAW_GATEWAY_URL --repo Shannon1980/Claw-Command
gh secret set OPENCLAW_GATEWAY_TOKEN --repo Shannon1980/Claw-Command
```

## Common failures and fixes

### Missing secret errors
Error includes lines like `Missing secret: MC_API_KEY`.

Fix: add missing repo secret in GitHub Actions settings or via `gh secret set`.

### Hardening tests cannot find files
If globbing fails in CI, ensure package script uses a shell-compatible pattern:

```json
"test:hardening": "tsx --test tests/hardening/*.test.ts"
```

### Build parse errors in PRs
Run locally before push:

```bash
npm ci
npm run build
```

## Triage commands

```bash
gh run list --repo Shannon1980/Claw-Command --limit 10
gh run view <run-id> --repo Shannon1980/Claw-Command --log-failed
gh run rerun <run-id> --repo Shannon1980/Claw-Command
```
