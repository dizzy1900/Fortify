# Operations runbook

## Release

1. Confirm branch, remote, reviewed diff, exact commit, and changelog.
2. Run `npm ci`, `npm run verify`, `npm audit --audit-level=moderate`, and `docker build`.
3. Refresh the PR base and require a clean `git merge-tree --write-tree` result.
4. Deploy the immutable image digest to staging. Validate distinct `DATABASE_URL` migration/backup and `FORTIFY_APP_DATABASE_URL` runtime logins. Run migrations once with the owner-capable migration role; the runtime login must be a member of `fortify_app`, must not own tables, and must not have `BYPASSRLS`.
5. Exercise `/api/health`, `/api/ready`, sign-in, one tenant-safe read/write, an RLS read with no repository tenant predicate, context reset on a reused connection, object upload/readback, worker heartbeat, webhook verification, and the 33-step fixture evidence gate.
6. Record image digest, migration version, operator, timestamps, checks, rollback image, and backup receipt. Promote the same digest through the protected production environment only after approval.

Rollback changes the application image to the recorded prior digest. Database migrations are forward-only; use a tested compensating migration and restore only under incident command. Never erase audit history.

Provision the runtime login outside the repository and grant it membership in the migration-created `fortify_app` role. Record `rolsuper = false`, `rolcreaterole = false`, `rolcreatedb = false`, `rolbypassrls = false`, table ownership by the migration role, and a successful `SET LOCAL ROLE fortify_app` probe. Never place either connection string in source, logs, or release receipts.

## Monitoring

Alert on readiness failure, authentication/rate-limit spikes, repeated 5xx, pool exhaustion, queue age, dead letters, provider health degradation, failed malware scans, backup failure, restore-test age, webhook verification failure, and storage integrity mismatch. Logs must contain request id, safe event code, component, duration, and keyed pseudonyms only.

## Retention and deletion

Legal hold wins over deletion. Validate retention source and dependencies, mark eligible records pending deletion, require human approval, delete mutable objects through the storage adapter, append the receipt, and leave immutable records with an explicit deleted/unavailable reference state. Confirm future analytics exclusion and backup expiry.

## SLO starting targets

Readiness is checked every 30 seconds. Page/API availability target is 99.9% during pilot hours; p95 interactive API target is 1.5 seconds excluding documented provider waits; critical job age target is under 15 minutes. These are operating targets, not measured production performance.
