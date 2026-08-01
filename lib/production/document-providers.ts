import pdf from "pdf-parse/lib/pdf-parse.js";
import { createHash } from "node:crypto";

export const DOCUMENT_TYPES = [
  "carrier_notice",
  "renewal_questionnaire",
  "nonrenewal_notice",
  "risk_score_notice",
  "mitigation_discount_notice",
  "underwriter_email",
  "evidence_request",
  "clarification_message",
  "declination_correspondence",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface DocumentRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface ProviderPassage {
  pageNumber: number;
  segment: string;
  text: string;
  kind: "paragraph" | "line" | "table_cell" | "email_segment" | "image_region";
  region?: DocumentRegion;
}

export interface ProviderDocument {
  passages: ProviderPassage[];
  pageCount: number;
  modelDerived: boolean;
  warnings: string[];
}

export interface DocumentTextProvider {
  readonly key: string;
  readonly version: string;
  readonly modelDerived: boolean;
  supports(mimeType: string): boolean;
  extract(input: {
    body: Uint8Array;
    filename: string;
    mimeType: string;
    sha256: string;
  }): Promise<ProviderDocument>;
}

export class DocumentProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly code = "document_provider_error",
  ) {
    super(message);
    this.name = "DocumentProviderError";
  }
}

function linesToPassages(text: string, pageNumber = 1): ProviderPassage[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      pageNumber,
      segment: `line-${index + 1}`,
      text: line,
      kind: "line" as const,
    }));
}

export class LocalSelectableTextProvider implements DocumentTextProvider {
  readonly key = "fortify-local-selectable-text";
  readonly version = "1.0.0";
  readonly modelDerived = false;

  supports(mimeType: string) {
    return mimeType === "application/pdf" || mimeType === "text/plain";
  }

  async extract(input: {
    body: Uint8Array;
    filename: string;
    mimeType: string;
    sha256: string;
  }): Promise<ProviderDocument> {
    if (!this.supports(input.mimeType))
      throw new DocumentProviderError(
        "The local provider supports selectable-text PDF and plain text only.",
        false,
        "unsupported_mime_type",
      );
    const text =
      input.mimeType === "application/pdf"
        ? (await pdf(Buffer.from(input.body))).text.trim()
        : Buffer.from(input.body).toString("utf8").trim();
    if (!text)
      throw new DocumentProviderError(
        "No selectable text was found; route this document to a configured OCR provider.",
        false,
        "ocr_provider_required",
      );
    const passages = linesToPassages(text);
    return {
      passages,
      pageCount: input.mimeType === "application/pdf" ? 1 : 1,
      modelDerived: false,
      warnings:
        input.mimeType === "application/pdf"
          ? [
              "The local parser preserves text segments but not native PDF bounding boxes; configure document intelligence for page-region geometry.",
            ]
          : [],
    };
  }
}

export class FixtureDocumentProvider implements DocumentTextProvider {
  readonly key = "fortify-deterministic-document-fixtures";
  readonly version = "1.0.0";
  readonly modelDerived: boolean;
  private readonly fixtures = new Map<string, ProviderDocument>();
  private failuresRemaining: number;

  constructor(input?: {
    modelDerived?: boolean;
    failuresBeforeSuccess?: number;
  }) {
    this.modelDerived = input?.modelDerived ?? false;
    this.failuresRemaining = input?.failuresBeforeSuccess ?? 0;
  }

  register(body: Uint8Array, document: Omit<ProviderDocument, "modelDerived">) {
    const sha256 = createHash("sha256").update(body).digest("hex");
    this.fixtures.set(sha256, {
      ...document,
      modelDerived: this.modelDerived,
    });
    return sha256;
  }

  supports() {
    return true;
  }

  async extract(input: { sha256: string }) {
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new DocumentProviderError(
        "Deterministic transient provider failure.",
        true,
        "fixture_transient_failure",
      );
    }
    const fixture = this.fixtures.get(input.sha256);
    if (!fixture)
      throw new DocumentProviderError(
        "No deterministic extraction fixture is registered for these bytes.",
        false,
        "fixture_not_registered",
      );
    return structuredClone(fixture);
  }
}

export class ExternalDocumentIntelligenceProvider
  implements DocumentTextProvider
{
  readonly modelDerived: boolean;

  constructor(
    readonly key: string,
    readonly version: string,
    private readonly execute: DocumentTextProvider["extract"],
    input?: { modelDerived?: boolean; supportedMimeTypes?: string[] },
  ) {
    if (!key.trim() || !version.trim())
      throw new Error("External document providers require a key and version.");
    this.modelDerived = input?.modelDerived ?? true;
    this.supportedMimeTypes = new Set(
      input?.supportedMimeTypes ?? ["application/pdf", "image/png", "image/jpeg"],
    );
  }

  private readonly supportedMimeTypes: Set<string>;

  supports(mimeType: string) {
    return this.supportedMimeTypes.has(mimeType);
  }

  async extract(input: Parameters<DocumentTextProvider["extract"]>[0]) {
    const result = await this.execute(input);
    return { ...result, modelDerived: this.modelDerived };
  }
}

export interface DocumentClassification {
  documentType: DocumentType;
  confidence: number;
  classifierKey: string;
  classifierVersion: string;
}

export interface DocumentClassifier {
  readonly key: string;
  readonly version: string;
  classify(document: ProviderDocument): DocumentClassification;
}

const classificationRules: Array<{
  documentType: DocumentType;
  pattern: RegExp;
}> = [
  {
    documentType: "nonrenewal_notice",
    pattern: /\b(nonrenewal|non-renewal|will not renew)\b/i,
  },
  {
    documentType: "declination_correspondence",
    pattern: /\b(declin(?:e|ed|ation)|no appetite)\b/i,
  },
  {
    documentType: "mitigation_discount_notice",
    pattern: /\b(mitigation discount|discount eligibility)\b/i,
  },
  {
    documentType: "risk_score_notice",
    pattern: /\b(risk score|hazard score|score notice)\b/i,
  },
  {
    documentType: "renewal_questionnaire",
    pattern: /\b(renewal questionnaire|questionnaire response)\b/i,
  },
  {
    documentType: "clarification_message",
    pattern: /\b(clarification|please clarify|follow-up question)\b/i,
  },
  {
    documentType: "evidence_request",
    pattern: /\b(evidence request|required evidence|please provide)\b/i,
  },
  {
    documentType: "underwriter_email",
    pattern: /\b(from:|subject:).*\b(underwriter|underwriting)\b/is,
  },
  {
    documentType: "carrier_notice",
    pattern: /\b(carrier notice|renewal notice|notice of renewal)\b/i,
  },
];

export class DeterministicDocumentClassifier implements DocumentClassifier {
  readonly key = "fortify-deterministic-document-classifier";
  readonly version = "1.0.0";

  classify(document: ProviderDocument): DocumentClassification {
    const text = document.passages.map((passage) => passage.text).join("\n");
    const matched = classificationRules.find((rule) => rule.pattern.test(text));
    return {
      documentType: matched?.documentType ?? "underwriter_email",
      confidence: matched ? 0.94 : 0.41,
      classifierKey: this.key,
      classifierVersion: this.version,
    };
  }
}

export interface CandidateField {
  fieldKey: string;
  fieldLabel: string;
  value: string;
  valueType: "text" | "date" | "number" | "code";
  confidence: number;
  passage: Pick<ProviderPassage, "pageNumber" | "segment">;
}

export interface VersionedDocumentExtractor {
  readonly key: string;
  readonly version: string;
  readonly modelDerived: boolean;
  supports(documentType: DocumentType): boolean;
  extract(input: {
    documentType: DocumentType;
    document: ProviderDocument;
  }): CandidateField[];
}

const extractionPatterns: Array<{
  fieldKey: string;
  fieldLabel: string;
  valueType: CandidateField["valueType"];
  pattern: RegExp;
}> = [
  { fieldKey: "sender", fieldLabel: "Sender", valueType: "text", pattern: /^(?:sender|from):\s*(.+)$/i },
  { fieldKey: "market", fieldLabel: "Market or carrier", valueType: "text", pattern: /^(?:market|carrier):\s*(.+)$/i },
  { fieldKey: "policy", fieldLabel: "Policy", valueType: "text", pattern: /^policy(?: number)?:\s*(.+)$/i },
  { fieldKey: "noticeDate", fieldLabel: "Notice date", valueType: "date", pattern: /^(?:notice )?date:\s*(\d{4}-\d{2}-\d{2})$/i },
  { fieldKey: "deadline", fieldLabel: "Deadline", valueType: "date", pattern: /^(?:appeal |response )?deadline:\s*(\d{4}-\d{2}-\d{2})$/i },
  { fieldKey: "carrierStatedScore", fieldLabel: "Carrier-stated score", valueType: "number", pattern: /^(?:risk |carrier-stated )?score:\s*(.+)$/i },
  { fieldKey: "classification", fieldLabel: "Stated classification", valueType: "text", pattern: /^classification:\s*(.+)$/i },
  { fieldKey: "statedRiskDrivers", fieldLabel: "Stated risk drivers", valueType: "text", pattern: /^(?:stated )?(?:risk )?drivers?:\s*(.+)$/i },
  { fieldKey: "requestedMitigation", fieldLabel: "Requested mitigation", valueType: "text", pattern: /^requested mitigation:\s*(.+)$/i },
  { fieldKey: "requiredEvidence", fieldLabel: "Required evidence", valueType: "text", pattern: /^(?:required evidence|evidence request|please provide):\s*(.+)$/i },
  { fieldKey: "appealRights", fieldLabel: "Appeal rights", valueType: "text", pattern: /^appeal rights?:\s*(.+)$/i },
  { fieldKey: "communicationHistory", fieldLabel: "Communication history", valueType: "text", pattern: /^(?:communication history|prior message):\s*(.+)$/i },
  { fieldKey: "reasonCode", fieldLabel: "Reason code", valueType: "code", pattern: /^reason code:\s*(.+)$/i },
];

export class DeterministicCorrespondenceExtractor
  implements VersionedDocumentExtractor
{
  readonly key = "fortify-correspondence-fields";
  readonly version = "1.0.0";
  readonly modelDerived = false;

  supports(documentType: DocumentType) {
    return DOCUMENT_TYPES.includes(documentType);
  }

  extract(input: { document: ProviderDocument }): CandidateField[] {
    const candidates: CandidateField[] = [];
    for (const passage of input.document.passages) {
      for (const definition of extractionPatterns) {
        const match = passage.text.match(definition.pattern);
        const value = match?.[1]?.trim();
        if (!value) continue;
        const uncertain = /\[uncertain\]|\?$/.test(value);
        candidates.push({
          fieldKey: definition.fieldKey,
          fieldLabel: definition.fieldLabel,
          value: value.replace(/\s*\[uncertain\]\s*/g, " ").trim(),
          valueType: definition.valueType,
          confidence: uncertain ? 0.42 : definition.valueType === "date" ? 0.97 : 0.92,
          passage: {
            pageNumber: passage.pageNumber,
            segment: passage.segment,
          },
        });
      }
    }
    return candidates;
  }
}
