# Launch readiness

Measured August 2, 2026.

| Layer                    | Status                                              | Evidence or blocker                                                                                                                                                          |
| ------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code                     | Code complete for M0–M12 local contracts            | production architecture, runtime security, CI/release contracts, RLS policy pack, encrypted backup primitive, required operator documents                                    |
| Local validation         | In progress until final M12 release run is recorded | full verification, image build, accessibility/visual checks, artifacts, migration/RLS, and 33-step aggregate fixture map must pass on final commit                           |
| Deployment               | Not validated                                       | no selected managed stack, non-owner RLS role, live OIDC/MFA, KMS/private buckets/scanner, secrets, monitoring, staging receipt, production digest, PITR, or restore receipt |
| Customer                 | Externally blocked                                  | no brokerage onboarding, rights-cleared California portfolio, ten production cases, acceptance, or paid continuation                                                         |
| Programme/verifier/model | Externally blocked                                  | no real sponsor rule/decision, authorized independent verifier, rights-cleared model-provider semantics, or live adapter acceptance                                          |
| Market/insurance         | Externally blocked                                  | no authorized insurer/MGA review, commitment, evidence acceptance, rating/underwriting/placement response, or insurance outcome                                              |

## Go/no-go gates

No-go until all required CI checks pass; image and migration digests are recorded; staging security and tenant attacks pass; backup/PITR and a fresh-target restore are measured; alerting/on-call/security contacts are live; owner-controlled GitHub settings are confirmed; data/source/subprocessor contracts are approved; and the paid pilot runbook has named owners. Production launch does not establish customer, programme, verifier, model, or market validation.
