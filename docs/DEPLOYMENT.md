# Local and container deployment

## Local demo

Copy `.env.example`, install with `npm ci`, run `npm run demo:reset`, then `npm run dev`. The database, evidence fixtures, and outputs remain local and ignored.

## Container demo

`docker compose up --build` builds the standalone Next.js server and mounts `./data`, `./storage`, and `./output`. The container health check calls `/api/health`. No cloud account or secret is required.

## Production boundary

The Docker image is a reproducibility aid, not a production-readiness claim. The production PostgreSQL data-plane adapter and migrations are implemented, but no managed database or production deployment has been validated.

An operator must explicitly set:

```bash
FORTIFY_RUNTIME_MODE=production
DATABASE_URL=postgresql://...
FORTIFY_APP_ORIGIN=https://fortify.example.com
FORTIFY_OIDC_PROVIDER_KEY=brokerage-oidc
FORTIFY_OIDC_ISSUER=https://identity.example.com/
FORTIFY_OIDC_CLIENT_ID=...
FORTIFY_OIDC_CLIENT_SECRET=...
FORTIFY_STORAGE_BUCKET=private-evidence-bucket
FORTIFY_STORAGE_REGION=us-west-2
# Optional: FORTIFY_STORAGE_ENDPOINT, FORTIFY_STORAGE_FORCE_PATH_STYLE,
# FORTIFY_STORAGE_KMS_KEY_ID
```

Apply migrations before application rollout:

```bash
npm run db:migrate:production
```

The fictional seed is never automatic. A deliberate non-customer sandbox import into PostgreSQL is available only through:

```bash
npm run db:seed:production-sandbox
```

Production mode does not fall back to SQLite, the legacy `DemoState`, or local evidence paths. Demo workspace and mutation routes are unavailable. OIDC, opaque sessions, invitations, scoped service/external credentials, deny-by-default authorization, and the private S3-compatible storage boundary are implemented locally, but the selected managed providers, private bucket policy, malware service, MFA policy, production secrets, rate limits, and redirect/CORS registration must be validated in staging.

`FORTIFY_LOCAL_IDENTITY_ENABLED=true` is a non-production development escape hatch only. The adapter rejects `NODE_ENV=production`; never configure it in staging or production.

The adapter requests server-side encryption and enforces tenant prefixes, exact metadata, short signed operations, quarantine, retention/legal-hold hooks, and backup readback. A production deployment still requires provider credentials, private bucket/CORS policy validation, a live malware scanner, lifecycle/object-lock configuration, monitored backup/restore exercises, monitoring, incident response, and legal/accessibility review.
