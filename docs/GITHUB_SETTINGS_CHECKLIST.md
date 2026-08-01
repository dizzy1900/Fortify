# GitHub settings checklist

These controls require a repository owner or organization administrator. Do not claim them from workflow files alone.

## Default branch protection

- [ ] Confirm `main` is the default branch.
- [ ] Require pull requests before merge.
- [ ] Require at least one approving review; dismiss stale approvals after new commits.
- [ ] Require review from Code Owners after `CODEOWNERS` is introduced.
- [ ] Require conversation resolution before merge.
- [ ] Require the current CI checks after their exact GitHub check names are observed.
- [ ] Require branches to be up to date or enable a merge queue once CI stability is measured.
- [ ] Block force pushes and branch deletion.
- [ ] Restrict bypass to named emergency administrators and audit every use.

## Repository security

- [ ] Enable secret scanning and push protection.
- [ ] Enable Dependabot alerts and security updates.
- [ ] Enable private vulnerability reporting.
- [ ] Review GitHub Actions permissions; default to read-only contents and disallow unapproved actions.
- [ ] Require approval for workflows from first-time external contributors.
- [ ] Configure environments named `staging` and `production` with separate secrets and required reviewers before deployments exist.
- [ ] Configure OpenID Connect for cloud access instead of long-lived deployment credentials.
- [ ] Set retention appropriate for CI logs and artifacts; ensure logs contain no customer documents or PII.

## Merge and release policy

- [ ] Prefer squash merge until a documented release strategy says otherwise.
- [ ] Disable automatic deletion only if release branches require retention; otherwise delete merged feature branches.
- [ ] Require signed release tags once production releases begin.
- [ ] Protect production deployment tags and environments.
- [ ] Document emergency rollback and administrator contacts in the operations runbook.

## Readback evidence

After configuration, capture the date, actor, branch/ruleset URL, required checks, bypass list, environment protection, and screenshots or API readback in `docs/IMPLEMENTATION_STATUS.md`. Owner settings are not complete until read back from GitHub.
