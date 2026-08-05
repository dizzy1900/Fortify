# Threat model

## Assets and trust boundaries

Assets include customer identities, portfolio and property records, policies/notices, original evidence bytes, governed source copies, verifier records, model mappings, market correspondence, funding records, immutable decisions, and derived reports. Boundaries are browser-to-web, web-to-PostgreSQL, web/worker-to-private object storage, OIDC, outbound providers, inbound webhooks, external reviewer links, CI/container registry, and backup storage.

## Principal threats and controls

| Threat                     | Prevent/detect control                                                                                                 | Residual or launch gate                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Cross-tenant object access | deny-by-default authorization, tenant predicates, relation triggers, RLS policy pack, attack tests, staging proof gate | managed non-owner/RLS/pool receipt pending                 |
| Session theft or fixation  | opaque hashed sessions, atomic fixed-expiry rotation/revocation, secure host-only Strict cookie, OIDC state/nonce/PKCE | live IdP/MFA and session anomaly alerting pending          |
| CSRF/clickjacking/XSS      | exact-origin/fetch-metadata checks, Strict cookie, frame denial, nonce CSP, contextual React escaping                  | independent penetration test pending                       |
| Credential stuffing/DoS    | HMAC PostgreSQL rate buckets, bounded pools/timeouts, provider retry limits                                            | edge/WAF policy and load test pending                      |
| Malicious file or path     | private keys, path assertions, quarantine, MIME/hash/size checks, scan state                                           | live scanner and decompression-bomb test pending           |
| Forged webhook/replay      | HMAC timestamp/signature, endpoint scope, external event id and immutable custody                                      | each live sender contract pending                          |
| Log/backup disclosure      | recursive redaction, keyed pseudonyms, AES-256-GCM backup envelope, external key reference                             | live KMS rotation and provider encryption evidence pending |
| Insider/support abuse      | least privilege, explicit support grant/reason/expiry, immutable data-access logs                                      | alert routing and access review pending                    |
| Evidence tampering         | append-only guards, exact hashes, immutable versions/receipts, independent readback                                    | managed storage retention policy pending                   |
| Supply-chain compromise    | lockfile, audit, CodeQL, secret scan, image scan, pinned action majors                                                 | SBOM signing and provenance attestation pending            |

Risk review is required after authentication, storage, provider, tenancy, or deployment topology changes and after any incident.
