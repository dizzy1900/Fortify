import { parse as parseCsv } from "csv-parse/sync";
import { Readable } from "node:stream";
import { readSheet, type Row } from "read-excel-file/node";

export const importSchemaVersion = "fortify-property-import-v1";

export const canonicalImportFields = [
  "externalClientId",
  "clientName",
  "externalCommunityId",
  "communityName",
  "externalPropertyId",
  "propertyName",
  "propertyClass",
  "addressLine1",
  "city",
  "region",
  "postalCode",
  "county",
  "buildingLabel",
  "constructionYear",
  "unitCount",
  "buildingCount",
  "policyNumber",
  "effectiveDate",
  "expirationDate",
  "currency",
] as const;

export type CanonicalImportField = (typeof canonicalImportFields)[number];
export type ImportColumnMapping = Partial<Record<CanonicalImportField, string>>;
export type ImportConstants = Partial<Record<CanonicalImportField, string>>;
export type TabularCell = string | number | boolean | Date | null;

export interface ParsedTabularFile {
  headers: string[];
  rows: Array<{ rowNumber: number; values: Record<string, TabularCell> }>;
  sheetName?: string;
}

export interface NormalizedPortfolioRow {
  externalClientId?: string;
  clientName: string;
  externalCommunityId?: string;
  communityName: string;
  externalPropertyId: string;
  propertyName: string;
  propertyClass: string;
  addressLine1: string;
  city?: string;
  region: string;
  postalCode?: string;
  county?: string;
  normalizedAddress: string;
  buildingLabel?: string;
  constructionYear?: number;
  unitCount?: number;
  buildingCount?: number;
  policyNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
  currency: string;
}

export interface PortfolioImportAdapter {
  readonly sourceSystem: string;
  readonly displayName: string;
  readonly externalValidationGate: string;
  suggestMapping(headers: string[]): ImportColumnMapping;
}

const aliases: Record<CanonicalImportField, string[]> = {
  externalClientId: ["client id", "client code", "customer number", "customernumber"],
  clientName: ["client name", "named insured", "customer name", "customername"],
  externalCommunityId: ["community id", "association id", "account number"],
  communityName: ["community name", "association name", "location name"],
  externalPropertyId: ["property id", "location id", "location code", "locationid"],
  propertyName: ["property name", "location name", "insured location"],
  propertyClass: ["property class", "occupancy", "class"],
  addressLine1: ["address", "address 1", "address1", "location address 1"],
  city: ["city", "location city"],
  region: ["state", "region", "location state"],
  postalCode: ["zip", "zip code", "zipcode", "postal code", "location zip"],
  county: ["county"],
  buildingLabel: ["building", "building id", "building number", "buildingid"],
  constructionYear: ["year built", "construction year"],
  unitCount: ["units", "unit count", "unitcount"],
  buildingCount: ["buildings", "building count"],
  policyNumber: ["policy number", "policynumber"],
  effectiveDate: ["effective date", "policy effective date"],
  expirationDate: ["expiration date", "policy expiration date", "policyexpirationdate"],
  currency: ["currency", "currency code", "currencycode"],
};

function normalizedHeader(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function suggestFromAliases(headers: string[], overrides: ImportColumnMapping = {}) {
  const indexed = new Map(headers.map((header) => [normalizedHeader(header), header]));
  const mapping: ImportColumnMapping = { ...overrides };
  for (const field of canonicalImportFields) {
    if (mapping[field]) continue;
    const match = aliases[field]
      .map((alias) => indexed.get(normalizedHeader(alias)))
      .find(Boolean);
    if (match) mapping[field] = match;
  }
  return mapping;
}

export const genericAmsCsvAdapter: PortfolioImportAdapter = {
  sourceSystem: "generic_ams_csv",
  displayName: "Generic AMS or SOV export",
  externalValidationGate:
    "Validate the saved mapping against a rights-cleared export from the brokerage's authoritative system before production use.",
  suggestMapping: (headers) => suggestFromAliases(headers),
};

export const appliedEpicFixtureAdapter: PortfolioImportAdapter = {
  sourceSystem: "applied_epic_fixture",
  displayName: "Applied Epic-compatible fixture",
  externalValidationGate:
    "No customer Applied Epic export is present. Confirm headers, semantics, authority, and round-trip expectations with a rights-cleared brokerage export; this fixture is not a vendor certification.",
  suggestMapping: (headers) =>
    suggestFromAliases(headers, {
      externalClientId: headers.find((header) => normalizedHeader(header) === "client code"),
      clientName: headers.find((header) => normalizedHeader(header) === "named insured"),
      externalPropertyId: headers.find((header) => normalizedHeader(header) === "location code"),
    }),
};

export const ams360FixtureAdapter: PortfolioImportAdapter = {
  sourceSystem: "ams360_fixture",
  displayName: "AMS360-compatible fixture",
  externalValidationGate:
    "No customer AMS360 export is present. Confirm headers, semantics, authority, and round-trip expectations with a rights-cleared brokerage export; this fixture is not a vendor certification.",
  suggestMapping: (headers) =>
    suggestFromAliases(headers, {
      externalClientId: headers.find((header) => normalizedHeader(header) === "customernumber"),
      clientName: headers.find((header) => normalizedHeader(header) === "customername"),
      externalPropertyId: headers.find((header) => normalizedHeader(header) === "locationid"),
    }),
};

export const portfolioImportAdapters = [
  genericAmsCsvAdapter,
  appliedEpicFixtureAdapter,
  ams360FixtureAdapter,
] as const;

export function getPortfolioImportAdapter(sourceSystem: string) {
  const adapter = portfolioImportAdapters.find(
    (candidate) => candidate.sourceSystem === sourceSystem,
  );
  if (!adapter) throw new Error("The requested portfolio import adapter is not registered.");
  return adapter;
}

function stringifyCell(value: TabularCell) {
  if (value === null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).normalize("NFKC").trim();
}

function rowsToRecords(rows: Row[], headerRow: number, sheetName?: string): ParsedTabularFile {
  if (!Number.isSafeInteger(headerRow) || headerRow < 1)
    throw new Error("Header row must be a positive integer.");
  if (rows.length < headerRow) throw new Error("The configured header row is absent.");
  const headers = rows[headerRow - 1].map((value) => stringifyCell(value as TabularCell));
  if (!headers.length || headers.every((header) => !header))
    throw new Error("The configured header row is empty.");
  if (headers.length > 200) throw new Error("Imports are limited to 200 columns.");
  if (headers.some((header) => !header))
    throw new Error("Every populated import column requires a header.");
  const unique = new Set(headers.map(normalizedHeader));
  if (unique.size !== headers.length) throw new Error("Import headers must be unique.");
  const dataRows = rows
    .slice(headerRow)
    .map((row, index) => ({ row, rowNumber: headerRow + index + 1 }))
    .filter(({ row }) =>
      row.some((value) => stringifyCell(value as TabularCell) !== ""),
    );
  if (dataRows.length > 10_000) throw new Error("Imports are limited to 10,000 data rows.");
  return {
    headers,
    sheetName,
    rows: dataRows.map(({ row, rowNumber }) => ({
      rowNumber,
      values: Object.fromEntries(
        headers.map((header, columnIndex) => [
          header,
          (row[columnIndex] ?? null) as TabularCell,
        ]),
      ),
    })),
  };
}

export async function parseTabularFile(input: {
  body: Uint8Array;
  format: "csv" | "xlsx";
  headerRow?: number;
  sheetName?: string;
}) {
  const headerRow = input.headerRow ?? 1;
  if (input.format === "csv") {
    const rows = parseCsv(Buffer.from(input.body), {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: false,
    }) as string[][];
    return rowsToRecords(rows, headerRow);
  }
  const rows = await readSheet(
    Readable.from([Buffer.from(input.body)]),
    input.sheetName,
  );
  return rowsToRecords(rows, headerRow, input.sheetName);
}

function mappedValue(
  raw: Record<string, TabularCell>,
  field: CanonicalImportField,
  mapping: ImportColumnMapping,
  constants: ImportConstants,
) {
  const constant = constants[field];
  if (constant !== undefined && constant.trim() !== "") return constant.trim();
  const header = mapping[field];
  if (!header) return "";
  return stringifyCell(raw[header] ?? null);
}

function parseOptionalInteger(value: string, label: string, errors: string[]) {
  if (!value) return undefined;
  if (!/^-?\d+$/.test(value)) {
    errors.push(`${label} must be a whole number.`);
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    errors.push(`${label} must be a non-negative whole number.`);
    return undefined;
  }
  return parsed;
}

function parseDate(value: string, label: string, errors: string[]) {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    errors.push(`${label} must use YYYY-MM-DD.`);
    return undefined;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    errors.push(`${label} is not a valid calendar date.`);
    return undefined;
  }
  return value;
}

export function normalizeAddress(input: {
  addressLine1: string;
  city?: string;
  region: string;
  postalCode?: string;
}) {
  return [input.addressLine1, input.city, input.region, input.postalCode]
    .filter(Boolean)
    .join(" ")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\broad\b/g, "rd")
    .replace(/\bboulevard\b/g, "blvd")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizePortfolioRow(
  raw: Record<string, TabularCell>,
  mapping: ImportColumnMapping,
  constants: ImportConstants = {},
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const value = (field: CanonicalImportField) =>
    mappedValue(raw, field, mapping, constants);
  const required = (
    field: CanonicalImportField,
    label: string,
  ) => {
    const result = value(field);
    if (!result) errors.push(`${label} is required.`);
    return result;
  };
  const externalPropertyId = required("externalPropertyId", "External property ID");
  const clientName = required("clientName", "Client name");
  const communityName = required("communityName", "Community name");
  const propertyName = required("propertyName", "Property name");
  const propertyClass = required("propertyClass", "Property class")
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  const addressLine1 = required("addressLine1", "Address line 1");
  const region = required("region", "State or region").toUpperCase();
  const city = value("city") || undefined;
  const postalCode = value("postalCode") || undefined;
  const currency = (value("currency") || "USD").toUpperCase();
  const supportedCurrencies = new Set(Intl.supportedValuesOf("currency"));
  if (!supportedCurrencies.has(currency)) errors.push("Currency must be a valid ISO 4217 code.");
  const unitCount = parseOptionalInteger(value("unitCount"), "Unit count", errors);
  const buildingCount = parseOptionalInteger(
    value("buildingCount"),
    "Building count",
    errors,
  );
  const constructionYear = parseOptionalInteger(
    value("constructionYear"),
    "Construction year",
    errors,
  );
  if (
    constructionYear !== undefined &&
    (constructionYear < 1700 || constructionYear > new Date().getUTCFullYear() + 1)
  )
    errors.push("Construction year is outside the supported range.");
  const policyNumber = value("policyNumber") || undefined;
  const effectiveDate = parseDate(value("effectiveDate"), "Effective date", errors);
  const expirationDate = parseDate(value("expirationDate"), "Expiration date", errors);
  if ((policyNumber && !expirationDate) || (!policyNumber && expirationDate))
    errors.push("Policy number and expiration date must be supplied together.");
  if (policyNumber && !value("currency"))
    warnings.push("Currency was absent and defaulted to USD.");
  if (!value("externalClientId"))
    warnings.push("Client has no stable external ID; it will be grouped only within this import.");
  if (!value("externalCommunityId"))
    warnings.push("Community has no stable external ID; it will be grouped only within this import.");
  if (!value("buildingLabel") && buildingCount && buildingCount > 1)
    warnings.push("Multiple buildings were declared without row-level building labels.");

  const normalized: NormalizedPortfolioRow = {
    externalClientId: value("externalClientId") || undefined,
    clientName,
    externalCommunityId: value("externalCommunityId") || undefined,
    communityName,
    externalPropertyId,
    propertyName,
    propertyClass,
    addressLine1,
    city,
    region,
    postalCode,
    county: value("county") || undefined,
    normalizedAddress: normalizeAddress({
      addressLine1,
      city,
      region,
      postalCode,
    }),
    buildingLabel: value("buildingLabel") || undefined,
    constructionYear,
    unitCount,
    buildingCount,
    policyNumber,
    effectiveDate,
    expirationDate,
    currency,
  };
  return { normalized, errors, warnings };
}
