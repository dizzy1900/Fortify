# Security questionnaire

| Question                | Current answer                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Certifications          | None claimed; no SOC 2 or ISO audit completed                                                                                                                   |
| Tenant isolation        | Application predicates, relation guards, cross-tenant tests, generated PostgreSQL RLS policies, and a redacted staging proof gate; managed pass receipt pending |
| Authentication          | OIDC/PKCE/state/nonce boundary, opaque sessions, MFA-capable claims; live IdP/MFA pending                                                                       |
| Encryption              | TLS required by production origin; private storage/KMS configuration contracts; AES-256-GCM logical-backup envelope; live provider evidence pending             |
| Access control          | Least privilege roles, assignments, expiring grants, reasoned support access, immutable access logs                                                             |
| Secure development      | Review, formatting/lint/type/test/build, CodeQL, dependency/secret/container/claims gates                                                                       |
| Vulnerability reporting | Security contact and private intake must be configured by repository/deployment owner before launch                                                             |
| Incident response       | Documented in `INCIDENT_RESPONSE.md`; contact tree and exercise pending                                                                                         |
| Backups                 | Encrypted code path and exact-byte fixture restore validated; managed PITR and restore exercise pending                                                         |
| Data deletion           | Retention/legal-hold-aware lifecycle deletion; contractual schedule and deployed exercise pending                                                               |
| Subprocessors           | Categories and confirmation gate in `SUBPROCESSORS.md`; no vendor approval implied                                                                              |
| Penetration test        | Not completed                                                                                                                                                   |

Answers describe current repository evidence only and require a dated deployment evidence pack before customer reliance.
