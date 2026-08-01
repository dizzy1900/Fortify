import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const lifecycleValues = sql`lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold')`;

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    environment: text("environment").notNull(),
    synthetic: boolean("synthetic").notNull().default(false),
    crossCustomerAnalyticsOptIn: boolean("cross_customer_analytics_opt_in")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    revision: integer("revision").notNull().default(1),
    lifecycleStatus: text("lifecycle_status").notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("organizations_slug_unique").on(table.slug),
    check(
      "organizations_environment_check",
      sql`${table.environment} in ('production', 'sandbox')`,
    ),
    check("organizations_lifecycle_check", lifecycleValues),
    check(
      "organizations_sandbox_synthetic_check",
      sql`${table.environment} <> 'sandbox' or ${table.synthetic} = true`,
    ),
  ],
);

const tenantColumns = () => ({
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
  revision: integer("revision").notNull().default(1),
  lifecycleStatus: text("lifecycle_status").notNull().default("active"),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
});

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    identitySubject: text("identity_subject").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull().default("invited"),
    invitedAt: timestamp("invited_at", { withTimezone: true, mode: "string" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("memberships_org_subject_unique").on(
      table.organizationId,
      table.identitySubject,
    ),
    index("memberships_org_status_idx").on(table.organizationId, table.status),
    check("memberships_lifecycle_check", lifecycleValues),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("teams_org_name_unique").on(table.organizationId, table.name),
    check("teams_lifecycle_check", lifecycleValues),
  ],
);

export const books = pgTable(
  "books",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    name: text("name").notNull(),
    externalSystem: text("external_system"),
    externalId: text("external_id"),
  },
  (table) => [
    uniqueIndex("books_org_external_unique").on(
      table.organizationId,
      table.externalSystem,
      table.externalId,
    ),
    check("books_lifecycle_check", lifecycleValues),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    bookId: text("book_id").references(() => books.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    externalSystem: text("external_system"),
    externalId: text("external_id"),
  },
  (table) => [
    uniqueIndex("clients_org_external_unique").on(
      table.organizationId,
      table.externalSystem,
      table.externalId,
    ),
    index("clients_org_book_idx").on(table.organizationId, table.bookId),
    check("clients_lifecycle_check", lifecycleValues),
  ],
);

export const communities = pgTable(
  "communities",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    clientId: text("client_id").references(() => clients.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    propertyClass: text("property_class").notNull(),
    summary: text("summary").notNull().default(""),
    externalSystem: text("external_system"),
    externalId: text("external_id"),
  },
  (table) => [
    uniqueIndex("communities_org_external_unique").on(
      table.organizationId,
      table.externalSystem,
      table.externalId,
    ),
    index("communities_org_client_idx").on(
      table.organizationId,
      table.clientId,
    ),
    check("communities_lifecycle_check", lifecycleValues),
  ],
);

export const properties = pgTable(
  "properties",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    communityId: text("community_id").references(() => communities.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    propertyClass: text("property_class").notNull(),
    unitCount: integer("unit_count"),
    buildingCount: integer("building_count"),
  },
  (table) => [
    index("properties_org_community_idx").on(
      table.organizationId,
      table.communityId,
    ),
    check("properties_unit_count_check", sql`${table.unitCount} is null or ${table.unitCount} >= 0`),
    check(
      "properties_building_count_check",
      sql`${table.buildingCount} is null or ${table.buildingCount} >= 0`,
    ),
    check("properties_lifecycle_check", lifecycleValues),
  ],
);

export const propertyIdentifiers = pgTable(
  "property_identifiers",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    source: text("source").notNull(),
    identifierType: text("identifier_type").notNull(),
    value: text("value").notNull(),
    reviewStatus: text("review_status").notNull().default("confirmed"),
  },
  (table) => [
    uniqueIndex("property_identifiers_org_source_value_unique").on(
      table.organizationId,
      table.source,
      table.identifierType,
      table.value,
    ),
    check("property_identifiers_lifecycle_check", lifecycleValues),
  ],
);

export const locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    addressLine1: text("address_line_1").notNull(),
    city: text("city"),
    region: text("region").notNull(),
    postalCode: text("postal_code"),
    county: text("county"),
    countryCode: text("country_code").notNull().default("US"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    normalizationStatus: text("normalization_status")
      .notNull()
      .default("unreviewed"),
  },
  (table) => [
    index("locations_org_property_idx").on(
      table.organizationId,
      table.propertyId,
    ),
    check("locations_lifecycle_check", lifecycleValues),
  ],
);

export const buildings = pgTable(
  "buildings",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    label: text("label").notNull(),
    constructionYear: integer("construction_year"),
  },
  (table) => [
    uniqueIndex("buildings_org_property_label_unique").on(
      table.organizationId,
      table.propertyId,
      table.label,
    ),
    check("buildings_lifecycle_check", lifecycleValues),
  ],
);

export const markets = pgTable(
  "markets",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    name: text("name").notNull(),
    marketType: text("market_type").notNull(),
    synthetic: boolean("synthetic").notNull().default(false),
  },
  (table) => [
    uniqueIndex("markets_org_name_unique").on(table.organizationId, table.name),
    check("markets_lifecycle_check", lifecycleValues),
  ],
);

export const programs = pgTable(
  "programs",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    marketId: text("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    peril: text("peril").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    propertyClass: text("property_class").notNull(),
  },
  (table) => [
    uniqueIndex("programs_org_market_name_unique").on(
      table.organizationId,
      table.marketId,
      table.name,
    ),
    check("programs_lifecycle_check", lifecycleValues),
  ],
);

export const policies = pgTable(
  "policies",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    marketId: text("market_id").references(() => markets.id, {
      onDelete: "restrict",
    }),
    programId: text("program_id").references(() => programs.id, {
      onDelete: "restrict",
    }),
    policyNumber: text("policy_number").notNull(),
    effectiveDate: date("effective_date", { mode: "string" }),
    expirationDate: date("expiration_date", { mode: "string" }).notNull(),
    currency: text("currency").notNull().default("USD"),
    premiumMinor: integer("premium_minor"),
    sourceAuthority: text("source_authority").notNull().default("broker"),
  },
  (table) => [
    uniqueIndex("policies_org_number_expiry_unique").on(
      table.organizationId,
      table.policyNumber,
      table.expirationDate,
    ),
    check("policies_lifecycle_check", lifecycleValues),
  ],
);

export const renewalCases = pgTable(
  "renewal_cases",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    status: text("status").notNull(),
    caseType: text("case_type").notNull().default("renewal"),
    peril: text("peril").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    propertyClass: text("property_class").notNull(),
    renewalDate: date("renewal_date", { mode: "string" }).notNull(),
    appealDeadline: date("appeal_deadline", { mode: "string" }),
    ownerSubject: text("owner_subject"),
  },
  (table) => [
    index("renewal_cases_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    check("renewal_cases_lifecycle_check", lifecycleValues),
  ],
);

export const sourceDocuments = pgTable(
  "source_documents",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    caseId: text("case_id").references(() => renewalCases.id, {
      onDelete: "restrict",
    }),
    documentType: text("document_type").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    storageKey: text("storage_key"),
    sha256: text("sha256"),
    sourceSystem: text("source_system").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .notNull(),
    processingStatus: text("processing_status").notNull(),
    synthetic: boolean("synthetic").notNull().default(false),
  },
  (table) => [
    index("source_documents_org_case_idx").on(
      table.organizationId,
      table.caseId,
    ),
    uniqueIndex("source_documents_org_hash_unique").on(
      table.organizationId,
      table.sha256,
    ),
    check("source_documents_lifecycle_check", lifecycleValues),
  ],
);

export const sourcePassages = pgTable(
  "source_passages",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "restrict" }),
    pageNumber: integer("page_number"),
    segment: text("segment"),
    textContent: text("text_content").notNull(),
    extractorVersion: text("extractor_version").notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    confirmationStatus: text("confirmation_status")
      .notNull()
      .default("unreviewed"),
    confirmedBy: text("confirmed_by"),
    confirmedAt: timestamp("confirmed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("source_passages_org_document_idx").on(
      table.organizationId,
      table.sourceDocumentId,
    ),
    check("source_passages_lifecycle_check", lifecycleValues),
  ],
);

export const requirementSets = pgTable(
  "requirement_sets",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    marketId: text("market_id").references(() => markets.id, {
      onDelete: "restrict",
    }),
    programId: text("program_id").references(() => programs.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    peril: text("peril").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    propertyClass: text("property_class").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    verifyCurrent: boolean("verify_current").notNull().default(true),
  },
  (table) => [
    index("requirement_sets_org_scope_idx").on(
      table.organizationId,
      table.peril,
      table.jurisdiction,
      table.propertyClass,
    ),
    check("requirement_sets_lifecycle_check", lifecycleValues),
  ],
);

export const requirements = pgTable(
  "requirements",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    requirementSetId: text("requirement_set_id")
      .notNull()
      .references(() => requirementSets.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    scopeType: text("scope_type").notNull(),
    importance: text("importance").notNull().default("required"),
    blocking: boolean("blocking").notNull().default(false),
  },
  (table) => [
    uniqueIndex("requirements_org_set_code_unique").on(
      table.organizationId,
      table.requirementSetId,
      table.code,
    ),
    check("requirements_lifecycle_check", lifecycleValues),
  ],
);

export const requirementVersions = pgTable(
  "requirement_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    requirementId: text("requirement_id")
      .notNull()
      .references(() => requirements.id, { onDelete: "restrict" }),
    version: text("version").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    summary: text("summary").notNull(),
    sourceUrl: text("source_url").notNull(),
    contentHash: text("content_hash").notNull(),
    supersedesId: text("supersedes_id"),
  },
  (table) => [
    uniqueIndex("requirement_versions_org_requirement_version_unique").on(
      table.organizationId,
      table.requirementId,
      table.version,
    ),
    check("requirement_versions_lifecycle_check", lifecycleValues),
  ],
);

export const evidenceItems = pgTable(
  "evidence_items",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    evidenceType: text("evidence_type").notNull(),
    currentVersionId: text("current_version_id"),
  },
  (table) => [
    index("evidence_items_org_property_idx").on(
      table.organizationId,
      table.propertyId,
    ),
    check("evidence_items_lifecycle_check", lifecycleValues),
  ],
);

export const evidenceVersions = pgTable(
  "evidence_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    evidenceItemId: text("evidence_item_id")
      .notNull()
      .references(() => evidenceItems.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    storageKey: text("storage_key").notNull(),
    sourceType: text("source_type").notNull(),
    sourceOrganization: text("source_organization"),
    captureDate: date("capture_date", { mode: "string" }),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    scopeType: text("scope_type").notNull(),
    scopeReference: text("scope_reference"),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    reviewStatus: text("review_status").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
    supersedesId: text("supersedes_id"),
  },
  (table) => [
    uniqueIndex("evidence_versions_org_item_version_unique").on(
      table.organizationId,
      table.evidenceItemId,
      table.versionNumber,
    ),
    uniqueIndex("evidence_versions_org_hash_unique").on(
      table.organizationId,
      table.sha256,
    ),
    check("evidence_versions_size_check", sql`${table.sizeBytes} > 0`),
    check("evidence_versions_lifecycle_check", lifecycleValues),
  ],
);

export const evidenceRequirementLinks = pgTable(
  "evidence_requirement_links",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    caseId: text("case_id")
      .notNull()
      .references(() => renewalCases.id, { onDelete: "restrict" }),
    evidenceVersionId: text("evidence_version_id")
      .notNull()
      .references(() => evidenceVersions.id, { onDelete: "restrict" }),
    requirementVersionId: text("requirement_version_id")
      .notNull()
      .references(() => requirementVersions.id, { onDelete: "restrict" }),
    scopeStatus: text("scope_status").notNull(),
    freshnessStatus: text("freshness_status").notNull(),
    reviewStatus: text("review_status").notNull(),
    disposition: text("disposition").notNull(),
  },
  (table) => [
    uniqueIndex("evidence_requirement_links_unique").on(
      table.organizationId,
      table.caseId,
      table.evidenceVersionId,
      table.requirementVersionId,
    ),
    check("evidence_requirement_links_lifecycle_check", lifecycleValues),
  ],
);

export const contradictions = pgTable(
  "contradictions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    caseId: text("case_id")
      .notNull()
      .references(() => renewalCases.id, { onDelete: "restrict" }),
    leftEvidenceVersionId: text("left_evidence_version_id")
      .notNull()
      .references(() => evidenceVersions.id, { onDelete: "restrict" }),
    rightEvidenceVersionId: text("right_evidence_version_id")
      .notNull()
      .references(() => evidenceVersions.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("open"),
    resolution: text("resolution"),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("contradictions_org_pair_unique").on(
      table.organizationId,
      table.leftEvidenceVersionId,
      table.rightEvidenceVersionId,
    ),
    check("contradictions_lifecycle_check", lifecycleValues),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    caseId: text("case_id")
      .notNull()
      .references(() => renewalCases.id, { onDelete: "restrict" }),
    requirementId: text("requirement_id").references(() => requirements.id, {
      onDelete: "restrict",
    }),
    title: text("title").notNull(),
    ownerSubject: text("owner_subject"),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }),
    status: text("status").notNull(),
  },
  (table) => [
    index("tasks_org_case_status_idx").on(
      table.organizationId,
      table.caseId,
      table.status,
    ),
    check("tasks_lifecycle_check", lifecycleValues),
  ],
);

export const submissions = pgTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    caseId: text("case_id")
      .notNull()
      .references(() => renewalCases.id, { onDelete: "restrict" }),
    marketId: text("market_id").references(() => markets.id, {
      onDelete: "restrict",
    }),
    purpose: text("purpose").notNull(),
    status: text("status").notNull(),
    currentVersionId: text("current_version_id"),
  },
  (table) => [
    index("submissions_org_case_idx").on(table.organizationId, table.caseId),
    check("submissions_lifecycle_check", lifecycleValues),
  ],
);

export const submissionVersions = pgTable(
  "submission_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull(),
    message: text("message").notNull(),
    caveats: jsonb("caveats").$type<string[]>().notNull().default([]),
    confirmedBy: text("confirmed_by"),
    confirmedAt: timestamp("confirmed_at", {
      withTimezone: true,
      mode: "string",
    }),
    manifestHash: text("manifest_hash"),
  },
  (table) => [
    uniqueIndex("submission_versions_org_submission_version_unique").on(
      table.organizationId,
      table.submissionId,
      table.versionNumber,
    ),
    check("submission_versions_lifecycle_check", lifecycleValues),
  ],
);

export const submissionItems = pgTable(
  "submission_items",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    submissionVersionId: text("submission_version_id")
      .notNull()
      .references(() => submissionVersions.id, { onDelete: "restrict" }),
    evidenceVersionId: text("evidence_version_id")
      .notNull()
      .references(() => evidenceVersions.id, { onDelete: "restrict" }),
    exhibitLabel: text("exhibit_label").notNull(),
  },
  (table) => [
    uniqueIndex("submission_items_org_version_evidence_unique").on(
      table.organizationId,
      table.submissionVersionId,
      table.evidenceVersionId,
    ),
    check("submission_items_lifecycle_check", lifecycleValues),
  ],
);

export const marketResponses = pgTable(
  "market_responses",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    submissionVersionId: text("submission_version_id")
      .notNull()
      .references(() => submissionVersions.id, { onDelete: "restrict" }),
    responseType: text("response_type").notNull(),
    originalLanguage: text("original_language").notNull(),
    normalizedReason: text("normalized_reason"),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .notNull(),
    supersedesId: text("supersedes_id"),
  },
  (table) => [
    index("market_responses_org_submission_idx").on(
      table.organizationId,
      table.submissionVersionId,
    ),
    check("market_responses_lifecycle_check", lifecycleValues),
  ],
);

export const renewalOutcomes = pgTable(
  "renewal_outcomes",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    caseId: text("case_id")
      .notNull()
      .references(() => renewalCases.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    originalLanguage: text("original_language").notNull(),
    normalizedReason: text("normalized_reason"),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "string" })
      .notNull(),
    synthetic: boolean("synthetic").notNull().default(false),
    supersedesId: text("supersedes_id"),
  },
  (table) => [
    index("renewal_outcomes_org_case_idx").on(
      table.organizationId,
      table.caseId,
    ),
    check("renewal_outcomes_lifecycle_check", lifecycleValues),
  ],
);

export const maintenanceEvents = pgTable(
  "maintenance_events",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "string" })
      .notNull(),
    recurrenceRule: text("recurrence_rule"),
    status: text("status").notNull(),
  },
  (table) => [
    index("maintenance_events_org_property_idx").on(
      table.organizationId,
      table.propertyId,
    ),
    check("maintenance_events_lifecycle_check", lifecycleValues),
  ],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseJson: jsonb("response_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("idempotency_keys_org_scope_key_unique").on(
      table.organizationId,
      table.scope,
      table.key,
    ),
    check("idempotency_keys_lifecycle_check", lifecycleValues),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    actorSubject: text("actor_subject").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull(),
    previousHash: text("previous_hash"),
    eventHash: text("event_hash").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("audit_events_org_hash_unique").on(
      table.organizationId,
      table.eventHash,
    ),
    index("audit_events_org_resource_idx").on(
      table.organizationId,
      table.resourceType,
      table.resourceId,
      table.occurredAt,
    ),
  ],
);
