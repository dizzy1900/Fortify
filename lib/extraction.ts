import type { NoticeFieldRecord } from "./domain";

const patterns: Array<[string, string, RegExp]> = [
  ["classification", "Carrier classification", /classification:\s*([^\n]+)/i],
  ["score", "Carrier-stated score", /score:\s*([^\n]+)/i],
  ["drivers", "Stated drivers", /drivers?:\s*([^\n]+)/i],
  ["discounts", "Stated discounts", /discount(?:s| eligibility)?:\s*([^\n]+)/i],
  ["requestedEvidence", "Requested evidence", /(?:requested evidence|provide):\s*([^\n]+)/i],
  ["appealRights", "Appeal rights", /appeal rights?:\s*([^\n]+)/i],
  ["appealDeadline", "Appeal deadline", /appeal deadline:\s*(\d{4}-\d{2}-\d{2})/i],
];

export function extractNoticeFields(text: string): NoticeFieldRecord[] {
  return patterns.map(([key, label, pattern], index) => {
    const value = text.match(pattern)?.[1]?.trim() ?? "Not stated";
    return { key, label, extracted: value, confirmed: value, confidence: value === "Not stated" ? 0.35 : 0.93 - index * 0.02, confirmedByHuman: false };
  });
}
