# Local and container deployment

## Local demo

Copy `.env.example`, install with `npm ci`, run `npm run demo:reset`, then `npm run dev`. The database, evidence fixtures, and outputs remain local and ignored.

## Container demo

`docker compose up --build` builds the standalone Next.js server and mounts `./data`, `./storage`, and `./output`. The container health check calls `/api/health`. No cloud account or secret is required.

## Production boundary

The Docker image is a reproducibility aid, not a production-readiness claim. A production deployment requires the gates in `SECURITY_AND_LIMITATIONS.md`, especially managed identity, tenant isolation, Postgres, encrypted S3-compatible storage, malware scanning, backups, retention, monitoring, and legal/accessibility review.
