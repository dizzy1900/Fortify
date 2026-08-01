export type DemoRole = "broker" | "manager" | "underwriter";
export type CaseStatus =
  | "needs-attention"
  | "building"
  | "under-review"
  | "resolved";
export type RequirementStatus = "ready" | "partial" | "missing" | "conflict";

export interface ReadinessBreakdown {
  coverage: number;
  freshness: number;
  confidence: number;
  scopeMatch: number;
  contradictionResolution: number;
  humanReview: number;
  total: number;
}

export interface RequirementRecord {
  id: string;
  code: string;
  title: string;
  scope: "community" | "building" | "parcel";
  source: string;
  version: string;
  sourceUrl: string;
  verifyCurrent: boolean;
  status: RequirementStatus;
  evidenceIds: string[];
}

export interface EvidenceRecord {
  id: string;
  communityId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  kind: "photo" | "invoice" | "inspection" | "certificate" | "attestation";
  sourceOrganization: string;
  captureDate: string;
  uploadDate: string;
  expiryDate?: string;
  scope: "community" | "building" | "parcel";
  scopeLabel: string;
  submittedBy: string;
  verifiedBy?: string;
  confidence: number;
  humanReviewed: boolean;
  carrierStatus: "unsubmitted" | "accepted" | "contested" | "rejected";
  requirementIds: string[];
  conflictWith?: string;
  supersedesId?: string;
  reusedFromYear?: number;
}

export interface TaskRecord {
  id: string;
  caseId: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "open" | "done";
  requirementId?: string;
}
export interface NoticeFieldRecord {
  key: string;
  label: string;
  extracted: string;
  confirmed: string;
  confidence: number;
  confirmedByHuman: boolean;
}
export interface NoticeRecord {
  id: string;
  caseId: string;
  filename: string;
  format: string;
  receivedDate: string;
  extractor: string;
  fields: NoticeFieldRecord[];
  confirmed: boolean;
  rawText: string;
}
export interface AuditRecord {
  id: string;
  caseId?: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
  previousHash?: string;
  hash: string;
}
export interface OutcomeRecord {
  disposition: "accepted" | "clarification" | "rejected" | "changed";
  detail: string;
  discount?: string;
  renewalStatus?: string;
  premiumChange?: number;
  fictional: true;
  at: string;
}

export interface CommunityRecord {
  id: string;
  name: string;
  county: string;
  address: string;
  type: string;
  units: number;
  buildings: number;
  coordinates: [number, number];
  carrier: string;
  carrierId: string;
  policyNumber: string;
  renewalDate: string;
  premium: number;
  caseId: string;
  caseTitle: string;
  caseStatus: CaseStatus;
  appealDeadline: string;
  noticeId: string;
  requirementIds: string[];
  evidenceIds: string[];
  outcome?: OutcomeRecord;
  summary: string;
}

export interface MaintenanceRecord {
  id: string;
  communityId: string;
  title: string;
  dueDate: string;
  status: "due" | "scheduled" | "complete";
  recurrence: string;
}
export interface MitigationActionRecord {
  id: string;
  caseId: string;
  title: string;
  status: "planned" | "in-progress" | "complete";
  completedAt?: string;
  sourceOrganization: string;
  evidenceIds: string[];
}
export interface SubmissionRecord {
  id: string;
  caseId: string;
  version: number;
  status: "draft" | "generated" | "submitted" | "clarification";
  purpose: string;
  createdAt: string;
  packetPath?: string;
  zipPath?: string;
  letter: string;
  clarification?: string;
  brokerResponse?: string;
  responseReadyAt?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface DemoState {
  seedVersion: string;
  demoDate: string;
  currentRole: DemoRole;
  currentCaseId: string;
  guideStep: number;
  guideActive: boolean;
  communities: CommunityRecord[];
  requirements: RequirementRecord[];
  evidence: EvidenceRecord[];
  tasks: TaskRecord[];
  notices: NoticeRecord[];
  submissions: SubmissionRecord[];
  mitigationActions: MitigationActionRecord[];
  maintenance: MaintenanceRecord[];
  audit: AuditRecord[];
}

export type DemoAction =
  | { type: "set-role"; role: DemoRole }
  | { type: "set-guide"; step: number; active: boolean }
  | {
      type: "replace-notice";
      noticeId: string;
      filename: string;
      format: string;
      rawText: string;
      fields: NoticeFieldRecord[];
    }
  | { type: "confirm-notice"; noticeId: string; fields: Record<string, string> }
  | { type: "add-evidence"; evidence: EvidenceRecord }
  | {
      type: "assign-task";
      caseId: string;
      title: string;
      owner: string;
      dueDate: string;
      requirementId?: string;
    }
  | { type: "toggle-task"; taskId: string }
  | { type: "resolve-conflict"; evidenceId: string }
  | { type: "update-letter"; submissionId: string; letter: string }
  | { type: "confirm-submission"; submissionId: string }
  | {
      type: "mark-generated";
      submissionId: string;
      packetPath: string;
      zipPath: string;
    }
  | { type: "request-clarification"; submissionId: string; detail: string }
  | { type: "respond-clarification"; submissionId: string; detail: string }
  | { type: "complete-maintenance"; maintenanceId: string }
  | {
      type: "record-outcome";
      caseId: string;
      disposition: OutcomeRecord["disposition"];
      detail: string;
      discount?: string;
      renewalStatus: string;
      premiumChange?: number;
    };
