# Falsification plan

Fortify should be stopped or materially changed if the following tests fail. Positive interview sentiment is not sufficient evidence.

| Hypothesis | Strong test | Falsifier |
|---|---|---|
| Brokers have frequent, costly evidence workflow pain | Time 10-30 real cases across one cycle | Median assembly/follow-up time is already low or cases are too rare |
| A structured packet is useful to underwriters | Give willing reviewers packets without live coaching | Reviewers refuse the format or reconstruct the case from raw files/email |
| Crosswalk and provenance improve trust | Blind comparison against current packet | No reduction in clarification or faster review; critical source ambiguity persists |
| Daily users will keep the case in Fortify | Observe weekly use and off-platform reconstruction | Users maintain a parallel spreadsheet/drive as the authoritative record |
| Prior-year reuse compounds value | Revalidate a later-cycle cohort | Reuse is negligible or validation costs equal starting over |
| Deterministic extraction is enough for the wedge | Measure corrections and missed fields | Material field error rate remains unacceptable after template tuning |
| The buyer pays for workflow alone | Ask for a signed paid pilot before premium outcomes | Buyer conditions payment on savings, renewal, or appeal success |
| Role-aware review reduces email loops | Compare clarification count and latency | Reviewers prefer email and structured review adds work |

## Safety falsifiers

Stop live use after any critical cross-tenant disclosure, destructive evidence loss, mutable audit history, unsupported compliance/risk claim, submission without human confirmation, wrong-file packet generation, or material notice deadline corruption.

## Decision rule

Proceed from design pilot to production only if at least two broker organizations pay for workflow independently of premium outcomes, underwriters actually use the packet, measured cycle time improves, no critical trust/safety issue occurs, and live users agree the retained record is preferable to their prior system.
