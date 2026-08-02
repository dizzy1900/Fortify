# Backup and restore report

## Local measured evidence — August 2, 2026

The M12 unit gate encrypted deterministic logical-backup fixture bytes with AES-256-GCM, stored plaintext and ciphertext SHA-256 digests plus IV/authentication tag and an external key reference, restored exact bytes, and rejected a modified authentication tag. The existing object-storage test also copies exact clean objects into an immutable manifest and verifies byte length and hash on readback.

The PostgreSQL migration suite restores all migrations into a fresh in-process PostgreSQL-compatible database and verifies the normalized schema and guards. This is local code-path evidence, not a managed database disaster-recovery exercise.

## Required deployed schedule

- Managed PostgreSQL PITR: continuous WAL with at least 35 days retention, provider encryption, separate production permissions, and deletion protection.
- Nightly encrypted logical dump: private backup bucket, versioning/object lock where contracted, external KMS key, 35 daily and 12 monthly copies.
- Private object storage: versioning and immutable backup manifest; daily inventory/hash reconciliation.
- Monthly automated restore into an isolated fresh database; quarterly operator exercise including object sample, application readiness, tenant isolation, record counts, critical receipt/audit chain hashes, RPO/RTO, cleanup, and signed report.

## Open gate

No managed backup, PITR configuration, production key, bucket policy, or measured deployed RPO/RTO exists. Launch readiness remains blocked until a dated restore receipt records provider, backup id, source time, target, operator, duration, validated counts/hashes, tenant-isolation result, and destruction of the temporary target.
