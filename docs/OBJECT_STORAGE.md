# Secure object storage

Fortify production evidence uses a private S3-compatible adapter. The deterministic in-memory adapter exists only for contract tests; the existing local filesystem adapter remains confined to the fictional sandbox.

## Lifecycle

1. An authorized tenant principal declares filename, MIME type, byte length, SHA-256, and optional retention date.
2. Fortify normalizes the filename, allocates a key under `tenants/{organization_id}/quarantine/`, stores a one-use upload grant, and returns a signed PUT valid for at most 15 minutes.
3. Finalization rejects missing objects or any mismatch in size, MIME type, SHA-256, or server-side encryption metadata. Accepted bytes remain quarantined.
4. A scanner reads the exact bytes. Size/checksum and basic content signatures are rechecked before malware scanning. Clean bytes are copied to `tenants/{organization_id}/objects/`; infected, scanner-error, and MIME-spoofed bytes fail closed as rejected.
5. Only a clean object can create an immutable evidence version or a download grant.

Scanner results and backup-manifest items are append-only. Evidence versions retain the exact storage key, checksum, MIME type, byte length, source, scope, and review state. Missing or rejected evidence is never treated as satisfied.

## Signed access and revocation

Downloads use two steps: an authenticated principal receives a purpose-labelled, one-use, expiring database grant, then redeems it for a signed GET valid for no more than 60 seconds. Revocation or expiry prevents redemption. A signed URL already minted by the object provider cannot be recalled; its residual authority is bounded by the short URL lifetime. Application grants, signed-operation issuance, redemption, rejection, backup, and deletion are audited.

## Retention, deletion, and backup

An active legal hold or future retention date blocks deletion. Otherwise deletion first records `pending_deletion`, removes the private object, then records the terminal deleted state and reason. Provider failure leaves the record pending for safe retry rather than claiming deletion.

A fixture backup copies each clean object under a tenant-scoped backup prefix and independently reads it back. Size and SHA-256 must match before an immutable manifest item is accepted. Restore reads are independently checked against the manifest. This proves the adapter contract locally; it is not a managed-provider backup, versioning, object-lock, disaster-recovery, or point-in-time-recovery exercise.

## Production configuration

Required:

```bash
FORTIFY_STORAGE_BUCKET=private-evidence-bucket
FORTIFY_STORAGE_REGION=us-west-2
```

Optional S3-compatible settings:

```bash
FORTIFY_STORAGE_ENDPOINT=https://object-provider.example.com
FORTIFY_STORAGE_FORCE_PATH_STYLE=true
FORTIFY_STORAGE_KMS_KEY_ID=alias/fortify-evidence
```

Without a KMS key, the adapter requests `AES256` server-side encryption. With a key, it requests `aws:kms` and the explicit key ID. Credentials come from the AWS SDK default credential chain; no access key belongs in repository configuration.

Before customer data is allowed, staging must validate the selected private bucket policy, CORS restricted to the application origin, provider checksum behavior, encryption keys and rotation, credential scope, malware provider, retention/object-lock behavior, lifecycle rules, backup destination, monitored restore drill, and redacted logging.
