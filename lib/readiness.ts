import type { EvidenceRecord, ReadinessBreakdown, RequirementRecord } from "./domain";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function calculateReadiness(requirements: RequirementRecord[], evidence: EvidenceRecord[], asOf = "2026-08-01"): ReadinessBreakdown {
  const relevantIds = new Set(requirements.flatMap((requirement) => requirement.evidenceIds));
  const linked = evidence.filter((item) => relevantIds.has(item.id));
  const covered = requirements.filter((requirement) => requirement.status === "ready").length;
  const partial = requirements.filter((requirement) => requirement.status === "partial").length;
  const conflicts = requirements.filter((requirement) => requirement.status === "conflict").length;
  const current = linked.filter((item) => !item.expiryDate || item.expiryDate >= asOf);
  const reviewed = linked.filter((item) => item.humanReviewed);
  const scoped = linked.filter((item) => item.scope !== "parcel" || item.scopeLabel.length > 0);

  const result = {
    coverage: clamp(((covered + partial * 0.5) / Math.max(1, requirements.length)) * 100),
    freshness: clamp((current.length / Math.max(1, linked.length)) * 100),
    confidence: clamp(average(linked.map((item) => item.confidence * 100))),
    scopeMatch: clamp((scoped.length / Math.max(1, linked.length)) * 100),
    contradictionResolution: clamp(100 - (conflicts / Math.max(1, requirements.length)) * 100),
    humanReview: clamp((reviewed.length / Math.max(1, linked.length)) * 100),
    total: 0,
  };
  result.total = clamp(result.coverage * 0.3 + result.freshness * 0.15 + result.confidence * 0.15 + result.scopeMatch * 0.15 + result.contradictionResolution * 0.15 + result.humanReview * 0.1);
  return result;
}

export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
