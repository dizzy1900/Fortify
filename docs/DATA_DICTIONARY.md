# Data dictionary

All identifiers are application-generated text values suitable for UUID migration. Dates are ISO 8601 strings. Amounts are stored as integer cents. Demo records are explicitly fictional.

| Entity | Purpose | Critical fields and invariants |
|---|---|---|
| Organization | Broker, client, source, or carrier organization | kind, fictional flag |
| User | Human actor | organization, role, name, email |
| Role | Permission profile | broker, manager, underwriter |
| BrokerTeam | Brokerage workgroup | organization, name |
| Client | Insured client relationship | broker team, organization |
| Community | Association or portfolio record | county, address, coordinates, fictional flag |
| Parcel | Community land scope | label, local GeoJSON geometry |
| Building | Insured building scope | community, parcel, label, construction year |
| UnitSummary | Aggregated occupancy | unit count, building count, occupancy type |
| Carrier | Notice/outcome counterparty | fictional flag, notice format |
| Policy | Master policy record | community, carrier, number, renewal, entered premium |
| RenewalCase | Renewal or appeal work container | policy, owner, status, appeal deadline, evidence-readiness snapshot |
| Notice | Source notice | raw text, filename, receipt date, deterministic extractor, confirmation time |
| NoticeField | Extracted and confirmed fact | extracted value, confirmed value, confidence, human confirmer |
| Standard | Versioned reference source | publisher, version, effective date, URL, verify-current flag |
| Requirement | Selected request/reference summary | code, title, scope, non-exhaustive summary |
| RequirementVersion | Time-bounded requirement version | valid from, source URL, current flag |
| MitigationAction | Reported action register | case, status, completion, contractor; not independently certified |
| EvidenceItem | Immutable evidence version | source/MIME/size/hash/dates/scope/geolocation/parties/validity/confidence/review/supersession |
| EvidenceLink | Evidence-to-requirement/case link | scope match, case-specific carrier status |
| EvidenceReview | Human or carrier review | reviewer, status, note, timestamp |
| Task | Missing-evidence work | case, owner, due date, status, requirement |
| Submission | Versioned packet | case, purpose, status, human confirmer, timestamp, manifest hash |
| SubmissionItem | Exhibit membership | submission, evidence, exhibit label |
| CarrierResponse | Structured carrier feedback | submission, status, message, entered time |
| Outcome | Entered carrier outcome | disposition, classification change, discount, renewal, premium change, reason, fictional flag |
| MaintenanceEvent | Evidence refresh reminder | community, due date, recurrence, evidence, status |
| Comment | Case collaboration | case, author, body, timestamp |
| AuditEvent | Append-only case event | actor, action, detail, previous hash, event hash, timestamp |
| AppState | Deterministic demo snapshot | version, JSON state, update time; MVP repository implementation detail |

## Evidence readiness

`coverage`, `freshness`, `confidence`, `scopeMatch`, `contradictionResolution`, and `humanReview` are each 0-100. The weighted total is 30%, 15%, 15%, 15%, 15%, and 10% respectively. It is evidence/submission readiness only - never risk reduction, compliance, expected loss, eligibility, or predicted carrier behavior.
