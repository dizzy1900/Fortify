# Local and container deployment

## Local demo

Copy `.env.example`, install with `npm ci`, run `npm run demo:reset`, then `npm run dev`. The database, evidence fixtures, and outputs remain local and ignored.

## Container demo

`docker compose up --build` builds the standalone Next.js server and mounts `./data`, `./storage`, and `./output`. The sandbox container health check calls `/api/health`. No cloud account or secret is required.

## Production boundary

The Docker image and protected `.github/workflows/release.yml` workflow are reproducibility and release-contract aids, not production-readiness claims. The workflow validates the target environment, applies migrations before releasing an immutable GHCR digest, and emits a receipt. A repository owner must configure protected `staging` and `production` environments, required reviewers, OIDC/cloud deployment authority, and the selected deployment step. No managed database or production deployment has been validated.

An operator must explicitly set:

```bash
FORTIFY_RUNTIME_MODE=production
DATABASE_URL=postgresql://...
FORTIFY_APP_ORIGIN=https://fortify.example.com
FORTIFY_OIDC_PROVIDER_KEY=brokerage-oidc
FORTIFY_OIDC_ISSUER=https://identity.example.com/
FORTIFY_OIDC_CLIENT_ID=...
FORTIFY_OIDC_CLIENT_SECRET=...
FORTIFY_RATE_LIMIT_HASH_KEY=...
FORTIFY_STORAGE_BUCKET=private-evidence-bucket
FORTIFY_STORAGE_REGION=us-west-2
FORTIFY_DOCUMENT_PROVIDER=local-selectable-text
# Optional: FORTIFY_STORAGE_ENDPOINT, FORTIFY_STORAGE_FORCE_PATH_STYLE,
# FORTIFY_STORAGE_KMS_KEY_ID
```

Apply migrations before application rollout:

```bash
npm run db:migrate:production
```

Use `/api/health` only for process liveness and `/api/ready` for release/readiness checks. In production, readiness fails closed unless the production environment contract is valid and PostgreSQL answers a probe. The application login must be `NOINHERIT` and non-owner. Run `npm run db:validate:managed-postgres` only against staging with the distinct migration/application credentials; customer data remains prohibited until its redacted TLS, role, enabled-policy, cross-tenant, same-backend commit/rollback reset, and cleanup receipt passes on the selected service.

Logical backup and isolated restore tooling is available through `npm run ops:backup` and `npm run ops:restore`. It uses an AES-256-GCM envelope, exact plaintext/ciphertext SHA-256 readback, and an external secret-manager reference. It is not a substitute for managed PITR, an independent backup account, retention policy, restore monitoring, or a timed staging restore exercise; follow `docs/OPERATIONS_RUNBOOK.md` and record evidence in `docs/BACKUP_RESTORE_REPORT.md`.

Run document processing outside the web request path with an explicitly scoped service account:

```bash
FORTIFY_WORKER_ORGANIZATION_ID=org-replace-me \
FORTIFY_WORKER_SUBJECT=document-worker \
FORTIFY_WORKER_ID=document-worker-1 \
npm run worker:documents:once
```

The checked-in `local-selectable-text` provider is deterministic and supports plain text and selectable PDFs. It is not OCR and does not provide native PDF region geometry. Any external OCR/document-intelligence adapter requires separate licensing/data rights, credentials, egress and retention review, redacted logs, and staging validation before selection.

The fictional seed is never automatic. A deliberate non-customer sandbox import into PostgreSQL is available only through:

```bash
npm run db:seed:production-sandbox
```

Production mode does not fall back to SQLite, the legacy `DemoState`, or local evidence paths. Demo workspace and mutation routes are unavailable. OIDC, opaque sessions, invitations, scoped service/external credentials, deny-by-default authorization, the private S3-compatible storage boundary, and durable document jobs are implemented locally, but the selected managed providers, private bucket policy, malware service, OCR/document-intelligence rights, managed worker, MFA policy, production secrets, rate limits, and redirect/CORS registration must be validated in staging.

`FORTIFY_LOCAL_IDENTITY_ENABLED=true` is a non-production development escape hatch only. The adapter rejects `NODE_ENV=production`; never configure it in staging or production.

The adapter requests server-side encryption and enforces tenant prefixes, exact metadata, short signed operations, quarantine, retention/legal-hold hooks, and backup readback. A production deployment still requires provider credentials, private bucket/CORS policy validation, a live malware scanner, lifecycle/object-lock configuration, monitored backup/restore exercises, monitoring, incident response, and legal/accessibility review.
