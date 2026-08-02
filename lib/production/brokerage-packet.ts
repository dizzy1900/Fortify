import { createHash } from "node:crypto";
import JSZip from "jszip";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export const BROKERAGE_PACKET_RECIPE_VERSION =
  "fortify-production-brokerage-packet-1";

export type BrokeragePacketModel = {
  generatedAt: string;
  synthetic: boolean;
  organization: { id: string; name: string };
  brokerageCase: {
    id: string;
    title: string;
    caseType: string;
    status: string;
    peril: string;
    jurisdiction: string;
    renewalDate: string;
    appealDeadline: string | null;
  };
  client: { name: string };
  community: { name: string };
  property: {
    id: string;
    name: string;
    propertyClass: string;
    unitCount: number | null;
    buildingCount: number | null;
    address: string;
  };
  policy: {
    policyNumber: string;
    effectiveDate: string | null;
    expirationDate: string;
    marketName: string | null;
    sourceAuthority: string;
  };
  notice: {
    documentId: string;
    filename: string;
    sha256: string | null;
    receivedAt: string;
    facts: Array<{
      key: string;
      value: string;
      confirmedBy: string;
      confirmedAt: string;
      sourcePassageId: string | null;
    }>;
  };
  evidenceRequests: Array<{
    id: string;
    recipientType: string;
    recipientLabel: string;
    status: string;
    purpose: string;
    dueAt: string;
    items: Array<{
      evidenceType: string;
      label: string;
      required: boolean;
      scopeType: string;
      scopeReference?: string;
      guidance: string;
    }>;
  }>;
  evidence: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    sourceType: string;
    scopeType: string;
    scopeReference: string | null;
    reviewStatus: string;
    storageKey: string;
    body: Uint8Array;
  }>;
  openContradictionCount: number;
  purpose: string;
  letter: string;
  confirmedBy: string;
  confirmedAt: string;
};

export type PacketArtifact = {
  artifactType: "pdf" | "zip" | "manifest" | "letter";
  filename: string;
  mimeType: string;
  body: Uint8Array;
  sha256: string;
};

const navy = rgb(0.055, 0.118, 0.18);
const teal = rgb(0.05, 0.43, 0.42);
const slate = rgb(0.28, 0.34, 0.39);
const line = rgb(0.84, 0.87, 0.88);
const pageSize: [number, number] = [612, 792];

const safe = (value: unknown) =>
  String(value ?? "").replace(/[^\x20-\x7E]/g, "-");

const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const digest = (body: Uint8Array) =>
  createHash("sha256").update(body).digest("hex");

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of safe(text).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(candidate, size) > width) {
        lines.push(current);
        current = word;
      } else current = candidate;
    }
    lines.push(current);
  }
  return lines;
}

function pageHeader(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  title: string,
  subtitle: string,
  pageNumber: number,
  synthetic: boolean,
) {
  page.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: navy });
  page.drawText("FORTIFY", {
    x: 42,
    y: 760,
    size: 13,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("BROKERAGE RENEWAL EVIDENCE", {
    x: 116,
    y: 760,
    size: 8,
    font,
    color: rgb(0.78, 0.87, 0.88),
  });
  page.drawText(safe(title), { x: 42, y: 707, size: 19, font: bold, color: navy });
  page.drawText(safe(subtitle), { x: 42, y: 687, size: 9, font, color: slate });
  page.drawLine({
    start: { x: 42, y: 674 },
    end: { x: 570, y: 674 },
    color: line,
    thickness: 1,
  });
  const footer = `${synthetic ? "Synthetic development fixture" : "Customer-controlled record"} - Page ${pageNumber}`;
  page.drawText(footer, {
    x: 570 - font.widthOfTextAtSize(footer, 7.4),
    y: 24,
    size: 7.4,
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
    size: 8.5,
    font: bold,
    color: teal,
  });
  let cursor = y - 17;
  for (const row of wrap(body, font, 9.2, 528)) {
    page.drawText(row, { x: 42, y: cursor, size: 9.2, font, color: navy });
    cursor -= 13;
  }
  return cursor - 12;
}

function addEvidenceRows(
  pdf: PDFDocument,
  firstPage: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  model: BrokeragePacketModel,
) {
  let page = firstPage;
  let y = 640;
  if (!model.evidence.length) {
    section(
      page,
      font,
      bold,
      y,
      "No submitted exhibits",
      "No evidence file is included. Missing evidence remains explicit and is not treated as satisfied.",
    );
    return;
  }
  model.evidence.forEach((item, index) => {
    if (y < 95) {
      page = pdf.addPage(pageSize);
      pageHeader(
        page,
        font,
        bold,
        "Evidence index - continued",
        model.property.name,
        pdf.getPageCount(),
        model.synthetic,
      );
      y = 640;
    }
    page.drawText(`E${String(index + 1).padStart(2, "0")}`, {
      x: 42,
      y,
      size: 7.4,
      font: bold,
      color: teal,
    });
    page.drawText(safe(item.filename).slice(0, 54), {
      x: 76,
      y,
      size: 8,
      font: bold,
      color: navy,
    });
    page.drawText(
      `${label(item.sourceType)} | ${label(item.scopeType)} | ${label(item.reviewStatus)}`,
      { x: 76, y: y - 13, size: 6.8, font, color: slate },
    );
    page.drawText(`SHA-256 ${item.sha256}`, {
      x: 76,
      y: y - 25,
      size: 5.8,
      font,
      color: slate,
    });
    page.drawLine({
      start: { x: 42, y: y - 34 },
      end: { x: 570, y: y - 34 },
      color: line,
      thickness: 0.5,
    });
    y -= 45;
  });
}

async function buildPdf(model: BrokeragePacketModel) {
  const generatedAt = new Date(model.generatedAt);
  const pdf = await PDFDocument.create();
  pdf.setCreationDate(generatedAt);
  pdf.setModificationDate(generatedAt);
  pdf.setTitle(`${model.property.name} brokerage renewal evidence packet`);
  pdf.setAuthor(model.organization.name);
  pdf.setSubject("Human-confirmed brokerage evidence; no market outcome implied");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage(pageSize);
  pageHeader(
    page,
    font,
    bold,
    "Submission cover",
    `${model.property.name} | Policy ${model.policy.policyNumber}`,
    1,
    model.synthetic,
  );
  page.drawRectangle({
    x: 42,
    y: 510,
    width: 528,
    height: 136,
    color: rgb(0.95, 0.97, 0.97),
    borderColor: line,
    borderWidth: 1,
  });
  page.drawText(safe(model.purpose).slice(0, 64), {
    x: 62,
    y: 615,
    size: 14,
    font: bold,
    color: navy,
  });
  page.drawText("Human confirmation recorded", {
    x: 62,
    y: 582,
    size: 11,
    font: bold,
    color: teal,
  });
  page.drawText(
    `${model.confirmedBy} | ${model.confirmedAt}`.slice(0, 88),
    { x: 62, y: 560, size: 8.2, font, color: slate },
  );
  page.drawText(
    `Renewal ${model.brokerageCase.renewalDate} | Appeal deadline ${model.brokerageCase.appealDeadline ?? "not recorded"}`,
    { x: 62, y: 535, size: 9, font, color: navy },
  );
  let y = 475;
  y = section(
    page,
    font,
    bold,
    y,
    "Property and policy",
    `${model.community.name}; ${label(model.property.propertyClass)}; ${model.property.unitCount ?? "unknown"} units; ${model.property.buildingCount ?? "unknown"} buildings; ${model.property.address}; market ${model.policy.marketName ?? "not recorded"}; policy source ${model.policy.sourceAuthority}.`,
  );
  y = section(
    page,
    font,
    bold,
    y,
    "Case scope",
    `${label(model.brokerageCase.caseType)} case for ${label(model.brokerageCase.peril)} in ${model.brokerageCase.jurisdiction}. Packet contents come from tenant-scoped normalized records and exact stored evidence bytes.`,
  );
  section(
    page,
    font,
    bold,
    y,
    "Boundary",
    "This packet organises human-reviewed evidence. It is not a wildfire score, inspection, designation, compliance determination, model acceptance, rating decision, underwriting decision, funding decision, or guarantee of insurance availability or pricing.",
  );

  page = pdf.addPage(pageSize);
  pageHeader(
    page,
    font,
    bold,
    "Confirmed notice facts",
    `${model.notice.filename} | received ${model.notice.receivedAt}`,
    2,
    model.synthetic,
  );
  y = 640;
  for (const fact of model.notice.facts) {
    page.drawText(label(fact.key).slice(0, 30), {
      x: 42,
      y,
      size: 7.6,
      font: bold,
      color: teal,
    });
    for (const row of wrap(fact.value, font, 8, 330).slice(0, 2)) {
      page.drawText(row, { x: 190, y, size: 8, font, color: navy });
      y -= 11;
    }
    page.drawText(`Confirmed by ${safe(fact.confirmedBy)}`.slice(0, 46), {
      x: 440,
      y: y + 11,
      size: 6.2,
      font,
      color: slate,
    });
    y -= 25;
  }
  section(
    page,
    font,
    bold,
    Math.max(y, 140),
    "Source integrity",
    `Source document ${model.notice.documentId}; SHA-256 ${model.notice.sha256 ?? "unavailable"}. Each listed fact was created only after an append-only human review tied to its extracted candidate and source passage.`,
  );

  page = pdf.addPage(pageSize);
  pageHeader(
    page,
    font,
    bold,
    "External evidence requests",
    `${model.evidenceRequests.length} governed request${model.evidenceRequests.length === 1 ? "" : "s"}`,
    3,
    model.synthetic,
  );
  y = 640;
  if (!model.evidenceRequests.length) {
    y = section(
      page,
      font,
      bold,
      y,
      "No request issued",
      "No external evidence request is attached to this case. This remains an explicit workflow gap.",
    );
  } else {
    for (const request of model.evidenceRequests) {
      page.drawText(safe(request.recipientLabel), {
        x: 42,
        y,
        size: 10,
        font: bold,
        color: navy,
      });
      page.drawText(label(request.status).toUpperCase(), {
        x: 492,
        y,
        size: 7,
        font: bold,
        color: request.status === "issued" ? teal : slate,
      });
      page.drawText(
        `${label(request.recipientType)} | due ${request.dueAt}`.slice(0, 82),
        { x: 42, y: y - 15, size: 7.2, font, color: slate },
      );
      page.drawText(safe(request.purpose).slice(0, 85), {
        x: 42,
        y: y - 30,
        size: 8,
        font,
        color: navy,
      });
      y -= 48;
      for (const item of request.items.slice(0, 4)) {
        page.drawText(`${item.required ? "REQUIRED" : "REQUESTED"} - ${safe(item.label)}`.slice(0, 84), {
          x: 58,
          y,
          size: 7,
          font: item.required ? bold : font,
          color: item.required ? teal : slate,
        });
        y -= 14;
      }
      y -= 18;
    }
  }
  section(
    page,
    font,
    bold,
    Math.max(y, 112),
    "Request boundary",
    "A request records needed evidence and its exact scope. It does not certify work, establish an external relationship, or grant access beyond a separately issued and expiring authorization.",
  );

  page = pdf.addPage(pageSize);
  pageHeader(
    page,
    font,
    bold,
    "Evidence index",
    `${model.evidence.length} exact exhibit${model.evidence.length === 1 ? "" : "s"}`,
    4,
    model.synthetic,
  );
  addEvidenceRows(pdf, page, font, bold, model);

  page = pdf.addPage(pageSize);
  pageHeader(
    page,
    font,
    bold,
    "Caveats and accompanying letter",
    model.brokerageCase.title,
    pdf.getPageCount(),
    model.synthetic,
  );
  y = 640;
  y = section(
    page,
    font,
    bold,
    y,
    "Open contradictions",
    `${model.openContradictionCount} unresolved contradiction${model.openContradictionCount === 1 ? " remains" : "s remain"}. No unresolved item is silently treated as satisfied.`,
  );
  y = section(page, font, bold, y, "Accompanying letter", model.letter);
  section(
    page,
    font,
    bold,
    Math.max(y, 110),
    "Immutable packet",
    `The companion ZIP contains this PDF, the machine-readable manifest, the exact letter bytes, and exact exhibit bytes. Fortify records each artifact hash and never overwrites a submitted version. Recipe ${BROKERAGE_PACKET_RECIPE_VERSION}.`,
  );
  return new Uint8Array(await pdf.save());
}

export async function buildBrokeragePacket(
  model: BrokeragePacketModel,
): Promise<PacketArtifact[]> {
  const pdfBody = await buildPdf(model);
  const caseSlug = model.brokerageCase.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const pdfFilename = `${caseSlug}-brokerage-packet.pdf`;
  const manifest = {
    schemaVersion: "fortify-production-brokerage-packet-1",
    recipeVersion: BROKERAGE_PACKET_RECIPE_VERSION,
    generatedAt: model.generatedAt,
    synthetic: model.synthetic,
    organization: model.organization,
    brokerageCase: model.brokerageCase,
    property: model.property,
    policy: model.policy,
    notice: {
      documentId: model.notice.documentId,
      filename: model.notice.filename,
      sha256: model.notice.sha256,
      receivedAt: model.notice.receivedAt,
      facts: model.notice.facts,
    },
    evidenceRequests: model.evidenceRequests,
    evidence: model.evidence.map((item, index) => ({
      exhibit: `E${String(index + 1).padStart(2, "0")}`,
      id: item.id,
      filename: item.filename,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      sha256: item.sha256,
      sourceType: item.sourceType,
      scopeType: item.scopeType,
      scopeReference: item.scopeReference,
      reviewStatus: item.reviewStatus,
      storageKey: item.storageKey,
    })),
    openContradictionCount: model.openContradictionCount,
    humanConfirmation: {
      confirmedBy: model.confirmedBy,
      confirmedAt: model.confirmedAt,
    },
    limitations: [
      "Evidence completeness does not establish safety, compliance, insurability, model acceptance, or market recognition.",
      "No insurance, pricing, funding, verification, or resilience outcome is guaranteed.",
    ],
  };
  const manifestBody = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
  const letterBody = new TextEncoder().encode(model.letter);
  const zip = new JSZip();
  const fixedDate = new Date(model.generatedAt);
  const zipOptions = { date: fixedDate, createFolders: false };
  zip.file("manifest.json", manifestBody, zipOptions);
  zip.file("accompanying-letter.txt", letterBody, zipOptions);
  zip.file(pdfFilename, pdfBody, zipOptions);
  model.evidence.forEach((item, index) => {
    zip.file(
      `exhibits/E${String(index + 1).padStart(2, "0")}-${item.filename}`,
      item.body,
      zipOptions,
    );
  });
  const zipBody = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const artifacts: Array<Omit<PacketArtifact, "sha256">> = [
    {
      artifactType: "pdf",
      filename: pdfFilename,
      mimeType: "application/pdf",
      body: pdfBody,
    },
    {
      artifactType: "zip",
      filename: `${caseSlug}-brokerage-packet.zip`,
      mimeType: "application/zip",
      body: zipBody,
    },
    {
      artifactType: "manifest",
      filename: `${caseSlug}-manifest.json`,
      mimeType: "application/json",
      body: manifestBody,
    },
    {
      artifactType: "letter",
      filename: `${caseSlug}-accompanying-letter.txt`,
      mimeType: "text/plain",
      body: letterBody,
    },
  ];
  return artifacts.map((artifact) => ({
    ...artifact,
    sha256: digest(artifact.body),
  }));
}
