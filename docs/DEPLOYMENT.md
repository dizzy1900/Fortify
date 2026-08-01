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
```

Apply migrations before application rollout:

```bash
npm run db:migrate:production
```

The fictional seed is never automatic. A deliberate non-customer sandbox import into PostgreSQL is available only through:

```bash
npm run db:seed:production-sandbox
```

Production mode does not fall back to SQLite or the legacy `DemoState`. Demo workspace and mutation routes are unavailable. A production deployment still requires managed identity/authorization, complete tenant attack coverage, encrypted S3-compatible storage, malware scanning, secrets, retention/legal hold, backups and restore, monitoring, incident response, and legal/accessibility review.
