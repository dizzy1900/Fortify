import { createHash } from "node:crypto";
import type {
  AuditRecord,
  CommunityRecord,
  DemoState,
  EvidenceRecord,
  RequirementRecord,
} from "./domain";
import { extractNoticeFields } from "./extraction";

const DEMO_DATE = "2026-08-01";
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const audit = (
  id: string,
  caseId: string | undefined,
  actor: string,
  action: string,
  detail: string,
  at: string,
  previous?: AuditRecord,
): AuditRecord => ({
  id,
  caseId,
  actor,
  action,
  detail,
  at,
  previousHash: previous?.hash,
  hash: sha(
    `${previous?.hash ?? "GENESIS"}|${id}|${caseId}|${actor}|${action}|${detail}|${at}`,
  ),
});

const communitySeed: CommunityRecord[] = [
  {
    id: "com-boulder",
    name: "Fictional Pine Creek Condominiums",
    county: "Boulder County",
    address: "1840 Demonstration Way, Boulder, CO",
    type: "Condominium association",
    units: 96,
    buildings: 12,
    coordinates: [-105.2705, 40.015],
    carrier: "Fictional Summit Mutual",
    carrierId: "car-summit",
    policyNumber: "DEMO-SM-0426",
    renewalDate: "2026-09-18",
    premium: 284600,
    caseId: "case-boulder",
    caseTitle: "2026 master policy renewal",
    caseStatus: "building",
    appealDeadline: "2026-08-22",
    noticeId: "notice-boulder",
    requirementIds: [],
    evidenceIds: [],
    summary:
      "Clarification needed on roof-edge and shared-scope documentation.",
    outcome: {
      disposition: "rejected",
      detail:
        "Fictional carrier rejected the first roof-edge exhibit because building scope was not identified; clarification is permitted.",
      renewalStatus: "Pending clarification - fictional",
      fictional: true,
      at: "2026-07-30T17:00:00Z",
    },
  },
  {
    id: "com-jefferson",
    name: "Fictional Red Rock Townhomes",
    county: "Jefferson County",
    address: "7300 Sample Ridge Road, Golden, CO",
    type: "Townhome association",
    units: 140,
    buildings: 28,
    coordinates: [-105.2211, 39.7555],
    carrier: "Fictional Front Range Indemnity",
    carrierId: "car-front-range",
    policyNumber: "DEMO-FRI-7814",
    renewalDate: "2026-08-29",
    premium: 431200,
    caseId: "case-jefferson",
    caseTitle: "Mitigation reconsideration",
    caseStatus: "needs-attention",
    appealDeadline: "2026-08-12",
    noticeId: "notice-jefferson",
    requirementIds: [],
    evidenceIds: [],
    summary:
      "Appeal deadline approaching; vegetation evidence is stale and invoice scope is incomplete.",
  },
  {
    id: "com-larimer",
    name: "Fictional Horsetooth Flats",
    county: "Larimer County",
    address: "5100 Prototype Drive, Fort Collins, CO",
    type: "Low-rise apartment portfolio",
    units: 184,
    buildings: 9,
    coordinates: [-105.0844, 40.5853],
    carrier: "Fictional Centennial Specialty",
    carrierId: "car-centennial",
    policyNumber: "DEMO-CS-1190",
    renewalDate: "2026-10-31",
    premium: 389000,
    caseId: "case-larimer",
    caseTitle: "Completed reconsideration",
    caseStatus: "resolved",
    appealDeadline: "2026-06-14",
    noticeId: "notice-larimer",
    requirementIds: [],
    evidenceIds: [],
    summary:
      "Completed mitigation package with a successful fictional reconsideration outcome.",
    outcome: {
      disposition: "changed",
      detail:
        "Fictional carrier accepted the clarified evidence and changed its internal classification.",
      discount: "Fictional package credit recorded",
      renewalStatus: "Renewed - fictional outcome",
      premiumChange: -12400,
      fictional: true,
      at: "2026-07-02T15:20:00Z",
    },
  },
];

const requirementTitles = [
  "Roof covering documentation",
  "Roof-edge assembly evidence",
  "Gutter and debris maintenance",
  "Exterior wall assembly",
  "Vent opening protection",
  "Deck and attachment condition",
  "Immediate building zone",
  "Intermediate vegetation zone",
  "Community access and addressing",
  "Water supply documentation",
  "Building-to-building separation",
  "Combustible storage controls",
  "Fence attachment detail",
  "Landscape maintenance cycle",
  "Tree canopy clearance",
  "Inspection scope statement",
  "Contractor invoice scope",
  "Photo geolocation and date",
  "Community mitigation plan",
  "Board attestation",
  "Appeal notice completeness",
  "Carrier request response",
  "Prior-year evidence validation",
  "Certificate validity",
  "Parcel scope mapping",
  "Contradiction disposition",
  "Human review completion",
  "Submission limitations attestation",
];

export function buildSeedState(): DemoState {
  const requirements: RequirementRecord[] = requirementTitles.map(
    (title, index) => ({
      id: `req-${String(index + 1).padStart(2, "0")}`,
      code:
        index < 10
          ? `IBHS-DEMO-${String(index + 1).padStart(2, "0")}`
          : index < 20
            ? `CARRIER-${String(index - 9).padStart(2, "0")}`
            : `CO-DEMO-${String(index - 19).padStart(2, "0")}`,
      title,
      scope:
        index % 5 === 0 ? "parcel" : index % 3 === 0 ? "building" : "community",
      source:
        index < 10
          ? "IBHS Wildfire Prepared Multifamily - selected demo summary"
          : index < 20
            ? "Fictional carrier request template"
            : "Colorado notice/appeal demo workflow",
      version:
        index < 10
          ? "December 2025 demo reference; June 9, 2026 update available"
          : index < 20
            ? "Demo 2026.1"
            : "HB25-1182 signed act / effective July 1, 2026",
      sourceUrl:
        index < 10
          ? "https://ibhs.org/ibhs-news-releases/ibhs-rounds-out-wildfire-prepared-program-with-neighborhood-and-multifamily-standards-updates-home-requirements/"
          : index < 20
            ? "about:blank#fictional-carrier"
            : "https://leg.colorado.gov/bills/hb25-1182",
      verifyCurrent: true,
      status: "missing",
      evidenceIds: [],
    }),
  );

  const evidence: EvidenceRecord[] = [];
  const communities = structuredClone(communitySeed);
  communities.forEach((community, communityIndex) => {
    const reqStart = communityIndex === 0 ? 0 : communityIndex === 1 ? 9 : 18;
    const reqCount = communityIndex === 0 ? 10 : 9;
    community.requirementIds = requirements
      .slice(reqStart, reqStart + reqCount)
      .map((item) => item.id);
    for (let index = 0; index < 14; index += 1) {
      const id = `ev-${communityIndex + 1}-${String(index + 1).padStart(2, "0")}`;
      const requirement = requirements[reqStart + (index % reqCount)];
      const kind = (
        [
          "photo",
          "invoice",
          "inspection",
          "certificate",
          "attestation",
        ] as const
      )[index % 5];
      const expired = communityIndex === 1 && index === 1;
      const conflict = communityIndex === 1 && (index === 2 || index === 3);
      const record: EvidenceRecord = {
        id,
        communityId: community.id,
        filename: `${id}-${kind}.${kind === "photo" ? "jpg" : "txt"}`,
        mimeType: kind === "photo" ? "image/jpeg" : "text/plain",
        sizeBytes: 1200 + index * 137,
        sha256: sha(`${id}|fixture|v1`),
        kind,
        sourceOrganization:
          index % 4 === 0
            ? "Fictional Alpine Mitigation LLC"
            : index % 4 === 1
              ? community.name
              : index % 4 === 2
                ? "Fictional County Fire Collaborative"
                : "Broker-collected",
        captureDate: expired
          ? "2024-04-12"
          : `2026-${String(3 + (index % 5)).padStart(2, "0")}-${String(10 + (index % 17)).padStart(2, "0")}`,
        uploadDate: `2026-07-${String(4 + index).padStart(2, "0")}`,
        expiryDate: expired
          ? "2025-04-12"
          : kind === "certificate"
            ? "2027-06-30"
            : undefined,
        scope: requirement.scope,
        scopeLabel:
          requirement.scope === "building"
            ? `Building ${1 + (index % community.buildings)}`
            : requirement.scope === "parcel"
              ? `Parcel ${1 + (index % 3)}`
              : "Entire community",
        submittedBy: index % 2 ? "Maya Chen, broker" : "Community manager",
        verifiedBy: index % 3 ? "Maya Chen" : undefined,
        confidence: communityIndex === 2 ? 0.96 : 0.76 + (index % 4) * 0.06,
        humanReviewed: communityIndex === 2 || index % 4 !== 0,
        carrierStatus:
          communityIndex === 2
            ? "accepted"
            : index % 7 === 0
              ? "contested"
              : "unsubmitted",
        requirementIds: [requirement.id],
        conflictWith: conflict
          ? `ev-2-${index === 2 ? "04" : "03"}`
          : undefined,
        reusedFromYear: communityIndex === 2 && index < 4 ? 2025 : undefined,
      };
      evidence.push(record);
      community.evidenceIds.push(id);
      requirement.evidenceIds.push(id);
    }
  });

  requirements.forEach((requirement) => {
    if (!requirement.evidenceIds.length) requirement.status = "missing";
    else if (
      requirement.evidenceIds.some(
        (id) => evidence.find((item) => item.id === id)?.conflictWith,
      )
    )
      requirement.status = "conflict";
    else if (
      requirement.evidenceIds.some(
        (id) =>
          evidence.find((item) => item.id === id)?.expiryDate &&
          evidence.find((item) => item.id === id)!.expiryDate! < DEMO_DATE,
      )
    )
      requirement.status = "partial";
    else
      requirement.status =
        requirement.evidenceIds.length > 1 ? "ready" : "partial";
  });
  for (const id of communities[2].requirementIds)
    requirements.find((item) => item.id === id)!.status = "ready";

  const rawNotices = [
    "Classification: Elevated review\nScore: Carrier-stated 61/100\nDrivers: roof-edge documentation and shared vegetation scope\nDiscounts: may be reviewed after evidence confirmation\nRequested evidence: dated roof-edge photos and contractor scope\nAppeal rights: written reconsideration available\nAppeal deadline: 2026-08-22",
    "Classification: Conditional renewal review\nScore: Carrier-stated class C\nDrivers: stale vegetation documentation and incomplete invoice scope\nDiscounts: none stated\nRequested evidence: current vegetation report and itemized invoice\nAppeal rights: written appeal available\nAppeal deadline: 2026-08-12",
    "Classification: Reconsidered\nScore: Carrier-stated class changed from C to B\nDrivers: documentation package reviewed\nDiscounts: fictional package credit entered\nRequested evidence: complete\nAppeal rights: completed\nAppeal deadline: 2026-06-14",
  ];
  const notices = communities.map((community, index) => ({
    id: community.noticeId,
    caseId: community.caseId,
    filename: `${community.noticeId}-${index === 1 ? "letter.pdf" : "notice.txt"}`,
    format: index === 1 ? "text-based PDF" : "plain text",
    receivedDate: index === 2 ? "2026-05-15" : "2026-07-28",
    extractor: "Fortify deterministic notice parser v1",
    fields: extractNoticeFields(rawNotices[index]).map((field) =>
      index === 2 ? { ...field, confirmedByHuman: true } : field,
    ),
    confirmed: index === 2,
    rawText: rawNotices[index],
  }));

  let previous: AuditRecord | undefined;
  const auditRecords = [
    audit(
      "audit-001",
      "case-larimer",
      "Maya Chen",
      "Submission generated",
      "Packet v2 generated with 14 exhibits.",
      "2026-06-10T16:00:00Z",
      previous,
    ),
  ];
  previous = auditRecords[0];
  auditRecords.push(
    audit(
      "audit-002",
      "case-larimer",
      "Fictional Centennial reviewer",
      "Carrier outcome recorded",
      "Fictional classification changed; renewal recorded.",
      "2026-07-02T15:20:00Z",
      previous,
    ),
  );
  previous = auditRecords[1];
  auditRecords.push(
    audit(
      "audit-003",
      "case-boulder",
      "Maya Chen",
      "Notice received",
      "Deterministic extraction created seven fields pending confirmation.",
      "2026-07-28T09:12:00Z",
      previous,
    ),
  );
  previous = auditRecords[2];
  auditRecords.push(
    audit(
      "audit-004",
      "case-jefferson",
      "Maya Chen",
      "Contradiction detected",
      "Two invoice records disagree on completed scope.",
      "2026-07-30T17:05:00Z",
      previous,
    ),
  );

  return {
    seedVersion: "fortify-demo-2026.08.01-v1",
    demoDate: DEMO_DATE,
    currentRole: "broker",
    currentCaseId: "case-jefferson",
    guideStep: 0,
    guideActive: true,
    communities,
    requirements,
    evidence,
    tasks: [
      {
        id: "task-1",
        caseId: "case-jefferson",
        title: "Request current vegetation inspection",
        owner: "Jon Bell",
        dueDate: "2026-08-06",
        status: "open",
        requirementId: "req-14",
      },
      {
        id: "task-2",
        caseId: "case-boulder",
        title: "Confirm roof-edge photo scope",
        owner: "Maya Chen",
        dueDate: "2026-08-09",
        status: "open",
        requirementId: "req-02",
      },
      {
        id: "task-3",
        caseId: "case-larimer",
        title: "Archive carrier response",
        owner: "Priya Shah",
        dueDate: "2026-07-05",
        status: "done",
      },
    ],
    notices,
    submissions: communities.map((community, index) => ({
      id: `sub-${index + 1}`,
      caseId: community.caseId,
      version: index === 2 ? 2 : 1,
      status:
        index === 2 ? "submitted" : index === 0 ? "clarification" : "draft",
      purpose:
        index === 1
          ? "Reconsideration and renewal evidence"
          : "Renewal evidence clarification",
      clarification:
        index === 0
          ? "Identify each building shown in the roof-edge exhibits and provide capture dates."
          : undefined,
      createdAt: index === 2 ? "2026-06-10T16:00:00Z" : "2026-08-01T09:00:00Z",
      letter: `Dear ${community.carrier} review team,\n\nOn behalf of ${community.name}, please review the enclosed evidence for policy ${community.policyNumber}. The packet addresses the carrier-stated requests and identifies any unresolved caveats.\n\nFortify organizes submitted evidence and does not certify compliance, eligibility, or risk reduction. Carrier acceptance, renewal, and pricing changes are not guaranteed.\n\nSincerely,\nMaya Chen\nFictional Alpine Community Insurance`,
    })),
    mitigationActions: [
      {
        id: "action-1",
        caseId: "case-boulder",
        title: "Roof-edge exhibit indexing",
        status: "in-progress",
        sourceOrganization: "Community manager",
        evidenceIds: ["ev-1-01", "ev-1-02"],
      },
      {
        id: "action-2",
        caseId: "case-boulder",
        title: "Shared vegetation scope review",
        status: "planned",
        sourceOrganization: "Broker team",
        evidenceIds: [],
      },
      {
        id: "action-3",
        caseId: "case-jefferson",
        title: "Shared-parcel vegetation maintenance",
        status: "complete",
        completedAt: "2026-07-19",
        sourceOrganization: "Fictional Alpine Mitigation LLC",
        evidenceIds: ["ev-2-01", "ev-2-02"],
      },
      {
        id: "action-4",
        caseId: "case-jefferson",
        title: "Invoice building-scope reconciliation",
        status: "in-progress",
        sourceOrganization: "Broker team",
        evidenceIds: ["ev-2-03", "ev-2-04"],
      },
      {
        id: "action-5",
        caseId: "case-larimer",
        title: "Certificate validity recheck",
        status: "complete",
        completedAt: "2026-06-08",
        sourceOrganization: "Broker team",
        evidenceIds: ["ev-3-04", "ev-3-09"],
      },
      {
        id: "action-6",
        caseId: "case-larimer",
        title: "Community photo index refresh",
        status: "complete",
        completedAt: "2026-06-09",
        sourceOrganization: "Community manager",
        evidenceIds: ["ev-3-01", "ev-3-06", "ev-3-11"],
      },
    ],
    maintenance: [
      {
        id: "maint-1",
        communityId: "com-boulder",
        title: "Refresh roof-edge photo set",
        dueDate: "2027-05-15",
        status: "scheduled",
        recurrence: "Annual",
      },
      {
        id: "maint-2",
        communityId: "com-jefferson",
        title: "Vegetation inspection refresh",
        dueDate: "2026-08-06",
        status: "due",
        recurrence: "Annual",
      },
      {
        id: "maint-3",
        communityId: "com-larimer",
        title: "Validate reused certificates",
        dueDate: "2027-04-01",
        status: "scheduled",
        recurrence: "Before renewal",
      },
    ],
    audit: auditRecords,
  };
}
