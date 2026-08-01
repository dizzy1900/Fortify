import { describe, expect, test } from "vitest";
import { buildSeedState } from "@/lib/seed";
import { calculateReadiness, addCalendarDays } from "@/lib/readiness";
import { extractNoticeFields } from "@/lib/extraction";

describe("deterministic Fortify domain", () => {
  test("seeds the complete fictional universe", () => {
    const state = buildSeedState();
    expect(state.communities).toHaveLength(3);
    expect(state.evidence.length).toBeGreaterThanOrEqual(40);
    expect(state.requirements.length).toBeGreaterThanOrEqual(25);
    expect(state.mitigationActions.length).toBeGreaterThanOrEqual(6);
    expect(
      state.communities.every((item) => item.name.startsWith("Fictional")),
    ).toBe(true);
    expect(state.evidence.some((item) => item.conflictWith)).toBe(true);
    expect(
      state.evidence.some(
        (item) => item.expiryDate && item.expiryDate < state.demoDate,
      ),
    ).toBe(true);
    expect(
      state.communities.some(
        (item) =>
          item.outcome?.disposition === "changed" && item.outcome.discount,
      ),
    ).toBeTruthy();
    expect(
      state.communities.some(
        (item) =>
          item.outcome?.disposition === "rejected" &&
          item.outcome.detail.includes("because"),
      ),
    ).toBe(true);
    expect(
      state.submissions.some((item) => item.status === "clarification"),
    ).toBe(true);
  });
  test("calculates visible evidence readiness components only", () => {
    const state = buildSeedState();
    for (const community of state.communities) {
      const result = calculateReadiness(
        state.requirements.filter((item) =>
          community.requirementIds.includes(item.id),
        ),
        state.evidence.filter((item) =>
          community.evidenceIds.includes(item.id),
        ),
        state.demoDate,
      );
      expect(Object.keys(result).sort()).toEqual(
        [
          "confidence",
          "contradictionResolution",
          "coverage",
          "freshness",
          "humanReview",
          "scopeMatch",
          "total",
        ].sort(),
      );
      for (const value of Object.values(result))
        expect(value).toBeGreaterThanOrEqual(0);
      for (const value of Object.values(result))
        expect(value).toBeLessThanOrEqual(100);
    }
  });
  test("extracts auditable fields without OCR or a model", () => {
    const fields = extractNoticeFields(
      "Classification: C\nScore: 61\nDrivers: roof\nDiscounts: none\nRequested evidence: photos\nAppeal rights: written\nAppeal deadline: 2026-08-12",
    );
    expect(fields).toHaveLength(7);
    expect(
      fields.find((field) => field.key === "appealDeadline")?.extracted,
    ).toBe("2026-08-12");
    expect(fields.every((field) => !field.confirmedByHuman)).toBe(true);
  });
  test("uses calendar-day deadline logic", () => {
    expect(addCalendarDays("2026-07-01", 10)).toBe("2026-07-11");
    expect(addCalendarDays("2026-07-31", 30)).toBe("2026-08-30");
  });
  test("reset seed is byte-for-byte deterministic", () => {
    expect(JSON.stringify(buildSeedState())).toBe(
      JSON.stringify(buildSeedState()),
    );
  });
});
