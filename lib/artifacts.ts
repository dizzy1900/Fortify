import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { DemoState } from "./domain";
import { calculateReadiness } from "./readiness";
import { LocalFileStorageAdapter } from "./storage";

const navy = rgb(0.055, 0.118, 0.18);
const teal = rgb(0.05, 0.43, 0.42);
const slate = rgb(0.28, 0.34, 0.39);
const line = rgb(0.84, 0.87, 0.88);
const pageSize: [number, number] = [612, 792];
const safe = (value: unknown) =>
  String(value ?? "").replace(/[^\x20-\x7E]/g, "-");
const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of String(text).split(/\r?\n/)) {
    const words = safe(paragraph).split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && current) {
        lines.push(current);
        current = word;
      } else current = next;
    }
    if (current) lines.push(current);
    else lines.push("");
  }
  return lines;
}

function header(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  title: string,
  subtitle: string,
  number: number,
) {
  page.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: navy });
  page.drawText("FORTIFY", {
    x: 42,
    y: 760,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("RENEWAL EVIDENCE PACKET", {
    x: 116,
    y: 760,
    size: 8,
    font,
    color: rgb(0.78, 0.87, 0.88),
  });
  page.drawText(safe(title), {
    x: 42,
    y: 707,
    size: 19,
    font: bold,
    color: navy,
  });
  page.drawText(safe(subtitle), { x: 42, y: 687, size: 9, font, color: slate });
  page.drawLine({
    start: { x: 42, y: 674 },
    end: { x: 570, y: 674 },
    color: line,
    thickness: 1,
  });
  page.drawText(`Fictional demo - Page ${number}`, {
    x: 448,
    y: 24,
    size: 8,
    font,
    color: slate,
  });
}

function section(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  y: number,
  title: string,
  body: string,
) {
  page.drawText(safe(title).toUpperCase(), {
    x: 42,
    y,
    size: 9,
    font: bold,
    color: teal,
  });
  let cursor = y - 18;
  for (const text of wrap(body, font, 9.5, 528)) {
    page.drawText(text, { x: 42, y: cursor, size: 9.5, font, color: navy });
    cursor -= 14;
  }
  return cursor - 10;
}

export async function generateCaseArtifacts(state: DemoState, caseId: string) {
  const community = state.communities.find((item) => item.caseId === caseId);
  if (!community) throw new Error("Case not found");
  const notice = state.notices.find((item) => item.caseId === caseId)!;
  const submission = state.submissions.find((item) => item.caseId === caseId)!;
  if (
    !notice.confirmed ||
    notice.fields.some((field) => !field.confirmedByHuman)
  )
    throw new Error(
      "Every carrier notice field must be human-confirmed before packet generation",
    );
  if (!submission.confirmedBy || !submission.confirmedAt)
    throw new Error(
      "A human must confirm the submission contents before packet generation",
    );
  const requirements = state.requirements.filter((item) =>
    community.requirementIds.includes(item.id),
  );
  const evidence = state.evidence.filter((item) =>
    community.evidenceIds.includes(item.id),
  );
  const mitigationActions = state.mitigationActions.filter(
    (item) => item.caseId === caseId,
  );
  const readiness = calculateReadiness(requirements, evidence, state.demoDate);
  const outputRoot = path.resolve(
    process.cwd(),
    process.env.FORTIFY_OUTPUT_PATH ?? "output",
  );
  const pdfPath = path.join(
    outputRoot,
    "pdf",
    `${caseId}-submission-v${submission.version}.pdf`,
  );
  const zipPath = path.join(
    outputRoot,
    "packets",
    `${caseId}-submission-v${submission.version}.zip`,
  );
  await fs.mkdir(path.dirname(pdfPath), { recursive: true });
  await fs.mkdir(path.dirname(zipPath), { recursive: true });

  const generatedAt = new Date(`${state.demoDate}T09:00:00.000Z`);
  const pdf = await PDFDocument.create();
  pdf.setCreationDate(generatedAt);
  pdf.setModificationDate(generatedAt);
  pdf.setTitle(`${community.name} renewal evidence packet`);
  pdf.setAuthor("Fortify fictional demo workspace");
  pdf.setSubject("Broker-organized renewal evidence; no certification implied");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage(pageSize);
  header(
    page,
    font,
    bold,
    "Submission cover",
    `${community.name} | ${community.policyNumber}`,
    1,
  );
  page.drawRectangle({
    x: 42,
    y: 514,
    width: 528,
    height: 132,
    color: rgb(0.95, 0.97, 0.97),
    borderColor: line,
    borderWidth: 1,
  });
  page.drawText(safe(submission.purpose), {
    x: 62,
    y: 615,
    size: 16,
    font: bold,
    color: navy,
  });
  page.drawText(`Evidence readiness ${readiness.total}%`, {
    x: 62,
    y: 583,
    size: 12,
    font: bold,
    color: teal,
  });
  page.drawText(
    "Readiness organizes evidence only. It is not a risk, eligibility, or compliance score.",
    { x: 62, y: 560, size: 8.5, font, color: slate },
  );
  page.drawText(
    `Renewal ${community.renewalDate}  |  Appeal deadline ${community.appealDeadline}`,
    { x: 62, y: 535, size: 9.5, font, color: navy },
  );
  let y = 476;
  y = section(
    page,
    font,
    bold,
    y,
    "Submission purpose",
    `This packet responds to the carrier-stated notice for ${community.caseTitle}. It contains broker-organized, human-reviewed evidence and clearly identifies unresolved caveats.`,
  );
  y = section(
    page,
    font,
    bold,
    y,
    "Property and policy",
    `${community.type}; ${community.units} units across ${community.buildings} buildings; ${community.address}; ${community.carrier}; policy ${community.policyNumber}; entered annual premium ${money(community.premium)}.`,
  );
  section(
    page,
    font,
    bold,
    y,
    "Limitations",
    "Fortify does not perform inspection, hazard modeling, legal review, actuarial certification, or underwriting. Carrier acceptance, renewal, discounts, and pricing changes are not guaranteed.",
  );

  page = pdf.addPage(pageSize);
  header(
    page,
    font,
    bold,
    "Confirmed carrier notice",
    `${notice.filename} | received ${notice.receivedDate}`,
    2,
  );
  y = 644;
  for (const field of notice.fields) {
    page.drawText(safe(field.label), {
      x: 42,
      y,
      size: 8,
      font: bold,
      color: teal,
    });
    page.drawText(safe(field.confirmed), {
      x: 194,
      y,
      size: 8.5,
      font,
      color: navy,
    });
    page.drawText(
      field.confirmedByHuman ? "CONFIRMED" : "PENDING HUMAN CONFIRMATION",
      {
        x: 465,
        y,
        size: 6.7,
        font: bold,
        color: field.confirmedByHuman ? teal : rgb(0.72, 0.35, 0.08),
      },
    );
    y -= 34;
  }
  y = section(
    page,
    font,
    bold,
    y - 4,
    "Communication timeline",
    `Notice received ${notice.receivedDate}. Appeal deadline ${community.appealDeadline}. Any 10-day acknowledgement and 30-day decision periods shown in Fortify are configurable demo workflow references and must be verified against current requirements and the applicable policy.`,
  );

  page = pdf.addPage(pageSize);
  header(
    page,
    font,
    bold,
    "Requirement-to-evidence matrix",
    `${requirements.length} selected, non-exhaustive demo requirements`,
    3,
  );
  y = 646;
  page.drawText("CODE", { x: 42, y, size: 7, font: bold, color: slate });
  page.drawText("REQUIREMENT / SOURCE", {
    x: 112,
    y,
    size: 7,
    font: bold,
    color: slate,
  });
  page.drawText("STATUS", { x: 490, y, size: 7, font: bold, color: slate });
  y -= 18;
  for (const requirement of requirements) {
    page.drawLine({
      start: { x: 42, y: y - 6 },
      end: { x: 570, y: y - 6 },
      color: line,
      thickness: 0.5,
    });
    page.drawText(requirement.code, { x: 42, y, size: 7.3, font, color: navy });
    page.drawText(safe(requirement.title).slice(0, 44), {
      x: 112,
      y,
      size: 7.8,
      font: bold,
      color: navy,
    });
    page.drawText(safe(requirement.source).slice(0, 58), {
      x: 112,
      y: y - 12,
      size: 6.5,
      font,
      color: slate,
    });
    page.drawText(requirement.status.toUpperCase(), {
      x: 490,
      y,
      size: 7,
      font: bold,
      color: requirement.status === "ready" ? teal : rgb(0.72, 0.35, 0.08),
    });
    y -= 42;
  }
  page.drawText(
    "Verify current requirements. Summaries are selected demo references, not exhaustive compliance criteria.",
    { x: 42, y: 68, size: 7.5, font, color: slate },
  );

  page = pdf.addPage(pageSize);
  header(
    page,
    font,
    bold,
    "Mitigation action register",
    `${mitigationActions.length} broker-entered operational actions; no certification implied`,
    pdf.getPageCount(),
  );
  y = 646;
  for (const action of mitigationActions) {
    page.drawText(safe(action.title), {
      x: 42,
      y,
      size: 11,
      font: bold,
      color: navy,
    });
    page.drawText(action.status.toUpperCase(), {
      x: 472,
      y,
      size: 7.5,
      font: bold,
      color: action.status === "complete" ? teal : rgb(0.72, 0.35, 0.08),
    });
    page.drawText(
      `${action.sourceOrganization} | ${action.evidenceIds.length} linked exhibits${action.completedAt ? ` | entered completion ${action.completedAt}` : ""}`,
      { x: 42, y: y - 18, size: 8, font, color: slate },
    );
    page.drawLine({
      start: { x: 42, y: y - 32 },
      end: { x: 570, y: y - 32 },
      color: line,
      thickness: 0.5,
    });
    y -= 58;
  }
  section(
    page,
    font,
    bold,
    y - 12,
    "Register limitation",
    "Actions and completion dates are broker-entered workflow records linked to submitted evidence. Fortify does not inspect the property, validate performance, certify a designation, or determine compliance.",
  );

  page = pdf.addPage(pageSize);
  header(
    page,
    font,
    bold,
    "Evidence index",
    `${evidence.length} exhibits with provenance and hashes`,
    pdf.getPageCount(),
  );
  y = 646;
  for (const [index, item] of evidence.entries()) {
    page.drawText(`E${String(index + 1).padStart(2, "0")}`, {
      x: 42,
      y,
      size: 7,
      font: bold,
      color: teal,
    });
    page.drawText(safe(item.filename).slice(0, 42), {
      x: 72,
      y,
      size: 7.4,
      font: bold,
      color: navy,
    });
    page.drawText(
      `${item.captureDate} | ${item.scopeLabel} | ${item.sourceOrganization}`.slice(
        0,
        78,
      ),
      { x: 72, y: y - 11, size: 6.5, font, color: slate },
    );
    page.drawText(`SHA-256 ${item.sha256}`, {
      x: 72,
      y: y - 21,
      size: 5.8,
      font,
      color: slate,
    });
    if (item.expiryDate)
      page.drawText(`Expires ${item.expiryDate}`, {
        x: 474,
        y,
        size: 6.5,
        font: bold,
        color: item.expiryDate < state.demoDate ? rgb(0.72, 0.16, 0.12) : teal,
      });
    y -= 39;
    if (y < 72 && index < evidence.length - 1) {
      page = pdf.addPage(pageSize);
      header(
        page,
        font,
        bold,
        "Evidence index - continued",
        community.name,
        pdf.getPageCount(),
      );
      y = 646;
    }
  }

  page = pdf.addPage(pageSize);
  header(
    page,
    font,
    bold,
    "Caveats, attestations, and exhibits",
    community.name,
    pdf.getPageCount(),
  );
  y = 644;
  const conflicts = evidence.filter((item) => item.conflictWith).length;
  const expired = evidence.filter(
    (item) => item.expiryDate && item.expiryDate < state.demoDate,
  ).length;
  y = section(
    page,
    font,
    bold,
    y,
    "Unresolved caveats",
    `${conflicts} evidence records remain linked to an unresolved contradiction; ${expired} evidence records are expired as of ${state.demoDate}. Missing or ambiguous evidence remains visible and is not treated as satisfied.`,
  );
  y = section(
    page,
    font,
    bold,
    y,
    "Broker attestation",
    "The submitting broker confirms that notice fields and the selected packet contents received human review. Source organizations and verification parties are recorded as provided; Fortify does not independently certify them.",
  );
  y = section(
    page,
    font,
    bold,
    y,
    "Editable reconsideration letter",
    submission.letter,
  );
  section(
    page,
    font,
    bold,
    Math.max(y, 145),
    "Appendix",
    `Exhibits E01-E${String(evidence.length).padStart(2, "0")} are included in the companion ZIP with manifest.json. Each manifest record contains the evidence identifier, scope, source, dates, status, and SHA-256 metadata.`,
  );
  const pdfBytes = await pdf.save();
  await fs.writeFile(pdfPath, pdfBytes);

  const zip = new JSZip();
  const storage = new LocalFileStorageAdapter();
  const manifest = {
    schemaVersion: "fortify-manifest-1",
    generatedAt: `${state.demoDate}T09:00:00Z`,
    fictionalDemo: true,
    case: {
      id: caseId,
      community: community.name,
      policy: community.policyNumber,
    },
    noticeConfirmed: notice.confirmed,
    submissionConfirmedBy: submission.confirmedBy,
    submissionConfirmedAt: submission.confirmedAt,
    limitations: [
      "Carrier acceptance and pricing changes are not guaranteed.",
      "Evidence readiness is not a risk, eligibility, or compliance score.",
    ],
    requirements: requirements.map(
      ({ id, code, title, scope, source, version, status }) => ({
        id,
        code,
        title,
        scope,
        source,
        version,
        status,
      }),
    ),
    mitigationActions,
    evidence: evidence.map((item, index) => ({
      exhibit: `E${String(index + 1).padStart(2, "0")}`,
      ...item,
    })),
  };
  const zipOptions = { date: generatedAt, createFolders: false };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2), zipOptions);
  zip.file("reconsideration-letter.txt", submission.letter, zipOptions);
  zip.file(path.basename(pdfPath), pdfBytes, zipOptions);
  for (const [index, item] of evidence.entries())
    zip.file(
      `exhibits/E${String(index + 1).padStart(2, "0")}-${item.filename}`,
      await storage.read(item.filename),
      zipOptions,
    );
  const zipBytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
  await fs.writeFile(zipPath, zipBytes);
  return {
    pdfPath,
    zipPath,
    pdfBytes: pdfBytes.length,
    zipBytes: zipBytes.length,
    manifestHash: createHash("sha256")
      .update(JSON.stringify(manifest))
      .digest("hex"),
  };
}
