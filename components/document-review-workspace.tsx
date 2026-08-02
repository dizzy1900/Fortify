"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  History,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type RuntimeMode = "sandbox" | "production";
type SourceDocument = {
  id: string;
  caseId: string | null;
  storageObjectId: string | null;
  supersedesSourceDocumentId: string | null;
  versionNumber: number;
  documentType: string;
  filename: string;
  mimeType: string;
  sha256: string | null;
  processingStatus: string;
  classifierKey: string | null;
  classifierVersion: string | null;
  classificationConfidence: string | null;
  createdAt: string;
};
type ProcessingJob = {
  id: string;
  sourceDocumentId: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  availableAt: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
};
type Passage = {
  id: string;
  sourceDocumentId: string;
  extractionRunId: string | null;
  pageNumber: number | null;
  segment: string | null;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  } | null;
  passageKind: string;
  textContent: string;
  extractorVersion: string;
};
type Candidate = {
  id: string;
  sourceDocumentId: string;
  extractionRunId: string;
  sourcePassageId: string | null;
  fieldKey: string;
  fieldLabel: string;
  candidateOrdinal: number;
  value: string;
  valueType: string;
  confidence: string;
  modelDerived: boolean;
};
type FieldReview = {
  id: string;
  extractedFieldId: string;
  action: string;
  reviewedValue: string | null;
  reviewerSubject: string;
  note: string | null;
  reviewedAt: string;
};
type DocumentFact = {
  id: string;
  sourceDocumentId: string;
  extractedFieldId: string;
  sourcePassageId: string | null;
  factKey: string;
  value: string;
  versionNumber: number;
  supersedesFactId: string | null;
  confirmedBy: string;
  confirmedAt: string;
  correctionReason: string | null;
};
type Workspace = {
  pipelineVersion: string;
  provider: { key: string; version: string; modelDerived: boolean };
  cases: Array<{ id: string; title: string; status: string }>;
  cleanObjects: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    providerSupported: boolean;
    createdAt: string;
  }>;
  documents: SourceDocument[];
  jobs: ProcessingJob[];
  attempts: Array<{
    id: string;
    jobId: string;
    attemptNumber: number;
    status: string;
    providerKey: string | null;
    providerVersion: string | null;
    errorCode: string | null;
    startedAt: string;
  }>;
  runs: Array<{
    id: string;
    sourceDocumentId: string;
    providerKey: string;
    providerVersion: string;
    extractorKey: string;
    extractorVersion: string;
    modelDerived: boolean;
    pageCount: number;
    warnings: string[];
  }>;
  passages: Passage[];
  candidates: Candidate[];
  reviews: FieldReview[];
  facts: DocumentFact[];
};
type ReviewDraft = {
  action: "confirmed" | "corrected" | "rejected";
  value: string;
  note: string;
};

const fixtureDocumentId = "document-fixture-notice";
const fixtureWorkspace: Workspace = {
  pipelineVersion: "fortify-document-pipeline-v1",
  provider: {
    key: "fortify-deterministic-document-fixtures",
    version: "1.0.0",
    modelDerived: false,
  },
  cases: [
    { id: "case-fixture-red-rock", title: "Fictional Red Rock renewal", status: "open" },
  ],
  cleanObjects: [
    {
      id: "object-fixture-notice",
      filename: "fictional-carrier-notice.pdf",
      mimeType: "application/pdf",
      sizeBytes: 184220,
      sha256: "29f0f56f1a9839e211ed67df9e246e8b2e2f1a38f61d6ad29f9b6ca10ac99b11",
      providerSupported: true,
      createdAt: "2026-08-01T12:00:00.000Z",
    },
    {
      id: "object-fixture-scan",
      filename: "fictional-rotated-questionnaire.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 294102,
      sha256: "680ed28b92827d12a4f2685881510cd7db5b1e0a1c8e9e1ae9c9c08fa1a3f624",
      providerSupported: true,
      createdAt: "2026-08-01T12:02:00.000Z",
    },
  ],
  documents: [
    {
      id: fixtureDocumentId,
      caseId: "case-fixture-red-rock",
      storageObjectId: "object-fixture-notice",
      supersedesSourceDocumentId: null,
      versionNumber: 1,
      documentType: "carrier_notice",
      filename: "fictional-carrier-notice.pdf",
      mimeType: "application/pdf",
      sha256: "29f0f56f1a9839e211ed67df9e246e8b2e2f1a38f61d6ad29f9b6ca10ac99b11",
      processingStatus: "review_required",
      classifierKey: "fortify-deterministic-document-classifier",
      classifierVersion: "1.0.0",
      classificationConfidence: "0.9400",
      createdAt: "2026-08-01T12:00:00.000Z",
    },
  ],
  jobs: [
    {
      id: "job-fixture-succeeded",
      sourceDocumentId: fixtureDocumentId,
      status: "succeeded",
      attemptCount: 1,
      maxAttempts: 3,
      availableAt: "2026-08-01T12:00:00.000Z",
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: "2026-08-01T12:00:00.000Z",
    },
    {
      id: "job-fixture-dead-letter",
      sourceDocumentId: "document-fixture-failed",
      status: "dead_letter",
      attemptCount: 3,
      maxAttempts: 3,
      availableAt: "2026-08-01T12:06:00.000Z",
      lastErrorCode: "ocr_provider_timeout",
      lastErrorMessage: "Synthetic OCR fixture exhausted its retry policy.",
      createdAt: "2026-08-01T12:04:00.000Z",
    },
  ],
  attempts: [
    {
      id: "attempt-fixture",
      jobId: "job-fixture-succeeded",
      attemptNumber: 1,
      status: "succeeded",
      providerKey: "fortify-deterministic-document-fixtures",
      providerVersion: "1.0.0",
      errorCode: null,
      startedAt: "2026-08-01T12:00:02.000Z",
    },
  ],
  runs: [
    {
      id: "run-fixture",
      sourceDocumentId: fixtureDocumentId,
      providerKey: "fortify-deterministic-document-fixtures",
      providerVersion: "1.0.0",
      extractorKey: "fortify-correspondence-fields",
      extractorVersion: "1.0.0",
      modelDerived: false,
      pageCount: 2,
      warnings: [],
    },
  ],
  passages: [
    {
      id: "passage-policy",
      sourceDocumentId: fixtureDocumentId,
      extractionRunId: "run-fixture",
      pageNumber: 1,
      segment: "line-4",
      region: { x: 0.1, y: 0.22, width: 0.48, height: 0.04 },
      passageKind: "line",
      textContent: "Policy: FICTIONAL-COA-2048",
      extractorVersion: "fixture-provider@1.0.0",
    },
    {
      id: "passage-deadline",
      sourceDocumentId: fixtureDocumentId,
      extractionRunId: "run-fixture",
      pageNumber: 1,
      segment: "line-8",
      region: { x: 0.1, y: 0.44, width: 0.44, height: 0.04 },
      passageKind: "line",
      textContent: "Appeal deadline: 2026-08-21",
      extractorVersion: "fixture-provider@1.0.0",
    },
    {
      id: "passage-evidence",
      sourceDocumentId: fixtureDocumentId,
      extractionRunId: "run-fixture",
      pageNumber: 2,
      segment: "table-r3-c2",
      region: { x: 0.42, y: 0.28, width: 0.4, height: 0.05, rotation: 0 },
      passageKind: "table_cell",
      textContent: "Required evidence: building schedule [uncertain]",
      extractorVersion: "fixture-provider@1.0.0",
    },
  ],
  candidates: [
    {
      id: "candidate-policy",
      sourceDocumentId: fixtureDocumentId,
      extractionRunId: "run-fixture",
      sourcePassageId: "passage-policy",
      fieldKey: "policy",
      fieldLabel: "Policy",
      candidateOrdinal: 1,
      value: "FICTIONAL-COA-2048",
      valueType: "text",
      confidence: "0.9200",
      modelDerived: false,
    },
    {
      id: "candidate-deadline",
      sourceDocumentId: fixtureDocumentId,
      extractionRunId: "run-fixture",
      sourcePassageId: "passage-deadline",
      fieldKey: "deadline",
      fieldLabel: "Appeal deadline",
      candidateOrdinal: 1,
      value: "2026-08-21",
      valueType: "date",
      confidence: "0.9700",
      modelDerived: false,
    },
    {
      id: "candidate-evidence",
      sourceDocumentId: fixtureDocumentId,
      extractionRunId: "run-fixture",
      sourcePassageId: "passage-evidence",
      fieldKey: "requiredEvidence",
      fieldLabel: "Required evidence",
      candidateOrdinal: 1,
      value: "building schedule",
      valueType: "text",
      confidence: "0.4200",
      modelDerived: true,
    },
  ],
  reviews: [],
  facts: [],
};

async function responseJson<T>(input: Response | Promise<Response>): Promise<T> {
  const response = await input;
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  return payload;
}

function statusClass(status: string) {
  return `document-status document-status-${status.replaceAll("_", "-")}`;
}

function shortHash(value: string | null) {
  return value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "Unavailable";
}

function formatRegion(region: Passage["region"]) {
  if (!region) return "Region geometry unavailable from this provider";
  const values = [region.x, region.y, region.width, region.height].map((value) =>
    value.toFixed(2),
  );
  return `x ${values[0]} · y ${values[1]} · w ${values[2]} · h ${values[3]}${region.rotation ? ` · ${region.rotation}° rotation` : ""}`;
}

export function DocumentReviewWorkspace({ mode }: { mode: RuntimeMode }) {
  const sandbox = mode === "sandbox";
  const [workspace, setWorkspace] = useState<Workspace | null>(
    sandbox ? fixtureWorkspace : null,
  );
  const [role, setRole] = useState<string | null>(sandbox ? "broker" : null);
  const [loading, setLoading] = useState(!sandbox);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [caseId, setCaseId] = useState(
    sandbox ? fixtureWorkspace.cases[0].id : "",
  );
  const [storageObjectId, setStorageObjectId] = useState(
    sandbox ? fixtureWorkspace.cleanObjects[0].id : "",
  );
  const [supersedesDocumentId, setSupersedesDocumentId] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState(
    sandbox ? fixtureDocumentId : "",
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    sandbox ? "candidate-policy" : "",
  );
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>(
    {},
  );
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [candidatePage, setCandidatePage] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileMimeType, setFileMimeType] = useState("");
  const [fileHash, setFileHash] = useState("");

  const loadWorkspace = async () => {
    if (sandbox) return;
    setLoading(true);
    setError(null);
    try {
      const [nextWorkspace, session] = await Promise.all([
        responseJson<Workspace>(
          fetch("/api/production/documents/workspace", { cache: "no-store" }),
        ),
        responseJson<{ role: string | null }>(
          fetch("/api/auth/session", { cache: "no-store" }),
        ),
      ]);
      setWorkspace(nextWorkspace);
      setRole(session.role);
      setCaseId((current) => current || nextWorkspace.cases[0]?.id || "");
      setStorageObjectId(
        (current) =>
          current ||
          nextWorkspace.cleanObjects.find((object) => object.providerSupported)?.id ||
          nextWorkspace.cleanObjects[0]?.id ||
          "",
      );
      setSelectedDocumentId(
        (current) =>
          (nextWorkspace.documents.some((document) => document.id === current)
            ? current
            : nextWorkspace.documents[0]?.id) || "",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Document workspace failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sandbox) return;
    let cancelled = false;
    void Promise.all([
      responseJson<Workspace>(
        fetch("/api/production/documents/workspace", { cache: "no-store" }),
      ),
      responseJson<{ role: string | null }>(
        fetch("/api/auth/session", { cache: "no-store" }),
      ),
    ])
      .then(([nextWorkspace, session]) => {
        if (cancelled) return;
        setWorkspace(nextWorkspace);
        setRole(session.role);
        setCaseId(nextWorkspace.cases[0]?.id || "");
        setStorageObjectId(
          nextWorkspace.cleanObjects.find((object) => object.providerSupported)?.id ||
            nextWorkspace.cleanObjects[0]?.id ||
            "",
        );
        setSelectedDocumentId(nextWorkspace.documents[0]?.id || "");
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Document workspace failed to load.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sandbox]);

  const documentById = useMemo(
    () => new Map(workspace?.documents.map((document) => [document.id, document])),
    [workspace?.documents],
  );
  const passageById = useMemo(
    () => new Map(workspace?.passages.map((passage) => [passage.id, passage])),
    [workspace?.passages],
  );
  const reviewsByField = useMemo(() => {
    const map = new Map<string, FieldReview[]>();
    for (const review of workspace?.reviews ?? []) {
      const list = map.get(review.extractedFieldId) ?? [];
      list.push(review);
      map.set(review.extractedFieldId, list);
    }
    return map;
  }, [workspace?.reviews]);
  const selectedObject = workspace?.cleanObjects.find(
    (object) => object.id === storageObjectId,
  );
  const selectedDocument = documentById.get(selectedDocumentId);
  const documentCandidates = useMemo(
    () =>
      (workspace?.candidates ?? []).filter(
        (candidate) => candidate.sourceDocumentId === selectedDocumentId,
      ),
    [selectedDocumentId, workspace?.candidates],
  );
  const filteredCandidates = useMemo(
    () =>
      documentCandidates.filter((candidate) => {
        const reviewed = (reviewsByField.get(candidate.id)?.length ?? 0) > 0;
        if (candidateFilter === "unreviewed") return !reviewed;
        if (candidateFilter === "reviewed") return reviewed;
        if (candidateFilter === "low_confidence")
          return Number(candidate.confidence) < 0.7;
        return true;
      }),
    [candidateFilter, documentCandidates, reviewsByField],
  );
  const candidatesPerPage = 25;
  const candidatePageCount = Math.max(
    1,
    Math.ceil(filteredCandidates.length / candidatesPerPage),
  );
  const visibleCandidates = filteredCandidates.slice(
    (candidatePage - 1) * candidatesPerPage,
    candidatePage * candidatesPerPage,
  );
  const effectiveSelectedCandidateId = documentCandidates.some(
    (candidate) => candidate.id === selectedCandidateId,
  )
    ? selectedCandidateId
    : documentCandidates[0]?.id || "";
  const selectedCandidate = workspace?.candidates.find(
    (candidate) => candidate.id === effectiveSelectedCandidateId,
  );
  const selectedPassage = selectedCandidate?.sourcePassageId
    ? passageById.get(selectedCandidate.sourcePassageId)
    : undefined;
  const candidateReviews = selectedCandidate
    ? reviewsByField.get(selectedCandidate.id) ?? []
    : [];
  const factHistory = (workspace?.facts ?? [])
    .filter(
      (fact) =>
        fact.sourceDocumentId === selectedCandidate?.sourceDocumentId &&
        fact.factKey === selectedCandidate?.fieldKey,
    )
    .toSorted((left, right) => left.versionNumber - right.versionNumber);
  const canReview =
    sandbox ||
    [
      "organization_owner",
      "brokerage_administrator",
      "practice_leader",
      "broker",
      "marketer",
      "assistant",
    ].includes(role ?? "");
  const reviewDraft: ReviewDraft = selectedCandidate
    ? reviewDrafts[selectedCandidate.id] ?? {
        action: "confirmed",
        value: selectedCandidate.value,
        note: "",
      }
    : { action: "confirmed", value: "", note: "" };
  const reviewAction = reviewDraft.action;
  const reviewedValue = reviewDraft.value;
  const reviewNote = reviewDraft.note;
  const updateReviewDraft = (update: Partial<ReviewDraft>) => {
    if (!selectedCandidate) return;
    setReviewDrafts((current) => ({
      ...current,
      [selectedCandidate.id]: { ...reviewDraft, ...update },
    }));
  };

  const chooseFile = async (nextFile: File | null) => {
    setFile(nextFile);
    setFileHash("");
    setFileMimeType("");
    setNotice(null);
    if (!nextFile) return;
    const lower = nextFile.name.toLowerCase();
    const mimeType =
      nextFile.type ||
      (lower.endsWith(".pdf")
        ? "application/pdf"
        : lower.endsWith(".png")
          ? "image/png"
          : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
            ? "image/jpeg"
            : lower.endsWith(".txt")
              ? "text/plain"
              : "");
    if (
      !["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(
        mimeType,
      )
    ) {
      setError("Choose a PDF, PNG, JPEG, or plain-text document.");
      return;
    }
    setError(null);
    setFileMimeType(mimeType);
    const digest = await crypto.subtle.digest("SHA-256", await nextFile.arrayBuffer());
    setFileHash(
      [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
    );
  };

  const uploadFile = async () => {
    if (!file || !fileHash || !fileMimeType) return;
    if (sandbox) {
      setNotice(
        "Synthetic walkthrough: bytes were hashed in this browser but were not uploaded or persisted.",
      );
      return;
    }
    setPending("upload");
    setError(null);
    try {
      const upload = await responseJson<{
        storageObjectId: string;
        grantId: string;
        url: string;
        requiredHeaders: Record<string, string>;
      }>(
        fetch("/api/production/storage/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: fileMimeType,
            sizeBytes: file.size,
            sha256: fileHash,
          }),
        }),
      );
      const put = await fetch(upload.url, {
        method: "PUT",
        headers: upload.requiredHeaders,
        body: file,
      });
      if (!put.ok) throw new Error("Private object upload failed.");
      await responseJson(
        fetch(`/api/production/storage/uploads/${upload.storageObjectId}/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grantId: upload.grantId }),
        }),
      );
      setStorageObjectId(upload.storageObjectId);
      setNotice(
        "Upload finalized in quarantine. Intake stays locked until the configured malware scanner marks the object clean.",
      );
      await loadWorkspace();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed closed.");
    } finally {
      setPending(null);
    }
  };

  const queueIntake = async () => {
    if (!selectedObject?.providerSupported || !caseId) return;
    setPending("intake");
    setError(null);
    try {
      if (sandbox) {
        const fixtureSequence = (workspace?.documents.length ?? 0) + 1;
        const documentId = `document-fixture-queued-${fixtureSequence}`;
        const jobId = `job-fixture-queued-${fixtureSequence}`;
        setWorkspace((current) =>
          current
            ? {
                ...current,
                documents: [
                  {
                    id: documentId,
                    caseId,
                    storageObjectId,
                    supersedesSourceDocumentId: supersedesDocumentId || null,
                    versionNumber: supersedesDocumentId ? 2 : 1,
                    documentType: "unclassified",
                    filename: selectedObject.filename,
                    mimeType: selectedObject.mimeType,
                    sha256: selectedObject.sha256,
                    processingStatus: "queued",
                    classifierKey: null,
                    classifierVersion: null,
                    classificationConfidence: null,
                    createdAt: "2026-08-01T12:10:00.000Z",
                  },
                  ...current.documents,
                ],
                jobs: [
                  {
                    id: jobId,
                    sourceDocumentId: documentId,
                    status: "queued",
                    attemptCount: 0,
                    maxAttempts: 3,
                    availableAt: "2026-08-01T12:10:00.000Z",
                    lastErrorCode: null,
                    lastErrorMessage: null,
                    createdAt: "2026-08-01T12:10:00.000Z",
                  },
                  ...current.jobs,
                ],
              }
            : current,
        );
        setSelectedDocumentId(documentId);
        setNotice(
          "Synthetic job queued. No customer bytes, storage, database, or external OCR provider were used.",
        );
      } else {
        const queued = await responseJson<{
          sourceDocumentId: string;
          jobId: string;
          duplicate: boolean;
        }>(
          fetch("/api/production/documents/intake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storageObjectId,
              caseId,
              sourceSystem: "direct_upload",
              supersedesSourceDocumentId: supersedesDocumentId || undefined,
              idempotencyKey: crypto.randomUUID(),
            }),
          }),
        );
        setSelectedDocumentId(queued.sourceDocumentId);
        setNotice(
          queued.duplicate
            ? "The exact document was already registered; its existing durable job was returned."
            : "Document queued. A separately scoped worker will process it asynchronously.",
        );
        await loadWorkspace();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Intake failed closed.");
    } finally {
      setPending(null);
    }
  };

  const retryJob = async (job: ProcessingJob) => {
    setPending(`retry-${job.id}`);
    setError(null);
    try {
      if (sandbox) {
        setWorkspace((current) =>
          current
            ? {
                ...current,
                jobs: current.jobs.map((candidate) =>
                  candidate.id === job.id
                    ? {
                        ...candidate,
                        status: "queued",
                        maxAttempts: candidate.maxAttempts + 1,
                      }
                    : candidate,
                ),
              }
            : current,
        );
      } else {
        await responseJson(
          fetch(`/api/production/documents/jobs/${job.id}/retry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: "Broker reviewed the failure and authorized one additional attempt.",
            }),
          }),
        );
        await loadWorkspace();
      }
      setNotice("Dead-letter retry recorded with one additional bounded attempt.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Retry failed closed.");
    } finally {
      setPending(null);
    }
  };

  const submitReview = async () => {
    if (!selectedCandidate || !canReview) return;
    setPending("review");
    setError(null);
    try {
      if (sandbox) {
        const reviewedAt = "2026-08-01T12:12:00.000Z";
        if (!workspace) throw new Error("Document workspace is unavailable.");
        const priorFacts = workspace.facts
          .filter(
            (fact) =>
              fact.sourceDocumentId === selectedCandidate.sourceDocumentId &&
              fact.factKey === selectedCandidate.fieldKey,
          )
          .toSorted((left, right) => right.versionNumber - left.versionNumber);
        const prior = priorFacts[0];
        const value =
          reviewAction === "confirmed"
            ? selectedCandidate.value
            : reviewAction === "corrected"
              ? reviewedValue.trim()
              : null;
        setWorkspace({
          ...workspace,
          reviews: [
            {
              id: `review-fixture-${workspace.reviews.length + 1}`,
              extractedFieldId: selectedCandidate.id,
              action: reviewAction,
              reviewedValue: value,
              reviewerSubject: "fictional-broker",
              note: reviewNote || null,
              reviewedAt,
            },
            ...workspace.reviews,
          ],
          facts:
            value === null
              ? workspace.facts
              : [
                  {
                    id: `fact-fixture-${workspace.facts.length + 1}`,
                    sourceDocumentId: selectedCandidate.sourceDocumentId,
                    extractedFieldId: selectedCandidate.id,
                    sourcePassageId: selectedCandidate.sourcePassageId,
                    factKey: selectedCandidate.fieldKey,
                    value,
                    versionNumber: (prior?.versionNumber ?? 0) + 1,
                    supersedesFactId: prior?.id ?? null,
                    confirmedBy: "fictional-broker",
                    confirmedAt: reviewedAt,
                    correctionReason:
                      reviewAction === "corrected" ? reviewNote : null,
                  },
                  ...workspace.facts,
                ],
        });
      } else {
        await responseJson(
          fetch(
            `/api/production/documents/fields/${selectedCandidate.id}/review`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: reviewAction,
                reviewedValue:
                  reviewAction === "corrected" ? reviewedValue : undefined,
                note: reviewNote || undefined,
              }),
            },
          ),
        );
        await loadWorkspace();
      }
      setNotice(
        reviewAction === "rejected"
          ? "Candidate rejected; no confirmed fact was created."
          : reviewAction === "corrected"
            ? "Human correction saved as a superseding fact version."
            : "Candidate confirmed by a human reviewer with its source citation.",
      );
      if (selectedCandidate)
        setReviewDrafts((current) => ({
          ...current,
          [selectedCandidate.id]: {
            action: "confirmed",
            value: selectedCandidate.value,
            note: "",
          },
        }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review failed closed.");
    } finally {
      setPending(null);
    }
  };

  if (loading)
    return (
      <main className="document-page document-state-page">
        <LoaderCircle className="document-spinner" aria-hidden="true" />
        <h1>Loading document controls</h1>
        <p>Resolving tenant scope, clean objects, durable jobs, and review history.</p>
      </main>
    );

  if (!workspace)
    return (
      <main className="document-page document-state-page">
        <AlertTriangle aria-hidden="true" />
        <h1>Document workspace unavailable</h1>
        <p>{error ?? "The production document boundary failed closed."}</p>
        <button className="button secondary" onClick={() => void loadWorkspace()}>
          <RefreshCw size={15} /> Retry
        </button>
      </main>
    );

  return (
    <main className="document-page">
      <header className="document-hero">
        <div>
          <span className="eyebrow">Production document control plane</span>
          <h1>Document intake and fact review</h1>
          <p>
            Queue clean originals, preserve page and region provenance, and require
            a recorded human decision before any candidate becomes a confirmed fact.
          </p>
        </div>
        <div className="document-mode-card">
          <span className={sandbox ? "sandbox-dot" : "production-dot"} />
          <div>
            <strong>{sandbox ? "Synthetic sandbox" : "Production tenant"}</strong>
            <span>
              {sandbox
                ? "No persistence or external provider calls"
                : `${role ?? "Scoped member"} · tenant-isolated`}
            </span>
          </div>
        </div>
      </header>

      <section className="document-trust-strip" aria-label="Processing guarantees">
        <span><ShieldCheck size={16} /> Clean scanned objects only</span>
        <span><History size={16} /> Immutable candidate and fact versions</span>
        <span><LockKeyhole size={16} /> Human confirmation required</span>
      </section>

      {error ? (
        <div className="document-alert error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error"><X size={15} /></button>
        </div>
      ) : null}
      {notice ? (
        <div className="document-alert notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss notice"><X size={15} /></button>
        </div>
      ) : null}

      <section className="document-overview-grid">
        <article>
          <span>Provider</span>
          <strong>{workspace.provider.key}</strong>
          <small>v{workspace.provider.version} · {workspace.provider.modelDerived ? "model-derived" : "deterministic"}</small>
        </article>
        <article>
          <span>Review queue</span>
          <strong>{workspace.candidates.filter((candidate) => !(reviewsByField.get(candidate.id)?.length)).length}</strong>
          <small>candidate fields still unreviewed</small>
        </article>
        <article>
          <span>Durable jobs</span>
          <strong>{workspace.jobs.filter((job) => job.status !== "succeeded").length}</strong>
          <small>queued, retrying, or dead-lettered</small>
        </article>
        <article>
          <span>Confirmed facts</span>
          <strong>{workspace.facts.length}</strong>
          <small>all versions retained</small>
        </article>
      </section>

      <section className="document-section">
        <div className="document-section-heading">
          <div><span>01</span><h2>Register a clean original</h2></div>
          <p>Uploads enter quarantine first. Intake cannot bypass the malware-scanner gate.</p>
        </div>
        <div className="document-intake-grid">
          <div className="document-upload-card">
            <label className="document-dropzone">
              <Upload size={22} aria-hidden="true" />
              <strong>{file?.name ?? "Choose or drop a document"}</strong>
              <span>PDF, PNG, JPEG, or TXT · up to 25 MiB</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
                onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {file ? (
              <div className="document-file-meta">
                <span>{fileMimeType}</span><span>{file.size.toLocaleString()} bytes</span>
                <code>{shortHash(fileHash)}</code>
              </div>
            ) : null}
            <button
              className="button secondary"
              disabled={!fileHash || pending === "upload"}
              onClick={() => void uploadFile()}
            >
              {pending === "upload" ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}
              Hash and upload to quarantine
            </button>
          </div>
          <div className="document-intake-form">
            <label>
              Renewal case
              <select value={caseId} onChange={(event) => setCaseId(event.target.value)}>
                <option value="">Select a case</option>
                {workspace.cases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
            <label>
              Clean source object
              <select value={storageObjectId} onChange={(event) => setStorageObjectId(event.target.value)}>
                <option value="">Select a scanned object</option>
                {workspace.cleanObjects.map((object) => (
                  <option key={object.id} value={object.id}>
                    {object.filename}{object.providerSupported ? "" : " · provider unavailable"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Supersedes document <span>optional</span>
              <select value={supersedesDocumentId} onChange={(event) => setSupersedesDocumentId(event.target.value)}>
                <option value="">New original</option>
                {workspace.documents.map((document) => (
                  <option key={document.id} value={document.id}>v{document.versionNumber} · {document.filename}</option>
                ))}
              </select>
            </label>
            {selectedObject ? (
              <div className={`document-provider-gate ${selectedObject.providerSupported ? "ready" : "blocked"}`}>
                {selectedObject.providerSupported ? <Check size={16} /> : <AlertTriangle size={16} />}
                <span>
                  {selectedObject.providerSupported
                    ? `Clean object · ${shortHash(selectedObject.sha256)}`
                    : `${workspace.provider.key} does not support ${selectedObject.mimeType}; configure a rights-approved OCR adapter.`}
                </span>
              </div>
            ) : null}
            <button
              className="button primary"
              disabled={!caseId || !selectedObject?.providerSupported || pending === "intake"}
              onClick={() => void queueIntake()}
            >
              {pending === "intake" ? <LoaderCircle className="spin" size={15} /> : <ScanLine size={15} />}
              Queue durable processing
            </button>
          </div>
        </div>
      </section>

      <section className="document-section">
        <div className="document-section-heading">
          <div><span>02</span><h2>Processing ledger</h2></div>
          <p>Attempts remain visible through retries, lease recovery, and dead-letter review.</p>
        </div>
        {workspace.jobs.length ? (
          <div className="document-table-wrap">
            <table className="document-table">
              <thead><tr><th>Document</th><th>Status</th><th>Attempts</th><th>Last issue</th><th>Control</th></tr></thead>
              <tbody>
                {workspace.jobs.map((job) => {
                  const document = documentById.get(job.sourceDocumentId);
                  return (
                    <tr key={job.id}>
                      <td><button className="document-table-link" onClick={() => setSelectedDocumentId(job.sourceDocumentId)}>{document?.filename ?? "Unavailable source record"}</button><small>{shortHash(document?.sha256 ?? null)}</small></td>
                      <td><span className={statusClass(job.status)}>{job.status.replaceAll("_", " ")}</span></td>
                      <td>{job.attemptCount} / {job.maxAttempts}</td>
                      <td>{job.lastErrorCode ? <><strong>{job.lastErrorCode}</strong><small>{job.lastErrorMessage}</small></> : <span className="muted">None</span>}</td>
                      <td>
                        {job.status === "dead_letter" ? (
                          <button className="button ghost compact" disabled={pending === `retry-${job.id}`} onClick={() => void retryJob(job)}>
                            <RotateCcw size={14} /> Retry +1
                          </button>
                        ) : <span className="muted">Worker-owned</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="document-empty"><FileSearch size={24} /><strong>No document jobs yet</strong><span>Upload and select a clean object to create the first durable job.</span></div>
        )}
      </section>

      <section className="document-section">
        <div className="document-section-heading">
          <div><span>03</span><h2>Human fact review</h2></div>
          <p>Confidence prioritizes review; it never confirms a fact or predicts an insurance outcome.</p>
        </div>
        <div className="document-review-toolbar">
          <label>
            Source document
            <select
              value={selectedDocumentId}
              onChange={(event) => {
                setSelectedDocumentId(event.target.value);
                setCandidatePage(1);
              }}
            >
              <option value="">Select a processed document</option>
              {workspace.documents.map((document) => (
                <option key={document.id} value={document.id}>v{document.versionNumber} · {document.filename} · {document.processingStatus}</option>
              ))}
            </select>
          </label>
          <label>
            Candidate state
            <select value={candidateFilter} onChange={(event) => { setCandidateFilter(event.target.value); setCandidatePage(1); }}>
              <option value="all">All candidates</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="reviewed">Reviewed</option>
              <option value="low_confidence">Low confidence</option>
            </select>
          </label>
          {selectedDocument ? (
            <div className="document-classification">
              <span className={statusClass(selectedDocument.processingStatus)}>{selectedDocument.processingStatus.replaceAll("_", " ")}</span>
              <small>{selectedDocument.documentType.replaceAll("_", " ")} · classifier {selectedDocument.classifierVersion ?? "pending"}</small>
            </div>
          ) : null}
        </div>
        <div className="document-review-grid">
          <div className="document-candidate-list" aria-label="Extracted candidate fields">
            {visibleCandidates.length ? visibleCandidates.map((candidate) => {
              const reviewed = (reviewsByField.get(candidate.id)?.length ?? 0) > 0;
              return (
                <button
                  key={candidate.id}
                  className={candidate.id === effectiveSelectedCandidateId ? "active" : ""}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                >
                  <span><strong>{candidate.fieldLabel}</strong><small>candidate {candidate.candidateOrdinal}</small></span>
                  <b>{candidate.value}</b>
                  <span className="document-candidate-meta">
                    <em className={Number(candidate.confidence) < 0.7 ? "low" : ""}>{Math.round(Number(candidate.confidence) * 100)}% confidence</em>
                    {candidate.modelDerived ? <em>model-derived</em> : <em>deterministic</em>}
                    {reviewed ? <em className="reviewed">reviewed</em> : <em>unreviewed</em>}
                  </span>
                </button>
              );
            }) : (
              <div className="document-empty compact"><FileText size={22} /><strong>No candidates in this view</strong><span>Missing or unextracted fields remain explicit; change the filter or process another document.</span></div>
            )}
            {candidatePageCount > 1 ? (
              <div className="document-pagination">
                <button aria-label="Previous candidate page" disabled={candidatePage === 1} onClick={() => setCandidatePage((page) => page - 1)}><ChevronLeft size={15} /></button>
                <span>{candidatePage} / {candidatePageCount}</span>
                <button aria-label="Next candidate page" disabled={candidatePage === candidatePageCount} onClick={() => setCandidatePage((page) => page + 1)}><ChevronRight size={15} /></button>
              </div>
            ) : null}
          </div>
          <div className="document-review-panel">
            {selectedCandidate ? (
              <>
                <div className="document-review-title">
                  <div><span className="eyebrow">Candidate field</span><h3>{selectedCandidate.fieldLabel}</h3></div>
                  <span className={Number(selectedCandidate.confidence) < 0.7 ? "confidence low" : "confidence"}>{Math.round(Number(selectedCandidate.confidence) * 100)}%</span>
                </div>
                <div className="document-source-card">
                  <div><span>Extracted value</span><strong>{selectedCandidate.value}</strong></div>
                  <blockquote>{selectedPassage?.textContent ?? "Source passage unavailable — confirmation must remain blocked."}</blockquote>
                  <dl>
                    <div><dt>Source</dt><dd>{selectedPassage ? `Page ${selectedPassage.pageNumber ?? "—"} · ${selectedPassage.segment ?? "segment unavailable"}` : "Unavailable"}</dd></div>
                    <div><dt>Region</dt><dd>{formatRegion(selectedPassage?.region ?? null)}</dd></div>
                    <div><dt>Extractor</dt><dd>{selectedPassage?.extractorVersion ?? "Unavailable"}</dd></div>
                    <div><dt>Derivation</dt><dd>{selectedCandidate.modelDerived ? "Model-derived candidate; human review mandatory" : "Deterministic candidate; human review mandatory"}</dd></div>
                  </dl>
                </div>
                <fieldset className="document-review-actions" disabled={!canReview || pending === "review"}>
                  <legend>Recorded human decision</legend>
                  <div className="document-radio-row">
                    {(["confirmed", "corrected", "rejected"] as const).map((action) => (
                      <label key={action}><input type="radio" name="review-action" value={action} checked={reviewAction === action} onChange={() => updateReviewDraft({ action })} />{action}</label>
                    ))}
                  </div>
                  {reviewAction === "corrected" ? (
                    <label>Corrected value<input value={reviewedValue} onChange={(event) => updateReviewDraft({ value: event.target.value })} /></label>
                  ) : null}
                  <label>
                    Review note {reviewAction === "corrected" ? <span>required</span> : <span>optional</span>}
                    <textarea value={reviewNote} onChange={(event) => updateReviewDraft({ note: event.target.value })} rows={3} placeholder="Record what was checked or why this candidate is rejected." />
                  </label>
                  <button
                    className="button primary"
                    disabled={!selectedPassage || (reviewAction === "corrected" && (!reviewedValue.trim() || !reviewNote.trim()))}
                    onClick={() => void submitReview()}
                  >
                    {pending === "review" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
                    Save immutable review
                  </button>
                </fieldset>
                <div className="document-history">
                  <h4>Fact and review history</h4>
                  {factHistory.length || candidateReviews.length ? (
                    <ol>
                      {factHistory.map((fact) => (
                        <li key={fact.id}><span>Fact v{fact.versionNumber}</span><strong>{fact.value}</strong><small>{fact.correctionReason ?? "Human confirmed"} · {fact.confirmedBy}</small></li>
                      ))}
                      {candidateReviews.filter((review) => review.action === "rejected").map((review) => (
                        <li key={review.id}><span>Rejected candidate</span><strong>No fact created</strong><small>{review.note ?? "No note"} · {review.reviewerSubject}</small></li>
                      ))}
                    </ol>
                  ) : <p>No human decision has been recorded for this candidate.</p>}
                </div>
              </>
            ) : (
              <div className="document-empty"><FileSearch size={26} /><strong>Select a candidate</strong><span>Its exact source passage, region, extractor, confidence, and history will appear here.</span></div>
            )}
          </div>
        </div>
      </section>

      <footer className="document-boundary">
        <AlertTriangle size={18} />
        <p><strong>Evidence workflow boundary.</strong> Fortify does not create a wildfire risk score, certify compliance, or predict renewal, pricing, or carrier acceptance. External OCR and document-intelligence providers require separate rights, credentials, security review, and staging validation.</p>
        <Link href="/notice">Open the preserved fictional notice walkthrough</Link>
      </footer>
    </main>
  );
}
