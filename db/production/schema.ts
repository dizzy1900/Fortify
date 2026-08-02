import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
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

export const identities = pgTable(
  "identities",
  {
    id: text("id").primaryKey(),
    providerKey: text("provider_key").notNull(),
    providerSubject: text("provider_subject").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    displayName: text("display_name").notNull(),
    mfaCapable: boolean("mfa_capable").notNull().default(false),
    lastAuthenticatedAt: timestamp("last_authenticated_at", {
      withTimezone: true,
      mode: "string",
    }),
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
    uniqueIndex("identities_provider_subject_unique").on(
      table.providerKey,
      table.providerSubject,
    ),
    index("identities_email_idx").on(table.email),
    check("identities_lifecycle_check", lifecycleValues),
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

const governedGraphColumns = () => ({
  sourceSystem: text("source_system").notNull().default("manual"),
  sourceRecordId: text("source_record_id"),
  effectiveFrom: date("effective_from", { mode: "string" }),
  effectiveTo: date("effective_to", { mode: "string" }),
  confidentialityState: text("confidentiality_state")
    .notNull()
    .default("tenant_confidential"),
  dataRightClass: text("data_right_class")
    .notNull()
    .default("property_specific_data"),
  rightsVerified: boolean("rights_verified").notNull().default(false),
});

const governedGraphChecks = (table: {
  effectiveFrom: AnyPgColumn;
  effectiveTo: AnyPgColumn;
  confidentialityState: AnyPgColumn;
  dataRightClass: AnyPgColumn;
}) => [
  check(
    `${table.effectiveFrom.name.replace("effective_from", "governed")}_effective_period_check`,
    sql`${table.effectiveTo} is null or ${table.effectiveFrom} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
  ),
  check(
    `${table.confidentialityState.name.replace("confidentiality_state", "governed")}_confidentiality_check`,
    sql`${table.confidentialityState} in ('public', 'tenant_confidential', 'carrier_confidential', 'restricted')`,
  ),
  check(
    `${table.dataRightClass.name.replace("data_right_class", "governed")}_data_right_check`,
    sql`${table.dataRightClass} in ('raw_customer_document', 'personally_identifiable', 'property_specific_data', 'carrier_confidential_material', 'customer_specific_playbook', 'fortify_generic_ontology', 'software_telemetry', 'deidentified_derived_event', 'cross_customer_benchmark', 'model_provider_restricted')`,
  ),
];

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    identityId: text("identity_id").references(() => identities.id, {
      onDelete: "restrict",
    }),
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
    check(
      "memberships_role_check",
      sql`${table.role} in ('organization_owner', 'brokerage_administrator', 'practice_leader', 'broker', 'marketer', 'assistant', 'property_operator_administrator', 'property_manager', 'client_property_manager', 'board_contributor', 'contractor_evidence_contributor', 'evidence_contributor', 'independent_verifier', 'programme_administrator', 'insurer_mga_reviewer', 'underwriter_reviewer', 'lender_funder_reviewer', 'read_only_auditor')`,
    ),
    check(
      "memberships_status_check",
      sql`${table.status} in ('invited', 'active', 'suspended', 'revoked')`,
    ),
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

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    identityId: text("identity_id")
      .notNull()
      .references(() => identities.id, { onDelete: "restrict" }),
    activeOrganizationId: text("active_organization_id").references(
      () => organizations.id,
      { onDelete: "restrict" },
    ),
    tokenHash: text("token_hash").notNull(),
    authenticationMethod: text("authentication_method").notNull(),
    authenticationMethods: jsonb("authentication_methods")
      .$type<string[]>()
      .notNull()
      .default([]),
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
    revocationReason: text("revocation_reason"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_identity_expiry_idx").on(
      table.identityId,
      table.expiresAt,
    ),
    index("sessions_org_expiry_idx").on(
      table.activeOrganizationId,
      table.expiresAt,
    ),
  ],
);

export const authenticationAttempts = pgTable(
  "authentication_attempts",
  {
    id: text("id").primaryKey(),
    providerKey: text("provider_key").notNull(),
    activeOrganizationId: text("active_organization_id").references(
      () => organizations.id,
      { onDelete: "restrict" },
    ),
    invitationId: text("invitation_id"),
    stateHash: text("state_hash").notNull(),
    nonce: text("nonce").notNull(),
    pkceVerifier: text("pkce_verifier").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    returnTo: text("return_to").notNull().default("/portfolio"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("authentication_attempts_state_unique").on(table.stateHash),
    index("authentication_attempts_expiry_idx").on(table.expiresAt),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    membershipId: text("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "string" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("invitations_token_hash_unique").on(table.tokenHash),
    index("invitations_org_email_idx").on(table.organizationId, table.email),
    check("invitations_lifecycle_check", lifecycleValues),
  ],
);

export const teamMemberships = pgTable(
  "team_memberships",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "restrict" }),
    membershipId: text("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("team_memberships_org_team_member_unique").on(
      table.organizationId,
      table.teamId,
      table.membershipId,
    ),
    check("team_memberships_lifecycle_check", lifecycleValues),
  ],
);

export const externalPrincipals = pgTable(
  "external_principals",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    identityId: text("identity_id").references(() => identities.id, {
      onDelete: "restrict",
    }),
    principalType: text("principal_type").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("invited"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("external_principals_org_email_idx").on(
      table.organizationId,
      table.email,
    ),
    check(
      "external_principals_type_check",
      sql`${table.principalType} in ('external_collaborator', 'external_reviewer')`,
    ),
    check(
      "external_principals_status_check",
      sql`${table.status} in ('invited', 'active', 'revoked', 'expired')`,
    ),
    check("external_principals_lifecycle_check", lifecycleValues),
  ],
);

export const serviceAccounts = pgTable(
  "service_accounts",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    subject: text("subject").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("service_accounts_org_subject_unique").on(
      table.organizationId,
      table.subject,
    ),
    check(
      "service_accounts_status_check",
      sql`${table.status} in ('active', 'suspended', 'revoked')`,
    ),
    check("service_accounts_lifecycle_check", lifecycleValues),
  ],
);

export const apiCredentials = pgTable(
  "api_credentials",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    serviceAccountId: text("service_account_id")
      .notNull()
      .references(() => serviceAccounts.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    credentialPrefix: text("credential_prefix").notNull(),
    secretHash: text("secret_hash").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    lastUsedAt: timestamp("last_used_at", {
      withTimezone: true,
      mode: "string",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("api_credentials_prefix_unique").on(table.credentialPrefix),
    index("api_credentials_org_service_idx").on(
      table.organizationId,
      table.serviceAccountId,
    ),
    check("api_credentials_lifecycle_check", lifecycleValues),
  ],
);

export const supportAccessGrants = pgTable(
  "support_access_grants",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    supportIdentityId: text("support_identity_id")
      .notNull()
      .references(() => identities.id, { onDelete: "restrict" }),
    approvedByMembershipId: text("approved_by_membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("support_access_grants_org_identity_idx").on(
      table.organizationId,
      table.supportIdentityId,
      table.expiresAt,
    ),
    check("support_access_grants_lifecycle_check", lifecycleValues),
  ],
);

export const storageObjects = pgTable(
  "storage_objects",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    provider: text("provider").notNull(),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    checksumAlgorithm: text("checksum_algorithm").notNull().default("sha256"),
    encryptionMode: text("encryption_mode").notNull(),
    encryptionKeyId: text("encryption_key_id"),
    state: text("state").notNull().default("pending_upload"),
    scanStatus: text("scan_status").notNull().default("pending"),
    retentionUntil: timestamp("retention_until", {
      withTimezone: true,
      mode: "string",
    }),
    legalHold: boolean("legal_hold").notNull().default(false),
    legalHoldReason: text("legal_hold_reason"),
    backedUpAt: timestamp("backed_up_at", {
      withTimezone: true,
      mode: "string",
    }),
    deletedReason: text("deleted_reason"),
  },
  (table) => [
    uniqueIndex("storage_objects_org_key_unique").on(
      table.organizationId,
      table.objectKey,
    ),
    index("storage_objects_org_state_idx").on(
      table.organizationId,
      table.state,
      table.scanStatus,
    ),
    check("storage_objects_size_check", sql`${table.sizeBytes} > 0`),
    check(
      "storage_objects_state_check",
      sql`${table.state} in ('pending_upload', 'quarantined', 'scanning', 'clean', 'rejected', 'pending_deletion', 'deleted')`,
    ),
    check(
      "storage_objects_scan_check",
      sql`${table.scanStatus} in ('pending', 'scanning', 'clean', 'infected', 'error')`,
    ),
    check(
      "storage_objects_encryption_check",
      sql`${table.encryptionMode} in ('AES256', 'aws:kms')`,
    ),
    check("storage_objects_lifecycle_check", lifecycleValues),
  ],
);

export const storageAccessGrants = pgTable(
  "storage_access_grants",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    storageObjectId: text("storage_object_id")
      .notNull()
      .references(() => storageObjects.id, { onDelete: "restrict" }),
    operation: text("operation").notNull(),
    purpose: text("purpose").notNull(),
    principalSubject: text("principal_subject").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "string" }),
    maxUses: integer("max_uses").notNull().default(1),
    useCount: integer("use_count").notNull().default(0),
  },
  (table) => [
    index("storage_access_grants_org_object_idx").on(
      table.organizationId,
      table.storageObjectId,
      table.expiresAt,
    ),
    check(
      "storage_access_grants_operation_check",
      sql`${table.operation} in ('upload', 'download')`,
    ),
    check(
      "storage_access_grants_use_check",
      sql`${table.maxUses} > 0 and ${table.useCount} >= 0 and ${table.useCount} <= ${table.maxUses}`,
    ),
    check("storage_access_grants_lifecycle_check", lifecycleValues),
  ],
);

export const malwareScanResults = pgTable(
  "malware_scan_results",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    storageObjectId: text("storage_object_id")
      .notNull()
      .references(() => storageObjects.id, { onDelete: "restrict" }),
    scanner: text("scanner").notNull(),
    engineVersion: text("engine_version").notNull(),
    status: text("status").notNull(),
    findings: jsonb("findings").$type<string[]>().notNull().default([]),
    scannedAt: timestamp("scanned_at", { withTimezone: true, mode: "string" })
      .notNull(),
    supersedesId: text("supersedes_id"),
  },
  (table) => [
    index("malware_scan_results_org_object_idx").on(
      table.organizationId,
      table.storageObjectId,
      table.scannedAt,
    ),
    check(
      "malware_scan_results_status_check",
      sql`${table.status} in ('clean', 'infected', 'error')`,
    ),
    check("malware_scan_results_lifecycle_check", lifecycleValues),
  ],
);

export const backupManifests = pgTable(
  "backup_manifests",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    provider: text("provider").notNull(),
    status: text("status").notNull().default("building"),
    objectCount: integer("object_count").notNull().default(0),
    totalBytes: integer("total_bytes").notNull().default(0),
    manifestHash: text("manifest_hash"),
    storageKey: text("storage_key"),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("backup_manifests_org_status_idx").on(
      table.organizationId,
      table.status,
      table.createdAt,
    ),
    check(
      "backup_manifests_status_check",
      sql`${table.status} in ('building', 'complete', 'failed')`,
    ),
    check("backup_manifests_lifecycle_check", lifecycleValues),
  ],
);

export const backupManifestItems = pgTable(
  "backup_manifest_items",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    backupManifestId: text("backup_manifest_id")
      .notNull()
      .references(() => backupManifests.id, { onDelete: "restrict" }),
    storageObjectId: text("storage_object_id")
      .notNull()
      .references(() => storageObjects.id, { onDelete: "restrict" }),
    sourceKey: text("source_key").notNull(),
    backupKey: text("backup_key").notNull(),
    sha256: text("sha256").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
  },
  (table) => [
    uniqueIndex("backup_manifest_items_org_manifest_object_unique").on(
      table.organizationId,
      table.backupManifestId,
      table.storageObjectId,
    ),
    check("backup_manifest_items_size_check", sql`${table.sizeBytes} > 0`),
    check("backup_manifest_items_lifecycle_check", lifecycleValues),
  ],
);

export const importMappings = pgTable(
  "import_mappings",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    name: text("name").notNull(),
    sourceSystem: text("source_system").notNull(),
    currentVersionId: text("current_version_id"),
  },
  (table) => [
    uniqueIndex("import_mappings_org_name_unique").on(
      table.organizationId,
      table.name,
    ),
    check("import_mappings_lifecycle_check", lifecycleValues),
  ],
);

export const importMappingVersions = pgTable(
  "import_mapping_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    importMappingId: text("import_mapping_id")
      .notNull()
      .references(() => importMappings.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    schemaVersion: text("schema_version").notNull(),
    fileFormat: text("file_format").notNull(),
    sheetName: text("sheet_name"),
    headerRow: integer("header_row").notNull().default(1),
    columnMapping: jsonb("column_mapping")
      .$type<Record<string, string>>()
      .notNull(),
    constants: jsonb("constants")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    contentHash: text("content_hash").notNull(),
  },
  (table) => [
    uniqueIndex("import_mapping_versions_org_mapping_version_unique").on(
      table.organizationId,
      table.importMappingId,
      table.versionNumber,
    ),
    check(
      "import_mapping_versions_format_check",
      sql`${table.fileFormat} in ('csv', 'xlsx')`,
    ),
    check(
      "import_mapping_versions_header_check",
      sql`${table.headerRow} > 0`,
    ),
    check("import_mapping_versions_lifecycle_check", lifecycleValues),
  ],
);

export const portfolioImports = pgTable(
  "portfolio_imports",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "restrict" }),
    storageObjectId: text("storage_object_id")
      .notNull()
      .references(() => storageObjects.id, { onDelete: "restrict" }),
    mappingVersionId: text("mapping_version_id")
      .notNull()
      .references(() => importMappingVersions.id, { onDelete: "restrict" }),
    sourceSystem: text("source_system").notNull(),
    fileFormat: text("file_format").notNull(),
    originalFilename: text("original_filename").notNull(),
    contentHash: text("content_hash").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull().default("previewed"),
    totalRows: integer("total_rows").notNull().default(0),
    acceptedRows: integer("accepted_rows").notNull().default(0),
    rejectedRows: integer("rejected_rows").notNull().default(0),
    ambiguousRows: integer("ambiguous_rows").notNull().default(0),
    committedRows: integer("committed_rows").notNull().default(0),
    createdEntities: jsonb("created_entities")
      .$type<Array<{ entityType: string; entityId: string }>>()
      .notNull()
      .default([]),
    committedAt: timestamp("committed_at", {
      withTimezone: true,
      mode: "string",
    }),
    rolledBackAt: timestamp("rolled_back_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    uniqueIndex("portfolio_imports_org_idempotency_unique").on(
      table.organizationId,
      table.sourceSystem,
      table.idempotencyKey,
    ),
    index("portfolio_imports_org_status_idx").on(
      table.organizationId,
      table.status,
      table.createdAt,
    ),
    check(
      "portfolio_imports_format_check",
      sql`${table.fileFormat} in ('csv', 'xlsx')`,
    ),
    check(
      "portfolio_imports_status_check",
      sql`${table.status} in ('previewed', 'committed', 'rolled_back', 'failed')`,
    ),
    check(
      "portfolio_imports_count_check",
      sql`${table.totalRows} >= 0 and ${table.acceptedRows} >= 0 and ${table.rejectedRows} >= 0 and ${table.ambiguousRows} >= 0 and ${table.committedRows} >= 0`,
    ),
    check("portfolio_imports_lifecycle_check", lifecycleValues),
  ],
);

export const importRows = pgTable(
  "import_rows",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    portfolioImportId: text("portfolio_import_id")
      .notNull()
      .references(() => portfolioImports.id, { onDelete: "restrict" }),
    rowNumber: integer("row_number").notNull(),
    rawData: jsonb("raw_data").$type<Record<string, unknown>>().notNull(),
    normalizedData: jsonb("normalized_data")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: text("status").notNull(),
    errors: jsonb("errors").$type<string[]>().notNull().default([]),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    matchCandidateIds: jsonb("match_candidate_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    appliedEntities: jsonb("applied_entities")
      .$type<Array<{ entityType: string; entityId: string }>>()
      .notNull()
      .default([]),
  },
  (table) => [
    uniqueIndex("import_rows_org_import_row_unique").on(
      table.organizationId,
      table.portfolioImportId,
      table.rowNumber,
    ),
    index("import_rows_org_status_idx").on(
      table.organizationId,
      table.portfolioImportId,
      table.status,
    ),
    check("import_rows_row_check", sql`${table.rowNumber} > 0`),
    check(
      "import_rows_status_check",
      sql`${table.status} in ('accepted', 'rejected', 'ambiguous', 'committed', 'rolled_back')`,
    ),
    check("import_rows_lifecycle_check", lifecycleValues),
  ],
);

export const importReceipts = pgTable(
  "import_receipts",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    portfolioImportId: text("portfolio_import_id")
      .notNull()
      .references(() => portfolioImports.id, { onDelete: "restrict" }),
    receiptType: text("receipt_type").notNull(),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull(),
    receiptHash: text("receipt_hash").notNull(),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("import_receipts_org_hash_unique").on(
      table.organizationId,
      table.receiptHash,
    ),
    index("import_receipts_org_import_idx").on(
      table.organizationId,
      table.portfolioImportId,
      table.occurredAt,
    ),
    check(
      "import_receipts_type_check",
      sql`${table.receiptType} in ('preview', 'commit', 'rollback')`,
    ),
    check("import_receipts_lifecycle_check", lifecycleValues),
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

export const propertyPortfolios = pgTable(
  "property_portfolios",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    ...governedGraphColumns(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    primaryPeril: text("primary_peril").notNull(),
    description: text("description").notNull().default(""),
  },
  (table) => [
    uniqueIndex("property_portfolios_org_source_unique").on(
      table.organizationId,
      table.sourceSystem,
      table.sourceRecordId,
    ),
    index("property_portfolios_org_client_idx").on(
      table.organizationId,
      table.clientId,
    ),
    ...governedGraphChecks(table),
    check("property_portfolios_lifecycle_check", lifecycleValues),
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
    normalizedAddress: text("normalized_address").notNull().default(""),
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
    index("locations_org_normalized_address_idx").on(
      table.organizationId,
      table.normalizedAddress,
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

export const portfolioProperties = pgTable(
  "portfolio_properties",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    ...governedGraphColumns(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => propertyPortfolios.id, { onDelete: "restrict" }),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    relationshipStatus: text("relationship_status")
      .notNull()
      .default("active"),
  },
  (table) => [
    uniqueIndex("portfolio_properties_org_pair_unique").on(
      table.organizationId,
      table.portfolioId,
      table.propertyId,
      table.effectiveFrom,
    ),
    index("portfolio_properties_org_property_idx").on(
      table.organizationId,
      table.propertyId,
    ),
    ...governedGraphChecks(table),
    check(
      "portfolio_properties_status_check",
      sql`${table.relationshipStatus} in ('active', 'pending_review', 'ended')`,
    ),
    check("portfolio_properties_lifecycle_check", lifecycleValues),
  ],
);

export const parcels = pgTable(
  "parcels",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    ...governedGraphColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    label: text("label").notNull(),
    parcelNumber: text("parcel_number"),
    boundaryGeojson: jsonb("boundary_geojson").$type<Record<string, unknown>>(),
    spatialReference: text("spatial_reference").notNull().default("EPSG:4326"),
    geometryStatus: text("geometry_status").notNull().default("unavailable"),
  },
  (table) => [
    uniqueIndex("parcels_org_property_label_unique").on(
      table.organizationId,
      table.propertyId,
      table.label,
    ),
    index("parcels_org_number_idx").on(
      table.organizationId,
      table.parcelNumber,
    ),
    ...governedGraphChecks(table),
    check(
      "parcels_geometry_status_check",
      sql`${table.geometryStatus} in ('unavailable', 'unreviewed', 'confirmed', 'rejected')`,
    ),
    check(
      "parcels_boundary_state_check",
      sql`(${table.boundaryGeojson} is null and ${table.geometryStatus} in ('unavailable', 'rejected')) or (${table.boundaryGeojson} is not null and ${table.geometryStatus} in ('unreviewed', 'confirmed'))`,
    ),
    check("parcels_lifecycle_check", lifecycleValues),
  ],
);

export const unitSummaries = pgTable(
  "unit_summaries",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    ...governedGraphColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    buildingId: text("building_id").references(() => buildings.id, {
      onDelete: "restrict",
    }),
    label: text("label").notNull(),
    unitCount: integer("unit_count").notNull(),
    occupancyType: text("occupancy_type").notNull(),
  },
  (table) => [
    uniqueIndex("unit_summaries_org_property_label_unique").on(
      table.organizationId,
      table.propertyId,
      table.label,
      table.effectiveFrom,
    ),
    ...governedGraphChecks(table),
    check("unit_summaries_count_check", sql`${table.unitCount} >= 0`),
    check("unit_summaries_lifecycle_check", lifecycleValues),
  ],
);

export const propertyScopes = pgTable(
  "property_scopes",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    ...governedGraphColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    parcelId: text("parcel_id").references(() => parcels.id, {
      onDelete: "restrict",
    }),
    buildingId: text("building_id").references(() => buildings.id, {
      onDelete: "restrict",
    }),
    unitSummaryId: text("unit_summary_id").references(() => unitSummaries.id, {
      onDelete: "restrict",
    }),
    scopeType: text("scope_type").notNull(),
    label: text("label").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    uniqueIndex("property_scopes_org_property_type_label_unique").on(
      table.organizationId,
      table.propertyId,
      table.scopeType,
      table.label,
      table.effectiveFrom,
    ),
    ...governedGraphChecks(table),
    check(
      "property_scopes_type_check",
      sql`${table.scopeType} in ('community', 'parcel', 'building', 'building_group', 'unit_summary', 'landscape_zone', 'access_route', 'shared_infrastructure')`,
    ),
    check("property_scopes_lifecycle_check", lifecycleValues),
  ],
);

export const propertyAliases = pgTable(
  "property_aliases",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    ...governedGraphColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    alias: text("alias").notNull(),
    aliasType: text("alias_type").notNull(),
    reviewStatus: text("review_status").notNull().default("unreviewed"),
  },
  (table) => [
    uniqueIndex("property_aliases_org_alias_unique").on(
      table.organizationId,
      table.propertyId,
      table.alias,
      table.sourceSystem,
      table.effectiveFrom,
    ),
    ...governedGraphChecks(table),
    check(
      "property_aliases_review_check",
      sql`${table.reviewStatus} in ('unreviewed', 'confirmed', 'rejected', 'superseded')`,
    ),
    check("property_aliases_lifecycle_check", lifecycleValues),
  ],
);

export const propertyRelationships = pgTable(
  "property_relationships",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    ...governedGraphColumns(),
    fromPropertyId: text("from_property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    toPropertyId: text("to_property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    relationshipType: text("relationship_type").notNull(),
    scopeLabel: text("scope_label").notNull().default(""),
    reviewStatus: text("review_status").notNull().default("unreviewed"),
  },
  (table) => [
    uniqueIndex("property_relationships_org_pair_unique").on(
      table.organizationId,
      table.fromPropertyId,
      table.toPropertyId,
      table.relationshipType,
      table.effectiveFrom,
    ),
    ...governedGraphChecks(table),
    check(
      "property_relationships_distinct_check",
      sql`${table.fromPropertyId} <> ${table.toPropertyId}`,
    ),
    check(
      "property_relationships_review_check",
      sql`${table.reviewStatus} in ('unreviewed', 'confirmed', 'rejected', 'superseded')`,
    ),
    check("property_relationships_lifecycle_check", lifecycleValues),
  ],
);

export const propertyVersions = pgTable(
  "property_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    ...governedGraphColumns(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    snapshotHash: text("snapshot_hash").notNull(),
    changeSummary: text("change_summary").notNull(),
    supersedesId: text("supersedes_id").references(
      (): AnyPgColumn => propertyVersions.id,
      { onDelete: "restrict" },
    ),
    recordedAt: timestamp("recorded_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("property_versions_org_property_version_unique").on(
      table.organizationId,
      table.propertyId,
      table.versionNumber,
    ),
    uniqueIndex("property_versions_org_hash_unique").on(
      table.organizationId,
      table.propertyId,
      table.snapshotHash,
    ),
    ...governedGraphChecks(table),
    check("property_versions_number_check", sql`${table.versionNumber} >= 1`),
    check(
      "property_versions_hash_check",
      sql`char_length(${table.snapshotHash}) = 64`,
    ),
    check("property_versions_lifecycle_check", lifecycleValues),
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

export const caseAssignments = pgTable(
  "case_assignments",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    caseId: text("case_id")
      .notNull()
      .references(() => renewalCases.id, { onDelete: "restrict" }),
    membershipId: text("membership_id").references(() => memberships.id, {
      onDelete: "restrict",
    }),
    externalPrincipalId: text("external_principal_id").references(
      () => externalPrincipals.id,
      { onDelete: "restrict" },
    ),
    assignmentRole: text("assignment_role").notNull(),
    accessPurpose: text("access_purpose")
      .notNull()
      .default("case workflow assignment"),
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    dataDomains: jsonb("data_domains").$type<string[]>().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
    revocationReason: text("revocation_reason"),
  },
  (table) => [
    index("case_assignments_org_case_idx").on(
      table.organizationId,
      table.caseId,
    ),
    check(
      "case_assignments_one_principal_check",
      sql`((${table.membershipId} is not null)::integer + (${table.externalPrincipalId} is not null)::integer) = 1`,
    ),
    check(
      "case_assignments_role_check",
      sql`${table.assignmentRole} in ('owner', 'team_member', 'contributor', 'reviewer', 'auditor')`,
    ),
    check(
      "case_assignments_purpose_check",
      sql`char_length(trim(${table.accessPurpose})) >= 8`,
    ),
    check("case_assignments_lifecycle_check", lifecycleValues),
  ],
);

export const portfolioAssignments = pgTable(
  "portfolio_assignments",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => propertyPortfolios.id, { onDelete: "restrict" }),
    membershipId: text("membership_id").references(() => memberships.id, {
      onDelete: "restrict",
    }),
    teamId: text("team_id").references(() => teams.id, {
      onDelete: "restrict",
    }),
    externalPrincipalId: text("external_principal_id").references(
      () => externalPrincipals.id,
      { onDelete: "restrict" },
    ),
    assignmentRole: text("assignment_role").notNull(),
    accessPurpose: text("access_purpose").notNull(),
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    dataDomains: jsonb("data_domains").$type<string[]>().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
    revocationReason: text("revocation_reason"),
  },
  (table) => [
    index("portfolio_assignments_org_portfolio_idx").on(
      table.organizationId,
      table.portfolioId,
    ),
    index("portfolio_assignments_org_membership_idx").on(
      table.organizationId,
      table.membershipId,
    ),
    check(
      "portfolio_assignments_one_principal_check",
      sql`((${table.membershipId} is not null)::integer + (${table.teamId} is not null)::integer + (${table.externalPrincipalId} is not null)::integer) = 1`,
    ),
    check(
      "portfolio_assignments_role_check",
      sql`${table.assignmentRole} in ('owner', 'manager', 'contributor', 'verifier', 'reviewer', 'auditor')`,
    ),
    check(
      "portfolio_assignments_purpose_check",
      sql`char_length(trim(${table.accessPurpose})) >= 8`,
    ),
    check("portfolio_assignments_lifecycle_check", lifecycleValues),
  ],
);

export const dataAccessLogs = pgTable(
  "data_access_logs",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    principalType: text("principal_type").notNull(),
    actorSubject: text("actor_subject").notNull(),
    accessPurpose: text("access_purpose").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    portfolioId: text("portfolio_id").references(() => propertyPortfolios.id, {
      onDelete: "restrict",
    }),
    caseId: text("case_id").references(() => renewalCases.id, {
      onDelete: "restrict",
    }),
    dataClasses: jsonb("data_classes").$type<string[]>().notNull().default([]),
    requestId: text("request_id"),
    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("data_access_logs_org_time_idx").on(
      table.organizationId,
      table.occurredAt,
    ),
    index("data_access_logs_org_resource_idx").on(
      table.organizationId,
      table.resourceType,
      table.resourceId,
    ),
    check(
      "data_access_logs_principal_check",
      sql`${table.principalType} in ('membership', 'external_collaborator', 'external_reviewer', 'service_account', 'support_administrator')`,
    ),
    check(
      "data_access_logs_action_check",
      sql`${table.action} in ('read', 'create', 'update', 'delete', 'manage', 'upload', 'download')`,
    ),
    check(
      "data_access_logs_outcome_check",
      sql`${table.outcome} in ('allowed', 'denied')`,
    ),
    check(
      "data_access_logs_purpose_check",
      sql`char_length(trim(${table.accessPurpose})) >= 8`,
    ),
    check("data_access_logs_lifecycle_check", lifecycleValues),
  ],
);

export const externalAccessGrants = pgTable(
  "external_access_grants",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    externalPrincipalId: text("external_principal_id")
      .notNull()
      .references(() => externalPrincipals.id, { onDelete: "restrict" }),
    caseId: text("case_id")
      .notNull()
      .references(() => renewalCases.id, { onDelete: "restrict" }),
    purpose: text("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
      .notNull(),
    lastUsedAt: timestamp("last_used_at", {
      withTimezone: true,
      mode: "string",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("external_access_grants_token_unique").on(table.tokenHash),
    index("external_access_grants_org_case_idx").on(
      table.organizationId,
      table.caseId,
    ),
    check("external_access_grants_lifecycle_check", lifecycleValues),
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
    storageObjectId: text("storage_object_id").references(
      () => storageObjects.id,
      { onDelete: "restrict" },
    ),
    supersedesSourceDocumentId: text("supersedes_source_document_id").references(
      (): AnyPgColumn => sourceDocuments.id,
      { onDelete: "restrict" },
    ),
    versionNumber: integer("version_number").notNull().default(1),
    documentType: text("document_type").notNull(),
    classificationConfidence: numeric("classification_confidence", {
      precision: 5,
      scale: 4,
    }),
    classifierKey: text("classifier_key"),
    classifierVersion: text("classifier_version"),
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
    index("source_documents_org_storage_idx").on(
      table.organizationId,
      table.storageObjectId,
    ),
    check(
      "source_documents_version_check",
      sql`${table.versionNumber} >= 1`,
    ),
    check("source_documents_lifecycle_check", lifecycleValues),
  ],
);

export const documentProcessingJobs = pgTable(
  "document_processing_jobs",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "restrict" }),
    pipelineVersion: text("pipeline_version").notNull(),
    status: text("status").notNull().default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    availableAt: timestamp("available_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", {
      withTimezone: true,
      mode: "string",
    }),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    deadLetteredAt: timestamp("dead_lettered_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    uniqueIndex("document_processing_jobs_org_document_pipeline_unique").on(
      table.organizationId,
      table.sourceDocumentId,
      table.pipelineVersion,
    ),
    index("document_processing_jobs_org_queue_idx").on(
      table.organizationId,
      table.status,
      table.availableAt,
    ),
    check(
      "document_processing_jobs_status_check",
      sql`${table.status} in ('queued', 'running', 'retry_scheduled', 'succeeded', 'dead_letter')`,
    ),
    check(
      "document_processing_jobs_attempts_check",
      sql`${table.attemptCount} >= 0 and ${table.maxAttempts} between 1 and 10 and ${table.attemptCount} <= ${table.maxAttempts}`,
    ),
    check("document_processing_jobs_lifecycle_check", lifecycleValues),
  ],
);

export const documentProcessingAttempts = pgTable(
  "document_processing_attempts",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    jobId: text("job_id")
      .notNull()
      .references(() => documentProcessingJobs.id, { onDelete: "restrict" }),
    attemptNumber: integer("attempt_number").notNull(),
    workerId: text("worker_id").notNull(),
    status: text("status").notNull(),
    providerKey: text("provider_key"),
    providerVersion: text("provider_version"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
      .notNull(),
    finishedAt: timestamp("finished_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    uniqueIndex("document_processing_attempts_job_number_unique").on(
      table.organizationId,
      table.jobId,
      table.attemptNumber,
    ),
    check(
      "document_processing_attempts_status_check",
      sql`${table.status} in ('running', 'succeeded', 'failed_retryable', 'failed_terminal')`,
    ),
    check("document_processing_attempts_lifecycle_check", lifecycleValues),
  ],
);

export const documentExtractionRuns = pgTable(
  "document_extraction_runs",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "restrict" }),
    jobId: text("job_id")
      .notNull()
      .references(() => documentProcessingJobs.id, { onDelete: "restrict" }),
    providerKey: text("provider_key").notNull(),
    providerVersion: text("provider_version").notNull(),
    extractorKey: text("extractor_key").notNull(),
    extractorVersion: text("extractor_version").notNull(),
    inputSha256: text("input_sha256").notNull(),
    modelDerived: boolean("model_derived").notNull().default(false),
    pageCount: integer("page_count").notNull(),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
      .notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    uniqueIndex("document_extraction_runs_job_extractor_unique").on(
      table.organizationId,
      table.jobId,
      table.extractorKey,
      table.extractorVersion,
    ),
    check(
      "document_extraction_runs_status_check",
      sql`${table.status} in ('running', 'succeeded', 'failed')`,
    ),
    check("document_extraction_runs_lifecycle_check", lifecycleValues),
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
    extractionRunId: text("extraction_run_id").references(
      () => documentExtractionRuns.id,
      { onDelete: "restrict" },
    ),
    pageNumber: integer("page_number"),
    segment: text("segment"),
    region: jsonb("region").$type<{
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
    }>(),
    passageKind: text("passage_kind").notNull().default("paragraph"),
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

export const extractedFields = pgTable(
  "extracted_fields",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "restrict" }),
    extractionRunId: text("extraction_run_id")
      .notNull()
      .references(() => documentExtractionRuns.id, { onDelete: "restrict" }),
    sourcePassageId: text("source_passage_id").references(
      () => sourcePassages.id,
      { onDelete: "restrict" },
    ),
    fieldKey: text("field_key").notNull(),
    fieldLabel: text("field_label").notNull(),
    candidateOrdinal: integer("candidate_ordinal").notNull().default(1),
    value: text("value").notNull(),
    valueType: text("value_type").notNull().default("text"),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
    modelDerived: boolean("model_derived").notNull().default(false),
  },
  (table) => [
    uniqueIndex("extracted_fields_run_key_ordinal_unique").on(
      table.organizationId,
      table.extractionRunId,
      table.fieldKey,
      table.candidateOrdinal,
    ),
    index("extracted_fields_org_document_idx").on(
      table.organizationId,
      table.sourceDocumentId,
    ),
    check(
      "extracted_fields_confidence_check",
      sql`${table.confidence} >= 0 and ${table.confidence} <= 1`,
    ),
    check("extracted_fields_lifecycle_check", lifecycleValues),
  ],
);

export const extractedFieldReviews = pgTable(
  "extracted_field_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    extractedFieldId: text("extracted_field_id")
      .notNull()
      .references(() => extractedFields.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    reviewedValue: text("reviewed_value"),
    reviewerSubject: text("reviewer_subject").notNull(),
    reviewerPrincipalType: text("reviewer_principal_type").notNull(),
    note: text("note"),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    index("extracted_field_reviews_org_field_idx").on(
      table.organizationId,
      table.extractedFieldId,
      table.reviewedAt,
    ),
    check(
      "extracted_field_reviews_action_check",
      sql`${table.action} in ('confirmed', 'corrected', 'rejected')`,
    ),
    check("extracted_field_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const documentFacts = pgTable(
  "document_facts",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "restrict" }),
    extractedFieldId: text("extracted_field_id")
      .notNull()
      .references(() => extractedFields.id, { onDelete: "restrict" }),
    reviewId: text("review_id")
      .notNull()
      .references(() => extractedFieldReviews.id, { onDelete: "restrict" }),
    sourcePassageId: text("source_passage_id").references(
      () => sourcePassages.id,
      { onDelete: "restrict" },
    ),
    factKey: text("fact_key").notNull(),
    value: text("value").notNull(),
    versionNumber: integer("version_number").notNull(),
    supersedesFactId: text("supersedes_fact_id").references(
      (): AnyPgColumn => documentFacts.id,
      { onDelete: "restrict" },
    ),
    confirmedBy: text("confirmed_by").notNull(),
    confirmedAt: timestamp("confirmed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    correctionReason: text("correction_reason"),
  },
  (table) => [
    uniqueIndex("document_facts_org_document_key_version_unique").on(
      table.organizationId,
      table.sourceDocumentId,
      table.factKey,
      table.versionNumber,
    ),
    check(
      "document_facts_version_check",
      sql`${table.versionNumber} >= 1`,
    ),
    check("document_facts_lifecycle_check", lifecycleValues),
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

export const governedSources = pgTable(
  "governed_sources",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    canonicalKey: text("canonical_key").notNull(),
    sourceClass: text("source_class").notNull(),
    issuingAuthority: text("issuing_authority").notNull(),
    title: text("title").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    officialUrl: text("official_url").notNull(),
    authorityTier: text("authority_tier").notNull(),
    reviewOwnerSubject: text("review_owner_subject").notNull(),
  },
  (table) => [
    uniqueIndex("governed_sources_org_key_unique").on(
      table.organizationId,
      table.canonicalKey,
    ),
    check(
      "governed_sources_class_check",
      sql`${table.sourceClass} in ('statute_regulation', 'regulator_guidance', 'cal_fire_programme', 'fair_plan_rule_form', 'insurer_mga_material', 'third_party_standard', 'funding_programme', 'local_authority_requirement', 'external_model_documentation')`,
    ),
    check(
      "governed_sources_authority_tier_check",
      sql`${table.authorityTier} in ('primary', 'officially_authorized', 'customer_supplied', 'recognized_third_party')`,
    ),
    check("governed_sources_lifecycle_check", lifecycleValues),
  ],
);

export const governedSourceVersions = pgTable(
  "governed_source_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceId: text("source_id")
      .notNull()
      .references(() => governedSources.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    versionLabel: text("version_label").notNull(),
    publicationDate: date("publication_date", { mode: "string" }),
    effectiveFrom: date("effective_from", { mode: "string" }),
    effectiveTo: date("effective_to", { mode: "string" }),
    retrievalDate: date("retrieval_date", { mode: "string" }).notNull(),
    sourceHash: text("source_hash").notNull(),
    snapshotState: text("snapshot_state").notNull(),
    storageObjectId: text("storage_object_id").references(
      () => storageObjects.id,
      { onDelete: "restrict" },
    ),
    rightsStatus: text("rights_status").notNull(),
    redistributionAllowed: boolean("redistribution_allowed")
      .notNull()
      .default(false),
    useRestrictions: text("use_restrictions").notNull(),
    structuredSummary: jsonb("structured_summary")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    verifyCurrentStatus: text("verify_current_status").notNull(),
    nextReviewDate: date("next_review_date", { mode: "string" }).notNull(),
    extractionMethod: text("extraction_method").notNull(),
    humanConfirmed: boolean("human_confirmed").notNull().default(false),
    authorSubject: text("author_subject").notNull(),
    changeSummary: text("change_summary").notNull(),
    supersedesVersionId: text("supersedes_version_id").references(
      (): AnyPgColumn => governedSourceVersions.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    uniqueIndex("governed_source_versions_org_source_number_unique").on(
      table.organizationId,
      table.sourceId,
      table.versionNumber,
    ),
    index("governed_source_versions_org_review_idx").on(
      table.organizationId,
      table.verifyCurrentStatus,
      table.nextReviewDate,
    ),
    check(
      "governed_source_versions_number_check",
      sql`${table.versionNumber} >= 1`,
    ),
    check(
      "governed_source_versions_hash_check",
      sql`char_length(${table.sourceHash}) = 64`,
    ),
    check(
      "governed_source_versions_effective_period_check",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
    check(
      "governed_source_versions_snapshot_check",
      sql`${table.snapshotState} in ('exact_bytes', 'approved_snapshot', 'metadata_only_restricted')`,
    ),
    check(
      "governed_source_versions_snapshot_object_check",
      sql`${table.snapshotState} = 'metadata_only_restricted' or ${table.storageObjectId} is not null`,
    ),
    check(
      "governed_source_versions_rights_check",
      sql`${table.rightsStatus} in ('approved', 'restricted', 'pending')`,
    ),
    check(
      "governed_source_versions_verify_check",
      sql`${table.verifyCurrentStatus} in ('verified_current', 'verification_due', 'unverified', 'withdrawn')`,
    ),
    check(
      "governed_source_versions_extraction_check",
      sql`${table.extractionMethod} in ('human_authored', 'deterministic_extraction', 'model_assisted')`,
    ),
    check("governed_source_versions_lifecycle_check", lifecycleValues),
  ],
);

export const governedSourceReviews = pgTable(
  "governed_source_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceVersionId: text("source_version_id")
      .notNull()
      .references(() => governedSourceVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    note: text("note").notNull(),
    sourceCompared: boolean("source_compared").notNull().default(false),
    rightsConfirmed: boolean("rights_confirmed").notNull().default(false),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("governed_source_reviews_org_version_unique").on(
      table.organizationId,
      table.sourceVersionId,
    ),
    check(
      "governed_source_reviews_decision_check",
      sql`${table.decision} in ('approved', 'changes_requested')`,
    ),
    check("governed_source_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const governedSourcePublications = pgTable(
  "governed_source_publications",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceVersionId: text("source_version_id")
      .notNull()
      .references(() => governedSourceVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    publisherSubject: text("publisher_subject").notNull(),
    note: text("note").notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("governed_source_publications_org_version_unique").on(
      table.organizationId,
      table.sourceVersionId,
    ),
    check(
      "governed_source_publications_decision_check",
      sql`${table.decision} in ('published', 'rejected')`,
    ),
    check("governed_source_publications_lifecycle_check", lifecycleValues),
  ],
);

export const governedSourceDependencies = pgTable(
  "governed_source_dependencies",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceVersionId: text("source_version_id")
      .notNull()
      .references(() => governedSourceVersions.id, { onDelete: "restrict" }),
    consumerType: text("consumer_type").notNull(),
    consumerId: text("consumer_id").notNull(),
    relationship: text("relationship").notNull(),
    rationale: text("rationale").notNull(),
    pinnedAt: timestamp("pinned_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    pinnedBy: text("pinned_by").notNull(),
  },
  (table) => [
    uniqueIndex("governed_source_dependencies_org_consumer_unique").on(
      table.organizationId,
      table.sourceVersionId,
      table.consumerType,
      table.consumerId,
    ),
    index("governed_source_dependencies_org_source_idx").on(
      table.organizationId,
      table.sourceVersionId,
    ),
    check(
      "governed_source_dependencies_consumer_check",
      sql`${table.consumerType} in ('playbook_version', 'renewal_case', 'target_profile_version', 'external_model_version', 'market_commitment_version')`,
    ),
    check(
      "governed_source_dependencies_relationship_check",
      sql`${table.relationship} in ('relied_on', 'reference_only')`,
    ),
    check("governed_source_dependencies_lifecycle_check", lifecycleValues),
  ],
);

export const sourceChangeAlerts = pgTable(
  "source_change_alerts",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    sourceId: text("source_id")
      .notNull()
      .references(() => governedSources.id, { onDelete: "restrict" }),
    fromVersionId: text("from_version_id")
      .notNull()
      .references(() => governedSourceVersions.id, { onDelete: "restrict" }),
    toVersionId: text("to_version_id")
      .notNull()
      .references(() => governedSourceVersions.id, { onDelete: "restrict" }),
    impactSnapshot: jsonb("impact_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    ownerSubject: text("owner_subject").notNull(),
    createdAtEvent: timestamp("created_at_event", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("source_change_alerts_org_versions_unique").on(
      table.organizationId,
      table.fromVersionId,
      table.toVersionId,
    ),
    index("source_change_alerts_org_owner_idx").on(
      table.organizationId,
      table.ownerSubject,
      table.createdAtEvent,
    ),
    check("source_change_alerts_distinct_versions_check", sql`${table.fromVersionId} <> ${table.toVersionId}`),
    check("source_change_alerts_lifecycle_check", lifecycleValues),
  ],
);

export const targetProfiles = pgTable(
  "target_profiles",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    canonicalKey: text("canonical_key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    peril: text("peril").notNull(),
    propertyClass: text("property_class").notNull(),
  },
  (table) => [
    uniqueIndex("target_profiles_org_key_unique").on(table.organizationId, table.canonicalKey),
    check("target_profiles_lifecycle_check", lifecycleValues),
  ],
);

export const targetProfileVersions = pgTable(
  "target_profile_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    profileId: text("profile_id").notNull().references(() => targetProfiles.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    status: text("status").notNull().default("draft"),
    authorSubject: text("author_subject").notNull(),
    changeSummary: text("change_summary").notNull(),
    limitations: text("limitations").notNull(),
    recognitionState: text("recognition_state").notNull().default("unavailable_no_commitment_registry"),
    supersedesVersionId: text("supersedes_version_id").references((): AnyPgColumn => targetProfileVersions.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("target_profile_versions_org_profile_number_unique").on(table.organizationId, table.profileId, table.versionNumber),
    check("target_profile_versions_number_check", sql`${table.versionNumber} >= 1`),
    check("target_profile_versions_status_check", sql`${table.status} in ('draft', 'published', 'superseded', 'withdrawn')`),
    check("target_profile_versions_recognition_check", sql`${table.recognitionState} in ('unavailable_no_commitment_registry', 'unverified_external_reference')`),
    check("target_profile_versions_effective_check", sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`),
    check("target_profile_versions_lifecycle_check", lifecycleValues),
  ],
);

export const targetProfileCriteria = pgTable(
  "target_profile_criteria",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    profileVersionId: text("profile_version_id").notNull().references(() => targetProfileVersions.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    targetLevel: text("target_level").notNull(),
    evidenceLevel: text("evidence_level").notNull(),
    requirementText: text("requirement_text").notNull(),
    verificationMethod: text("verification_method").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("target_profile_criteria_org_version_code_unique").on(table.organizationId, table.profileVersionId, table.code),
    check("target_profile_criteria_level_check", sql`${table.targetLevel} in ('minimum', 'preferred')`),
    check("target_profile_criteria_evidence_check", sql`${table.evidenceLevel} in ('self_attested', 'documented', 'professional_observation', 'independent_verification', 'jurisdictional_record', 'programme_recognition', 'insurer_acknowledgement', 'modeled_analysis', 'measured_outcome')`),
    check("target_profile_criteria_position_check", sql`${table.position} >= 1`),
    check("target_profile_criteria_lifecycle_check", lifecycleValues),
  ],
);

export const targetProfileApplicability = pgTable(
  "target_profile_applicability",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    profileVersionId: text("profile_version_id").notNull().references(() => targetProfileVersions.id, { onDelete: "restrict" }),
    field: text("field").notNull(),
    operator: text("operator").notNull(),
    expectedValues: jsonb("expected_values").$type<string[]>().notNull().default([]),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("target_profile_applicability_org_version_position_unique").on(table.organizationId, table.profileVersionId, table.position),
    check("target_profile_applicability_operator_check", sql`${table.operator} in ('equals', 'includes', 'one_of')`),
    check("target_profile_applicability_position_check", sql`${table.position} >= 1`),
    check("target_profile_applicability_lifecycle_check", lifecycleValues),
  ],
);

export const targetProfileReviews = pgTable(
  "target_profile_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    profileVersionId: text("profile_version_id").notNull().references(() => targetProfileVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    note: text("note").notNull(),
    sourcePinsChecked: boolean("source_pins_checked").notNull().default(false),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("target_profile_reviews_org_version_unique").on(table.organizationId, table.profileVersionId),
    check("target_profile_reviews_decision_check", sql`${table.decision} in ('approved', 'changes_requested')`),
    check("target_profile_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const targetProfilePublications = pgTable(
  "target_profile_publications",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    profileVersionId: text("profile_version_id").notNull().references(() => targetProfileVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    publisherSubject: text("publisher_subject").notNull(),
    note: text("note").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("target_profile_publications_org_version_unique").on(table.organizationId, table.profileVersionId),
    check("target_profile_publications_decision_check", sql`${table.decision} in ('published', 'rejected')`),
    check("target_profile_publications_lifecycle_check", lifecycleValues),
  ],
);

export const interventions = pgTable(
  "interventions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    canonicalKey: text("canonical_key").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
  },
  (table) => [
    uniqueIndex("interventions_org_key_unique").on(table.organizationId, table.canonicalKey),
    check("interventions_lifecycle_check", lifecycleValues),
  ],
);

export const interventionVersions = pgTable(
  "intervention_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    interventionId: text("intervention_id").notNull().references(() => interventions.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("draft"),
    technicalSpecification: text("technical_specification").notNull(),
    evidenceLevel: text("evidence_level").notNull(),
    typicalCostLowCents: integer("typical_cost_low_cents").notNull(),
    typicalCostHighCents: integer("typical_cost_high_cents").notNull(),
    typicalDurationDays: integer("typical_duration_days").notNull(),
    dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
    maintenanceRequirements: jsonb("maintenance_requirements").$type<string[]>().notNull().default([]),
    benefitStatement: text("benefit_statement").notNull(),
    benefitBoundary: text("benefit_boundary").notNull(),
    authorSubject: text("author_subject").notNull(),
    reviewerSubject: text("reviewer_subject"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
    supersedesVersionId: text("supersedes_version_id").references((): AnyPgColumn => interventionVersions.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("intervention_versions_org_item_number_unique").on(table.organizationId, table.interventionId, table.versionNumber),
    check("intervention_versions_status_check", sql`${table.status} in ('draft', 'published', 'superseded', 'withdrawn')`),
    check("intervention_versions_evidence_check", sql`${table.evidenceLevel} in ('self_attested', 'documented', 'professional_observation', 'independent_verification', 'jurisdictional_record', 'programme_recognition', 'insurer_acknowledgement', 'modeled_analysis', 'measured_outcome')`),
    check("intervention_versions_cost_check", sql`${table.typicalCostLowCents} >= 0 and ${table.typicalCostHighCents} >= ${table.typicalCostLowCents}`),
    check("intervention_versions_duration_check", sql`${table.typicalDurationDays} >= 0`),
    check("intervention_versions_reviewer_check", sql`${table.reviewerSubject} is null or ${table.reviewerSubject} <> ${table.authorSubject}`),
    check("intervention_versions_lifecycle_check", lifecycleValues),
  ],
);

export const interventionVersionReviews = pgTable(
  "intervention_version_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    interventionVersionId: text("intervention_version_id").notNull().references(() => interventionVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    note: text("note").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("intervention_reviews_org_version_unique").on(table.organizationId, table.interventionVersionId),
    check("intervention_reviews_decision_check", sql`${table.decision} in ('approved', 'changes_requested')`),
    check("intervention_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const baselineAssessments = pgTable(
  "baseline_assessments",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
    profileVersionId: text("profile_version_id").notNull().references(() => targetProfileVersions.id, { onDelete: "restrict" }),
    applicabilityState: text("applicability_state").notNull(),
    applicabilityReasons: jsonb("applicability_reasons").$type<string[]>().notNull().default([]),
    assessedAt: timestamp("assessed_at", { withTimezone: true, mode: "string" }).notNull(),
    assessedBy: text("assessed_by").notNull(),
  },
  (table) => [
    check("baseline_assessments_applicability_check", sql`${table.applicabilityState} in ('applicable', 'inapplicable', 'insufficient_property_data')`),
    check("baseline_assessments_lifecycle_check", lifecycleValues),
  ],
);

export const baselineGaps = pgTable(
  "baseline_gaps",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    baselineAssessmentId: text("baseline_assessment_id").notNull().references(() => baselineAssessments.id, { onDelete: "restrict" }),
    criterionId: text("criterion_id").notNull().references(() => targetProfileCriteria.id, { onDelete: "restrict" }),
    state: text("state").notNull(),
    observedCondition: text("observed_condition").notNull(),
    evidenceItemId: text("evidence_item_id").references(() => evidenceItems.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("baseline_gaps_org_assessment_criterion_unique").on(table.organizationId, table.baselineAssessmentId, table.criterionId),
    check("baseline_gaps_state_check", sql`${table.state} in ('satisfied', 'gap', 'insufficient_evidence', 'not_applicable')`),
    check("baseline_gaps_lifecycle_check", lifecycleValues),
  ],
);

export const resilienceProjects = pgTable(
  "resilience_projects",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("candidate"),
  },
  (table) => [
    check("resilience_projects_status_check", sql`${table.status} in ('candidate', 'planned', 'approved', 'in_progress', 'complete', 'cancelled')`),
    check("resilience_projects_lifecycle_check", lifecycleValues),
  ],
);

export const projectInterventions = pgTable(
  "project_interventions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    projectId: text("project_id").notNull().references(() => resilienceProjects.id, { onDelete: "restrict" }),
    interventionVersionId: text("intervention_version_id").notNull().references(() => interventionVersions.id, { onDelete: "restrict" }),
    rationale: text("rationale").notNull(),
  },
  (table) => [
    uniqueIndex("project_interventions_org_project_version_unique").on(table.organizationId, table.projectId, table.interventionVersionId),
    check("project_interventions_lifecycle_check", lifecycleValues),
  ],
);

export const capitalPlans = pgTable(
  "capital_plans",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
    baselineAssessmentId: text("baseline_assessment_id").notNull().references(() => baselineAssessments.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    planningState: text("planning_state").notNull(),
    decisionBoundary: text("decision_boundary").notNull(),
    selectedScenarioId: text("selected_scenario_id"),
  },
  (table) => [
    check("capital_plans_state_check", sql`${table.planningState} in ('options_available', 'insufficient_evidence', 'no_attractive_path', 'inapplicable')`),
    check("capital_plans_lifecycle_check", lifecycleValues),
  ],
);

export const capitalPlanScenarios = pgTable(
  "capital_plan_scenarios",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    capitalPlanId: text("capital_plan_id").notNull().references(() => capitalPlans.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    totalCostLowCents: integer("total_cost_low_cents").notNull(),
    totalCostHighCents: integer("total_cost_high_cents").notNull(),
    durationDays: integer("duration_days").notNull(),
    dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
    maintenanceRequirements: jsonb("maintenance_requirements").$type<string[]>().notNull().default([]),
    fundingEligibilityState: text("funding_eligibility_state").notNull(),
    modeledBenefitState: text("modeled_benefit_state").notNull(),
    insurerTreatmentState: text("insurer_treatment_state").notNull(),
    rationale: text("rationale").notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
    position: integer("position").notNull(),
  },
  (table) => [
    check("capital_plan_scenarios_cost_check", sql`${table.totalCostLowCents} >= 0 and ${table.totalCostHighCents} >= ${table.totalCostLowCents}`),
    check("capital_plan_scenarios_duration_check", sql`${table.durationDays} >= 0`),
    check("capital_plan_scenarios_funding_check", sql`${table.fundingEligibilityState} in ('unknown', 'potential_candidate', 'not_eligible')`),
    check("capital_plan_scenarios_benefit_check", sql`${table.modeledBenefitState} in ('unavailable', 'not_requested', 'externally_supplied_unverified')`),
    check("capital_plan_scenarios_insurer_check", sql`${table.insurerTreatmentState} in ('unverified', 'no_commitment', 'externally_acknowledged')`),
    check("capital_plan_scenarios_position_check", sql`${table.position} >= 1`),
    check("capital_plan_scenarios_lifecycle_check", lifecycleValues),
  ],
);

export const capitalPlanScenarioProjects = pgTable(
  "capital_plan_scenario_projects",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    scenarioId: text("scenario_id").notNull().references(() => capitalPlanScenarios.id, { onDelete: "restrict" }),
    projectId: text("project_id").notNull().references(() => resilienceProjects.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("capital_scenario_projects_org_pair_unique").on(table.organizationId, table.scenarioId, table.projectId),
    check("capital_scenario_projects_position_check", sql`${table.position} >= 1`),
    check("capital_scenario_projects_lifecycle_check", lifecycleValues),
  ],
);

export const fundingProgrammes = pgTable(
  "funding_programmes",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    canonicalKey: text("canonical_key").notNull(),
    name: text("name").notNull(),
    sponsorName: text("sponsor_name").notNull(),
    programmeType: text("programme_type").notNull(),
    description: text("description").notNull(),
  },
  (table) => [
    uniqueIndex("funding_programmes_org_key_unique").on(table.organizationId, table.canonicalKey),
    check("funding_programmes_type_check", sql`${table.programmeType} in ('public_grant', 'insurer', 'reinsurer', 'lender', 'philanthropic', 'local_government', 'mixed')`),
    check("funding_programmes_lifecycle_check", lifecycleValues),
  ],
);

export const fundingProgrammeVersions = pgTable(
  "funding_programme_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    programmeId: text("programme_id").notNull().references(() => fundingProgrammes.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    governedSourceVersionId: text("governed_source_version_id").notNull().references(() => governedSourceVersions.id, { onDelete: "restrict" }),
    targetProfileVersionId: text("target_profile_version_id").references(() => targetProfileVersions.id, { onDelete: "restrict" }),
    jurisdiction: text("jurisdiction").notNull(),
    hazard: text("hazard").notNull(),
    propertyClasses: jsonb("property_classes").$type<string[]>().notNull().default([]),
    applicationOpensOn: date("application_opens_on", { mode: "string" }).notNull(),
    applicationClosesOn: date("application_closes_on", { mode: "string" }).notNull(),
    maximumAwardCents: integer("maximum_award_cents").notNull(),
    maximumCostShareBps: integer("maximum_cost_share_bps").notNull(),
    currency: text("currency").notNull().default("USD"),
    evidenceRequirements: jsonb("evidence_requirements").$type<string[]>().notNull().default([]),
    paymentConditions: jsonb("payment_conditions").$type<string[]>().notNull().default([]),
    maintenanceObligations: jsonb("maintenance_obligations").$type<string[]>().notNull().default([]),
    limitations: text("limitations").notNull(),
    authorSubject: text("author_subject").notNull(),
    supersedesVersionId: text("supersedes_version_id").references((): AnyPgColumn => fundingProgrammeVersions.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("funding_programme_versions_org_number_unique").on(table.organizationId, table.programmeId, table.versionNumber),
    check("funding_programme_versions_number_check", sql`${table.versionNumber} >= 1`),
    check("funding_programme_versions_window_check", sql`${table.applicationClosesOn} >= ${table.applicationOpensOn}`),
    check("funding_programme_versions_award_check", sql`${table.maximumAwardCents} >= 0`),
    check("funding_programme_versions_share_check", sql`${table.maximumCostShareBps} between 0 and 10000`),
    check("funding_programme_versions_lifecycle_check", lifecycleValues),
  ],
);

export const fundingEligibilityRules = pgTable(
  "funding_eligibility_rules",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    programmeVersionId: text("programme_version_id").notNull().references(() => fundingProgrammeVersions.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    field: text("field").notNull(),
    operator: text("operator").notNull(),
    expectedValues: jsonb("expected_values").$type<string[]>().notNull().default([]),
    required: boolean("required").notNull().default(true),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("funding_eligibility_rules_org_code_unique").on(table.organizationId, table.programmeVersionId, table.code),
    check("funding_eligibility_rules_operator_check", sql`${table.operator} in ('equals', 'one_of', 'includes', 'at_least', 'at_most')`),
    check("funding_eligibility_rules_position_check", sql`${table.position} >= 1`),
    check("funding_eligibility_rules_lifecycle_check", lifecycleValues),
  ],
);

export const fundingProgrammeReviews = pgTable(
  "funding_programme_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    programmeVersionId: text("programme_version_id").notNull().references(() => fundingProgrammeVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    sourceAndRulesChecked: boolean("source_and_rules_checked").notNull().default(false),
    note: text("note").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("funding_programme_reviews_org_version_unique").on(table.organizationId, table.programmeVersionId),
    check("funding_programme_reviews_decision_check", sql`${table.decision} in ('approved', 'changes_requested')`),
    check("funding_programme_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const fundingProgrammePublications = pgTable(
  "funding_programme_publications",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    programmeVersionId: text("programme_version_id").notNull().references(() => fundingProgrammeVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    publisherSubject: text("publisher_subject").notNull(),
    note: text("note").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("funding_programme_publications_org_version_unique").on(table.organizationId, table.programmeVersionId),
    check("funding_programme_publications_decision_check", sql`${table.decision} in ('published', 'rejected')`),
    check("funding_programme_publications_lifecycle_check", lifecycleValues),
  ],
);

export const fundingEligibilityAssessments = pgTable(
  "funding_eligibility_assessments",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    projectId: text("project_id").notNull().references(() => resilienceProjects.id, { onDelete: "restrict" }),
    programmeVersionId: text("programme_version_id").notNull().references(() => fundingProgrammeVersions.id, { onDelete: "restrict" }),
    state: text("state").notNull(),
    inputFacts: jsonb("input_facts").$type<Record<string, string | string[] | number>>().notNull().default({}),
    inputHash: text("input_hash").notNull(),
    reasons: jsonb("reasons").$type<string[]>().notNull().default([]),
    assessedBy: text("assessed_by").notNull(),
    assessedAt: timestamp("assessed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    check("funding_eligibility_assessments_state_check", sql`${table.state} in ('eligible', 'ineligible', 'insufficient_evidence')`),
    check("funding_eligibility_assessments_lifecycle_check", lifecycleValues),
  ],
);

export const fundingEligibilityRuleResults = pgTable(
  "funding_eligibility_rule_results",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    assessmentId: text("assessment_id").notNull().references(() => fundingEligibilityAssessments.id, { onDelete: "restrict" }),
    ruleId: text("rule_id").notNull().references(() => fundingEligibilityRules.id, { onDelete: "restrict" }),
    state: text("state").notNull(),
    observedValue: jsonb("observed_value").$type<string | string[] | number | null>(),
    reason: text("reason").notNull(),
  },
  (table) => [
    uniqueIndex("funding_rule_results_org_pair_unique").on(table.organizationId, table.assessmentId, table.ruleId),
    check("funding_rule_results_state_check", sql`${table.state} in ('matched', 'not_matched', 'insufficient_evidence')`),
    check("funding_rule_results_lifecycle_check", lifecycleValues),
  ],
);

export const fundingApplications = pgTable(
  "funding_applications",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    projectId: text("project_id").notNull().references(() => resilienceProjects.id, { onDelete: "restrict" }),
    programmeVersionId: text("programme_version_id").notNull().references(() => fundingProgrammeVersions.id, { onDelete: "restrict" }),
    eligibilityAssessmentId: text("eligibility_assessment_id").notNull().references(() => fundingEligibilityAssessments.id, { onDelete: "restrict" }),
    requestedAmountCents: integer("requested_amount_cents").notNull(),
    state: text("state").notNull().default("prepared"),
    humanConfirmedBy: text("human_confirmed_by").notNull(),
    preparedAt: timestamp("prepared_at", { withTimezone: true, mode: "string" }).notNull(),
    limitations: text("limitations").notNull(),
  },
  (table) => [
    uniqueIndex("funding_applications_org_project_programme_unique").on(table.organizationId, table.projectId, table.programmeVersionId),
    check("funding_applications_amount_check", sql`${table.requestedAmountCents} > 0`),
    check("funding_applications_state_check", sql`${table.state} in ('prepared', 'submitted_external', 'withdrawn')`),
    check("funding_applications_lifecycle_check", lifecycleValues),
  ],
);

export const capitalStacks = pgTable(
  "capital_stacks",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    projectId: text("project_id").notNull().references(() => resilienceProjects.id, { onDelete: "restrict" }),
    capitalPlanScenarioId: text("capital_plan_scenario_id").references(() => capitalPlanScenarios.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    projectCostCents: integer("project_cost_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    state: text("state").notNull().default("proposed"),
    decisionBoundary: text("decision_boundary").notNull(),
  },
  (table) => [
    check("capital_stacks_cost_check", sql`${table.projectCostCents} > 0`),
    check("capital_stacks_state_check", sql`${table.state} in ('proposed', 'approved', 'cancelled')`),
    check("capital_stacks_lifecycle_check", lifecycleValues),
  ],
);

export const capitalStackContributions = pgTable(
  "capital_stack_contributions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    capitalStackId: text("capital_stack_id").notNull().references(() => capitalStacks.id, { onDelete: "restrict" }),
    programmeVersionId: text("programme_version_id").references(() => fundingProgrammeVersions.id, { onDelete: "restrict" }),
    contributionType: text("contribution_type").notNull(),
    contributorName: text("contributor_name").notNull(),
    sourceReference: text("source_reference").notNull(),
    amountCents: integer("amount_cents").notNull(),
    costShareBps: integer("cost_share_bps").notNull(),
    purpose: text("purpose").notNull(),
  },
  (table) => [
    uniqueIndex("capital_stack_contributions_org_source_unique").on(table.organizationId, table.capitalStackId, table.sourceReference),
    check("capital_stack_contributions_type_check", sql`${table.contributionType} in ('owner', 'grant', 'financing', 'insurer', 'reinsurer', 'local_government', 'philanthropic')`),
    check("capital_stack_contributions_amount_check", sql`${table.amountCents} > 0`),
    check("capital_stack_contributions_share_check", sql`${table.costShareBps} between 1 and 10000`),
    check("capital_stack_contributions_lifecycle_check", lifecycleValues),
  ],
);

export const fundingCommitments = pgTable(
  "funding_commitments",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    contributionId: text("contribution_id").notNull().references(() => capitalStackContributions.id, { onDelete: "restrict" }),
    committedAmountCents: integer("committed_amount_cents").notNull(),
    terms: text("terms").notNull(),
    proposedBy: text("proposed_by").notNull(),
    proposedAt: timestamp("proposed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("funding_commitments_org_contribution_unique").on(table.organizationId, table.contributionId),
    check("funding_commitments_amount_check", sql`${table.committedAmountCents} > 0`),
    check("funding_commitments_lifecycle_check", lifecycleValues),
  ],
);

export const fundingCommitmentEvents = pgTable(
  "funding_commitment_events",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    commitmentId: text("commitment_id").notNull().references(() => fundingCommitments.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    effectiveAmountCents: integer("effective_amount_cents").notNull(),
    rationale: text("rationale").notNull(),
    decidedBy: text("decided_by").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    supersedesEventId: text("supersedes_event_id").references((): AnyPgColumn => fundingCommitmentEvents.id, { onDelete: "restrict" }),
  },
  (table) => [
    check("funding_commitment_events_type_check", sql`${table.eventType} in ('proposed', 'approved', 'corrected', 'cancelled')`),
    check("funding_commitment_events_amount_check", sql`${table.effectiveAmountCents} >= 0`),
    check("funding_commitment_events_lifecycle_check", lifecycleValues),
  ],
);

export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    projectId: text("project_id").notNull().references(() => resilienceProjects.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    dueOn: date("due_on", { mode: "string" }),
    evidenceRequirement: text("evidence_requirement").notNull(),
    paymentEligible: boolean("payment_eligible").notNull().default(false),
    plannedPaymentCents: integer("planned_payment_cents").notNull().default(0),
  },
  (table) => [
    uniqueIndex("project_milestones_org_code_unique").on(table.organizationId, table.projectId, table.code),
    check("project_milestones_position_check", sql`${table.position} >= 1`),
    check("project_milestones_payment_check", sql`${table.plannedPaymentCents} >= 0`),
    check("project_milestones_lifecycle_check", lifecycleValues),
  ],
);

export const projectMilestoneDependencies = pgTable(
  "project_milestone_dependencies",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    milestoneId: text("milestone_id").notNull().references(() => projectMilestones.id, { onDelete: "restrict" }),
    dependsOnMilestoneId: text("depends_on_milestone_id").notNull().references(() => projectMilestones.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("project_milestone_dependencies_org_pair_unique").on(table.organizationId, table.milestoneId, table.dependsOnMilestoneId),
    check("project_milestone_dependencies_self_check", sql`${table.milestoneId} <> ${table.dependsOnMilestoneId}`),
    check("project_milestone_dependencies_lifecycle_check", lifecycleValues),
  ],
);

export const projectMilestoneEvents = pgTable(
  "project_milestone_events",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    milestoneId: text("milestone_id").notNull().references(() => projectMilestones.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    note: text("note").notNull(),
    decidedBy: text("decided_by").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    supersedesEventId: text("supersedes_event_id").references((): AnyPgColumn => projectMilestoneEvents.id, { onDelete: "restrict" }),
  },
  (table) => [
    check("project_milestone_events_type_check", sql`${table.eventType} in ('started', 'evidence_submitted', 'approved', 'changes_requested', 'corrected', 'cancelled')`),
    check("project_milestone_events_lifecycle_check", lifecycleValues),
  ],
);

export const paymentApprovals = pgTable(
  "payment_approvals",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    milestoneId: text("milestone_id").notNull().references(() => projectMilestones.id, { onDelete: "restrict" }),
    contributionId: text("contribution_id").notNull().references(() => capitalStackContributions.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    decision: text("decision").notNull(),
    approverSubject: text("approver_subject").notNull(),
    note: text("note").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    check("payment_approvals_amount_check", sql`${table.amountCents} > 0`),
    check("payment_approvals_decision_check", sql`${table.decision} in ('approved', 'rejected')`),
    check("payment_approvals_lifecycle_check", lifecycleValues),
  ],
);

export const disbursementExports = pgTable(
  "disbursement_exports",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    paymentApprovalId: text("payment_approval_id").notNull().references(() => paymentApprovals.id, { onDelete: "restrict" }),
    exportVersion: integer("export_version").notNull(),
    instructionPayload: jsonb("instruction_payload").$type<Record<string, unknown>>().notNull().default({}),
    payloadHash: text("payload_hash").notNull(),
    humanConfirmed: boolean("human_confirmed").notNull().default(false),
    exportedBy: text("exported_by").notNull(),
    exportedAt: timestamp("exported_at", { withTimezone: true, mode: "string" }).notNull(),
    executionState: text("execution_state").notNull().default("not_executed_export_only"),
  },
  (table) => [
    uniqueIndex("disbursement_exports_org_approval_version_unique").on(table.organizationId, table.paymentApprovalId, table.exportVersion),
    check("disbursement_exports_version_check", sql`${table.exportVersion} >= 1`),
    check("disbursement_exports_execution_check", sql`${table.executionState} = 'not_executed_export_only'`),
    check("disbursement_exports_lifecycle_check", lifecycleValues),
  ],
);

export const projectExternalAssignments = pgTable(
  "project_external_assignments",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    projectId: text("project_id").notNull().references(() => resilienceProjects.id, { onDelete: "restrict" }),
    externalPrincipalId: text("external_principal_id").notNull().references(() => externalPrincipals.id, { onDelete: "restrict" }),
    collaboratorRole: text("collaborator_role").notNull(),
    purpose: text("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    dueOn: date("due_on", { mode: "string" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("project_external_assignments_token_unique").on(table.tokenHash),
    check("project_external_assignments_role_check", sql`${table.collaboratorRole} in ('property_manager', 'board_contributor', 'contractor')`),
    check("project_external_assignments_lifecycle_check", lifecycleValues),
  ],
);

export const stakeholderBenefitLedgerEntries = pgTable(
  "stakeholder_benefit_ledger_entries",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    projectId: text("project_id").notNull().references(() => resilienceProjects.id, { onDelete: "restrict" }),
    stakeholderType: text("stakeholder_type").notNull(),
    stakeholderName: text("stakeholder_name").notNull(),
    expectedBenefitCategory: text("expected_benefit_category").notNull(),
    expectedCostCents: integer("expected_cost_cents").notNull(),
    fundingContributionCents: integer("funding_contribution_cents").notNull(),
    evidenceLevel: text("evidence_level").notNull(),
    source: text("source").notNull(),
    timeframe: text("timeframe").notNull(),
    uncertainty: text("uncertainty").notNull(),
    commitmentState: text("commitment_state").notNull(),
    realisedResponseState: text("realised_response_state").notNull(),
    correctionOfId: text("correction_of_id").references((): AnyPgColumn => stakeholderBenefitLedgerEntries.id, { onDelete: "restrict" }),
  },
  (table) => [
    check("stakeholder_benefit_cost_check", sql`${table.expectedCostCents} >= 0 and ${table.fundingContributionCents} >= 0`),
    check("stakeholder_benefit_evidence_check", sql`${table.evidenceLevel} in ('self_attested', 'documented', 'professional_observation', 'independent_verification', 'jurisdictional_record', 'programme_recognition', 'insurer_acknowledgement', 'modeled_analysis', 'measured_outcome')`),
    check("stakeholder_benefit_commitment_check", sql`${table.commitmentState} in ('none', 'proposed', 'approved', 'cancelled')`),
    check("stakeholder_benefit_response_check", sql`${table.realisedResponseState} in ('not_observed', 'recorded', 'corrected')`),
    check("stakeholder_benefit_lifecycle_check", lifecycleValues),
  ],
);

export const marketPlaybooks = pgTable(
  "market_playbooks",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
  },
  (table) => [
    uniqueIndex("market_playbooks_org_name_unique").on(
      table.organizationId,
      table.name,
    ),
    check("market_playbooks_lifecycle_check", lifecycleValues),
  ],
);

export const playbookVersions = pgTable(
  "playbook_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    playbookId: text("playbook_id")
      .notNull()
      .references(() => marketPlaybooks.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    marketId: text("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "restrict" }),
    programId: text("program_id").references(() => programs.id, {
      onDelete: "restrict",
    }),
    jurisdiction: text("jurisdiction").notNull(),
    peril: text("peril").notNull(),
    propertyClass: text("property_class").notNull(),
    policyForm: text("policy_form"),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    governedSourceVersionId: text("governed_source_version_id").references(
      () => governedSourceVersions.id,
      { onDelete: "restrict" },
    ),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceVersion: text("source_version").notNull(),
    sourceCitation: text("source_citation").notNull(),
    verifyCurrent: boolean("verify_current").notNull().default(true),
    changeSummary: text("change_summary").notNull(),
    contentHash: text("content_hash").notNull(),
    authorSubject: text("author_subject").notNull(),
    supersedesVersionId: text("supersedes_version_id").references(
      (): AnyPgColumn => playbookVersions.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    uniqueIndex("playbook_versions_org_playbook_number_unique").on(
      table.organizationId,
      table.playbookId,
      table.versionNumber,
    ),
    index("playbook_versions_org_scope_effective_idx").on(
      table.organizationId,
      table.marketId,
      table.programId,
      table.jurisdiction,
      table.peril,
      table.propertyClass,
      table.effectiveFrom,
    ),
    check("playbook_versions_number_check", sql`${table.versionNumber} >= 1`),
    check(
      "playbook_versions_hash_check",
      sql`char_length(${table.contentHash}) = 64`,
    ),
    check(
      "playbook_versions_effective_period_check",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
    check("playbook_versions_lifecycle_check", lifecycleValues),
  ],
);

export const playbookRequirements = pgTable(
  "playbook_requirements",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    playbookVersionId: text("playbook_version_id")
      .notNull()
      .references(() => playbookVersions.id, { onDelete: "restrict" }),
    requirementVersionId: text("requirement_version_id")
      .notNull()
      .references(() => requirementVersions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    importance: text("importance").notNull(),
    blocking: boolean("blocking").notNull().default(false),
    acceptedEvidenceTypes: jsonb("accepted_evidence_types")
      .$type<string[]>()
      .notNull()
      .default([]),
    freshnessDays: integer("freshness_days"),
    requiredScopeType: text("required_scope_type").notNull(),
    acceptedSourceTypes: jsonb("accepted_source_types")
      .$type<string[]>()
      .notNull()
      .default([]),
    requiredReviewStatus: text("required_review_status")
      .notNull()
      .default("human_confirmed"),
    deadlineDaysBefore: integer("deadline_days_before"),
    templateKey: text("template_key"),
    deliveryRequirement: text("delivery_requirement"),
    caveat: text("caveat"),
  },
  (table) => [
    uniqueIndex("playbook_requirements_org_version_requirement_unique").on(
      table.organizationId,
      table.playbookVersionId,
      table.requirementVersionId,
    ),
    uniqueIndex("playbook_requirements_org_version_position_unique").on(
      table.organizationId,
      table.playbookVersionId,
      table.position,
    ),
    check(
      "playbook_requirements_importance_check",
      sql`${table.importance} in ('required', 'recommended')`,
    ),
    check(
      "playbook_requirements_position_check",
      sql`${table.position} >= 1`,
    ),
    check(
      "playbook_requirements_blocking_check",
      sql`${table.blocking} = false or ${table.importance} = 'required'`,
    ),
    check(
      "playbook_requirements_freshness_check",
      sql`${table.freshnessDays} is null or ${table.freshnessDays} >= 0`,
    ),
    check(
      "playbook_requirements_deadline_check",
      sql`${table.deadlineDaysBefore} is null or ${table.deadlineDaysBefore} >= 0`,
    ),
    check(
      "playbook_requirements_review_status_check",
      sql`${table.requiredReviewStatus} in ('human_confirmed', 'confirmed', 'approved')`,
    ),
    check("playbook_requirements_lifecycle_check", lifecycleValues),
  ],
);

export const playbookApplicabilityRules = pgTable(
  "playbook_applicability_rules",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    playbookRequirementId: text("playbook_requirement_id")
      .notNull()
      .references(() => playbookRequirements.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    field: text("field").notNull(),
    operator: text("operator").notNull(),
    expectedValues: jsonb("expected_values")
      .$type<string[]>()
      .notNull()
      .default([]),
  },
  (table) => [
    uniqueIndex("playbook_applicability_rules_org_requirement_position_unique").on(
      table.organizationId,
      table.playbookRequirementId,
      table.position,
    ),
    check(
      "playbook_applicability_rules_field_check",
      sql`${table.field} in ('market_id', 'program_id', 'jurisdiction', 'peril', 'property_class', 'policy_form')`,
    ),
    check(
      "playbook_applicability_rules_position_check",
      sql`${table.position} >= 1`,
    ),
    check(
      "playbook_applicability_rules_operator_check",
      sql`${table.operator} in ('equals', 'not_equals', 'one_of', 'not_one_of')`,
    ),
    check(
      "playbook_applicability_rules_values_check",
      sql`jsonb_typeof(${table.expectedValues}) = 'array' and jsonb_array_length(${table.expectedValues}) >= 1`,
    ),
    check("playbook_applicability_rules_lifecycle_check", lifecycleValues),
  ],
);

export const playbookVersionReviews = pgTable(
  "playbook_version_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    playbookVersionId: text("playbook_version_id")
      .notNull()
      .references(() => playbookVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    note: text("note").notNull(),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("playbook_version_reviews_org_version_unique").on(
      table.organizationId,
      table.playbookVersionId,
    ),
    check(
      "playbook_version_reviews_decision_check",
      sql`${table.decision} in ('approved', 'changes_requested')`,
    ),
    check("playbook_version_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const casePlaybookLinks = pgTable(
  "case_playbook_links",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    caseId: text("case_id")
      .notNull()
      .references(() => renewalCases.id, { onDelete: "restrict" }),
    playbookVersionId: text("playbook_version_id")
      .notNull()
      .references(() => playbookVersions.id, { onDelete: "restrict" }),
    destinationMarketId: text("destination_market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "restrict" }),
    destinationProgramId: text("destination_program_id").references(
      () => programs.id,
      { onDelete: "restrict" },
    ),
    linkedAt: timestamp("linked_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    linkedBy: text("linked_by").notNull(),
    supersedesLinkId: text("supersedes_link_id").references(
      (): AnyPgColumn => casePlaybookLinks.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    index("case_playbook_links_org_case_destination_idx").on(
      table.organizationId,
      table.caseId,
      table.destinationMarketId,
      table.destinationProgramId,
      table.linkedAt,
    ),
    check("case_playbook_links_lifecycle_check", lifecycleValues),
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

export const evidenceRequests = pgTable(
  "evidence_requests",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    caseId: text("case_id")
      .notNull()
      .references(() => renewalCases.id, { onDelete: "restrict" }),
    externalPrincipalId: text("external_principal_id").references(
      () => externalPrincipals.id,
      { onDelete: "restrict" },
    ),
    recipientType: text("recipient_type").notNull(),
    recipientLabel: text("recipient_label").notNull(),
    status: text("status").notNull().default("draft"),
    currentVersionId: text("current_version_id"),
    issuedBy: text("issued_by"),
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "string" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    fulfilledAt: timestamp("fulfilled_at", {
      withTimezone: true,
      mode: "string",
    }),
    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
      mode: "string",
    }),
    cancellationReason: text("cancellation_reason"),
  },
  (table) => [
    index("evidence_requests_org_case_status_idx").on(
      table.organizationId,
      table.caseId,
      table.status,
    ),
    check(
      "evidence_requests_recipient_check",
      sql`${table.recipientType} in ('property_manager', 'board_contributor', 'contractor_evidence_contributor', 'other_authorized_contributor')`,
    ),
    check(
      "evidence_requests_status_check",
      sql`${table.status} in ('draft', 'issued', 'fulfilled', 'cancelled')`,
    ),
    check("evidence_requests_lifecycle_check", lifecycleValues),
  ],
);

export const evidenceRequestVersions = pgTable(
  "evidence_request_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    evidenceRequestId: text("evidence_request_id")
      .notNull()
      .references(() => evidenceRequests.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    purpose: text("purpose").notNull(),
    instructions: text("instructions").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true, mode: "string" })
      .notNull(),
    requestedItems: jsonb("requested_items")
      .$type<
        Array<{
          evidenceType: string;
          label: string;
          required: boolean;
          scopeType: string;
          scopeReference?: string;
          guidance: string;
        }>
      >()
      .notNull()
      .default([]),
    confirmedBy: text("confirmed_by").notNull(),
    confirmedAt: timestamp("confirmed_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("evidence_request_versions_org_request_version_unique").on(
      table.organizationId,
      table.evidenceRequestId,
      table.versionNumber,
    ),
    check(
      "evidence_request_versions_number_check",
      sql`${table.versionNumber} >= 1`,
    ),
    check(
      "evidence_request_versions_purpose_check",
      sql`char_length(trim(${table.purpose})) >= 8`,
    ),
    check(
      "evidence_request_versions_instructions_check",
      sql`char_length(trim(${table.instructions})) >= 12`,
    ),
    check("evidence_request_versions_lifecycle_check", lifecycleValues),
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

export const submissionArtifacts = pgTable(
  "submission_artifacts",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    submissionVersionId: text("submission_version_id")
      .notNull()
      .references(() => submissionVersions.id, { onDelete: "restrict" }),
    storageObjectId: text("storage_object_id")
      .notNull()
      .references(() => storageObjects.id, { onDelete: "restrict" }),
    artifactType: text("artifact_type").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    generationRecipeVersion: text("generation_recipe_version").notNull(),
    generatedAt: timestamp("generated_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    uniqueIndex("submission_artifacts_org_version_type_unique").on(
      table.organizationId,
      table.submissionVersionId,
      table.artifactType,
    ),
    index("submission_artifacts_org_hash_type_idx").on(
      table.organizationId,
      table.sha256,
      table.artifactType,
    ),
    check(
      "submission_artifacts_type_check",
      sql`${table.artifactType} in ('pdf', 'zip', 'manifest', 'letter')`,
    ),
    check(
      "submission_artifacts_size_check",
      sql`${table.sizeBytes} > 0`,
    ),
    check(
      "submission_artifacts_hash_check",
      sql`char_length(${table.sha256}) = 64`,
    ),
    check("submission_artifacts_lifecycle_check", lifecycleValues),
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

export const verificationOrganizations = pgTable(
  "verification_organizations",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    legalName: text("legal_name").notNull(),
    organizationType: text("organization_type").notNull(),
    website: text("website"),
    status: text("status").notNull().default("active"),
    limitations: text("limitations").notNull(),
  },
  (table) => [
    uniqueIndex("verification_organizations_org_name_unique").on(table.organizationId, table.legalName),
    check("verification_organizations_status_check", sql`${table.status} in ('active', 'suspended', 'inactive')`),
    check("verification_organizations_lifecycle_check", lifecycleValues),
  ],
);

export const verifiers = pgTable(
  "verifiers",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    verificationOrganizationId: text("verification_organization_id").notNull().references(() => verificationOrganizations.id, { onDelete: "restrict" }),
    externalPrincipalId: text("external_principal_id").references(() => externalPrincipals.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    status: text("status").notNull().default("active"),
  },
  (table) => [
    uniqueIndex("verifiers_org_email_unique").on(table.organizationId, table.email),
    check("verifiers_status_check", sql`${table.status} in ('active', 'suspended', 'inactive')`),
    check("verifiers_lifecycle_check", lifecycleValues),
  ],
);

export const verifierCredentials = pgTable(
  "verifier_credentials",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    verifierId: text("verifier_id").notNull().references(() => verifiers.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    credentialType: text("credential_type").notNull(),
    issuer: text("issuer").notNull(),
    credentialReference: text("credential_reference").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    scope: jsonb("scope").$type<string[]>().notNull().default([]),
    issuedOn: date("issued_on", { mode: "string" }).notNull(),
    expiresOn: date("expires_on", { mode: "string" }).notNull(),
    sourceVersion: text("source_version").notNull(),
    sourceUrl: text("source_url"),
    verifyCurrentStatus: text("verify_current_status").notNull().default("unreviewed"),
    supersedesCredentialId: text("supersedes_credential_id").references((): AnyPgColumn => verifierCredentials.id, { onDelete: "restrict" }),
    authorSubject: text("author_subject").notNull(),
  },
  (table) => [
    uniqueIndex("verifier_credentials_org_verifier_version_unique").on(table.organizationId, table.verifierId, table.versionNumber),
    check("verifier_credentials_version_check", sql`${table.versionNumber} >= 1`),
    check("verifier_credentials_dates_check", sql`${table.expiresOn} >= ${table.issuedOn}`),
    check("verifier_credentials_status_check", sql`${table.verifyCurrentStatus} in ('unreviewed', 'verified_current', 'expired', 'revoked', 'unable_to_verify')`),
    check("verifier_credentials_lifecycle_check", lifecycleValues),
  ],
);

export const verifierCredentialReviews = pgTable(
  "verifier_credential_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    credentialId: text("credential_id").notNull().references(() => verifierCredentials.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    sourceChecked: boolean("source_checked").notNull().default(false),
    note: text("note").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("verifier_credential_reviews_org_credential_unique").on(table.organizationId, table.credentialId),
    check("verifier_credential_reviews_decision_check", sql`${table.decision} in ('approved', 'rejected', 'changes_requested')`),
    check("verifier_credential_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const verificationAssignments = pgTable(
  "verification_assignments",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    projectId: text("project_id").notNull().references(() => resilienceProjects.id, { onDelete: "restrict" }),
    profileVersionId: text("profile_version_id").notNull().references(() => targetProfileVersions.id, { onDelete: "restrict" }),
    verifierId: text("verifier_id").notNull().references(() => verifiers.id, { onDelete: "restrict" }),
    credentialId: text("credential_id").notNull().references(() => verifierCredentials.id, { onDelete: "restrict" }),
    purpose: text("purpose").notNull(),
    scope: jsonb("scope").$type<string[]>().notNull().default([]),
    tokenHash: text("token_hash").notNull(),
    assignedBy: text("assigned_by").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "string" }).notNull(),
    dueOn: date("due_on", { mode: "string" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
    reinspectionOfAssignmentId: text("reinspection_of_assignment_id").references((): AnyPgColumn => verificationAssignments.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("verification_assignments_token_unique").on(table.tokenHash),
    index("verification_assignments_org_project_idx").on(table.organizationId, table.projectId),
    check("verification_assignments_lifecycle_check", lifecycleValues),
  ],
);

export const verificationConflictDeclarations = pgTable(
  "verification_conflict_declarations",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    assignmentId: text("assignment_id").notNull().references(() => verificationAssignments.id, { onDelete: "restrict" }),
    declaration: text("declaration").notNull(),
    conflictState: text("conflict_state").notNull(),
    disclosedRelationships: jsonb("disclosed_relationships").$type<string[]>().notNull().default([]),
    signedBy: text("signed_by").notNull(),
    signedAt: timestamp("signed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("verification_conflicts_org_assignment_unique").on(table.organizationId, table.assignmentId),
    check("verification_conflicts_state_check", sql`${table.conflictState} in ('no_conflict_declared', 'conflict_disclosed', 'unable_to_determine')`),
    check("verification_conflicts_lifecycle_check", lifecycleValues),
  ],
);

export const verificationMethods = pgTable(
  "verification_methods",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    assignmentId: text("assignment_id").notNull().references(() => verificationAssignments.id, { onDelete: "restrict" }),
    methodType: text("method_type").notNull(),
    methodVersion: text("method_version").notNull(),
    performedBy: text("performed_by").notNull(),
    performedAt: timestamp("performed_at", { withTimezone: true, mode: "string" }).notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    measurementJson: jsonb("measurement_json").$type<Record<string, unknown>>().notNull().default({}),
    limitations: text("limitations").notNull(),
  },
  (table) => [
    check("verification_methods_type_check", sql`${table.methodType} in ('desktop_review', 'site_visit', 'photographic_review', 'geolocation_check', 'timestamp_check', 'measurement')`),
    check("verification_methods_location_check", sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} between -90 and 90 and ${table.longitude} between -180 and 180)`),
    check("verification_methods_lifecycle_check", lifecycleValues),
  ],
);

export const verificationFindings = pgTable(
  "verification_findings",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    assignmentId: text("assignment_id").notNull().references(() => verificationAssignments.id, { onDelete: "restrict" }),
    methodId: text("method_id").notNull().references(() => verificationMethods.id, { onDelete: "restrict" }),
    projectInterventionId: text("project_intervention_id").notNull().references(() => projectInterventions.id, { onDelete: "restrict" }),
    criterionId: text("criterion_id").notNull().references(() => targetProfileCriteria.id, { onDelete: "restrict" }),
    conclusion: text("conclusion").notNull(),
    evidenceLevel: text("evidence_level").notNull(),
    statement: text("statement").notNull(),
    limitations: text("limitations").notNull(),
    verifierSubject: text("verifier_subject").notNull(),
    concludedAt: timestamp("concluded_at", { withTimezone: true, mode: "string" }).notNull(),
    signatureHash: text("signature_hash").notNull(),
  },
  (table) => [
    check("verification_findings_conclusion_check", sql`${table.conclusion} in ('conforming', 'nonconforming', 'insufficient_evidence', 'not_observed')`),
    check("verification_findings_evidence_level_check", sql`${table.evidenceLevel} in ('physical_specification', 'verified_installation', 'modelled_vulnerability_reduction', 'modelled_expected_loss_reduction', 'filed_rating_treatment', 'underwriting_treatment', 'financing_or_programme_treatment', 'observed_event_performance', 'claims_evidence')`),
    check("verification_findings_signature_check", sql`char_length(${table.signatureHash}) = 64`),
    check("verification_findings_lifecycle_check", lifecycleValues),
  ],
);

export const verificationFindingEvidenceLinks = pgTable(
  "verification_finding_evidence_links",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    findingId: text("finding_id").notNull().references(() => verificationFindings.id, { onDelete: "restrict" }),
    evidenceVersionId: text("evidence_version_id").notNull().references(() => evidenceVersions.id, { onDelete: "restrict" }),
    relationship: text("relationship").notNull(),
  },
  (table) => [
    uniqueIndex("verification_finding_evidence_unique").on(table.organizationId, table.findingId, table.evidenceVersionId),
    check("verification_finding_evidence_relationship_check", sql`${table.relationship} in ('supports', 'contradicts', 'context_only')`),
    check("verification_finding_evidence_lifecycle_check", lifecycleValues),
  ],
);

export const verificationFindingReviews = pgTable(
  "verification_finding_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    findingId: text("finding_id").notNull().references(() => verificationFindings.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    evidenceAndMethodChecked: boolean("evidence_and_method_checked").notNull().default(false),
    note: text("note").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("verification_finding_reviews_org_finding_unique").on(table.organizationId, table.findingId),
    check("verification_finding_reviews_decision_check", sql`${table.decision} in ('approved', 'rejected', 'changes_requested')`),
    check("verification_finding_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const verificationExceptions = pgTable(
  "verification_exceptions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    assignmentId: text("assignment_id").notNull().references(() => verificationAssignments.id, { onDelete: "restrict" }),
    findingId: text("finding_id").references(() => verificationFindings.id, { onDelete: "restrict" }),
    exceptionType: text("exception_type").notNull(),
    description: text("description").notNull(),
    severity: text("severity").notNull(),
    openedBy: text("opened_by").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    check("verification_exceptions_severity_check", sql`${table.severity} in ('low', 'medium', 'high', 'critical')`),
    check("verification_exceptions_lifecycle_check", lifecycleValues),
  ],
);

export const verificationCorrectiveActions = pgTable(
  "verification_corrective_actions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    exceptionId: text("exception_id").notNull().references(() => verificationExceptions.id, { onDelete: "restrict" }),
    actionType: text("action_type").notNull(),
    description: text("description").notNull(),
    state: text("state").notNull(),
    responsibleSubject: text("responsible_subject").notNull(),
    dueOn: date("due_on", { mode: "string" }),
    evidenceVersionId: text("evidence_version_id").references(() => evidenceVersions.id, { onDelete: "restrict" }),
    recordedBy: text("recorded_by").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "string" }).notNull(),
    supersedesActionId: text("supersedes_action_id").references((): AnyPgColumn => verificationCorrectiveActions.id, { onDelete: "restrict" }),
  },
  (table) => [
    check("verification_corrective_actions_state_check", sql`${table.state} in ('required', 'submitted', 'accepted', 'rejected', 'cancelled')`),
    check("verification_corrective_actions_lifecycle_check", lifecycleValues),
  ],
);

export const verificationCertificates = pgTable(
  "verification_certificates",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    assignmentId: text("assignment_id").notNull().references(() => verificationAssignments.id, { onDelete: "restrict" }),
    certificateNumber: text("certificate_number").notNull(),
    conclusionHash: text("conclusion_hash").notNull(),
    issuedBy: text("issued_by").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "string" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    humanConfirmed: boolean("human_confirmed").notNull().default(false),
    limitations: text("limitations").notNull(),
  },
  (table) => [
    uniqueIndex("verification_certificates_org_number_unique").on(table.organizationId, table.certificateNumber),
    check("verification_certificates_hash_check", sql`char_length(${table.conclusionHash}) = 64`),
    check("verification_certificates_dates_check", sql`${table.expiresAt} > ${table.issuedAt}`),
    check("verification_certificates_lifecycle_check", lifecycleValues),
  ],
);

export const verificationCertificateEvents = pgTable(
  "verification_certificate_events",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    certificateId: text("certificate_id").notNull().references(() => verificationCertificates.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    rationale: text("rationale").notNull(),
    decidedBy: text("decided_by").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    supersedesEventId: text("supersedes_event_id").references((): AnyPgColumn => verificationCertificateEvents.id, { onDelete: "restrict" }),
  },
  (table) => [
    check("verification_certificate_events_type_check", sql`${table.eventType} in ('issued', 'expired', 'revoked', 'reinstated')`),
    check("verification_certificate_events_lifecycle_check", lifecycleValues),
  ],
);

export const maintenanceObligations = pgTable(
  "maintenance_obligations",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    certificateId: text("certificate_id").notNull().references(() => verificationCertificates.id, { onDelete: "restrict" }),
    interventionVersionId: text("intervention_version_id").notNull().references(() => interventionVersions.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    requirement: text("requirement").notNull(),
    recurrenceRule: text("recurrence_rule").notNull(),
    evidenceRequirement: text("evidence_requirement").notNull(),
    nextDueAt: timestamp("next_due_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("maintenance_obligations_org_due_idx").on(table.organizationId, table.nextDueAt),
    check("maintenance_obligations_lifecycle_check", lifecycleValues),
  ],
);

export const maintenanceObligationEvents = pgTable(
  "maintenance_obligation_events",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    obligationId: text("obligation_id").notNull().references(() => maintenanceObligations.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    evidenceVersionId: text("evidence_version_id").references(() => evidenceVersions.id, { onDelete: "restrict" }),
    note: text("note").notNull(),
    recordedBy: text("recorded_by").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    check("maintenance_obligation_events_type_check", sql`${table.eventType} in ('scheduled', 'evidence_refreshed', 'satisfied', 'expired', 'waived')`),
    check("maintenance_obligation_events_lifecycle_check", lifecycleValues),
  ],
);

export const propertyConditionEvents = pgTable(
  "property_condition_events",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
    projectId: text("project_id").references(() => resilienceProjects.id, { onDelete: "restrict" }),
    certificateId: text("certificate_id").references(() => verificationCertificates.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    conditionState: text("condition_state").notNull(),
    evidenceVersionId: text("evidence_version_id").references(() => evidenceVersions.id, { onDelete: "restrict" }),
    observedBy: text("observed_by").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true, mode: "string" }).notNull(),
    note: text("note").notNull(),
  },
  (table) => [
    index("property_condition_events_org_property_idx").on(table.organizationId, table.propertyId, table.observedAt),
    check("property_condition_events_state_check", sql`${table.conditionState} in ('observed_conforming', 'observed_degraded', 'insufficient_evidence', 'not_observed')`),
    check("property_condition_events_lifecycle_check", lifecycleValues),
  ],
);

export const modelProviders = pgTable(
  "model_providers",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    canonicalKey: text("canonical_key").notNull(),
    name: text("name").notNull(),
    providerType: text("provider_type").notNull(),
    website: text("website"),
    status: text("status").notNull().default("active"),
    limitations: text("limitations").notNull(),
  },
  (table) => [
    uniqueIndex("model_providers_org_key_unique").on(table.organizationId, table.canonicalKey),
    check("model_providers_type_check", sql`${table.providerType} in ('catastrophe_model', 'property_risk_model', 'insurer_model', 'programme_model', 'other')`),
    check("model_providers_status_check", sql`${table.status} in ('active', 'suspended', 'inactive')`),
    check("model_providers_lifecycle_check", lifecycleValues),
  ],
);

export const externalModels = pgTable(
  "external_models",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    providerId: text("provider_id").notNull().references(() => modelProviders.id, { onDelete: "restrict" }),
    canonicalKey: text("canonical_key").notNull(),
    name: text("name").notNull(),
    peril: text("peril").notNull(),
    description: text("description").notNull(),
  },
  (table) => [
    uniqueIndex("external_models_org_key_unique").on(table.organizationId, table.canonicalKey),
    check("external_models_lifecycle_check", lifecycleValues),
  ],
);

export const externalModelVersions = pgTable(
  "external_model_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    modelId: text("model_id").notNull().references(() => externalModels.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    versionLabel: text("version_label").notNull(),
    geography: jsonb("geography").$type<string[]>().notNull().default([]),
    propertyClasses: jsonb("property_classes").$type<string[]>().notNull().default([]),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    sourceVersionId: text("source_version_id").notNull().references(() => governedSourceVersions.id, { onDelete: "restrict" }),
    methodologySummary: text("methodology_summary").notNull(),
    usageRights: text("usage_rights").notNull(),
    redistributionRestrictions: text("redistribution_restrictions").notNull(),
    limitations: text("limitations").notNull(),
    status: text("status").notNull().default("draft"),
    authorSubject: text("author_subject").notNull(),
    supersedesVersionId: text("supersedes_version_id").references((): AnyPgColumn => externalModelVersions.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("external_model_versions_org_model_number_unique").on(table.organizationId, table.modelId, table.versionNumber),
    check("external_model_versions_number_check", sql`${table.versionNumber} >= 1`),
    check("external_model_versions_status_check", sql`${table.status} in ('draft', 'active', 'superseded', 'withdrawn')`),
    check("external_model_versions_effective_check", sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`),
    check("external_model_versions_lifecycle_check", lifecycleValues),
  ],
);

export const externalModelVersionReviews = pgTable(
  "external_model_version_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    modelVersionId: text("model_version_id").notNull().references(() => externalModelVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    sourceRightsAndDefinitionsChecked: boolean("source_rights_and_definitions_checked").notNull().default(false),
    note: text("note").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("external_model_reviews_org_version_unique").on(table.organizationId, table.modelVersionId),
    check("external_model_reviews_decision_check", sql`${table.decision} in ('approved', 'changes_requested', 'rejected')`),
    check("external_model_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const externalModelVersionPublications = pgTable(
  "external_model_version_publications",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    modelVersionId: text("model_version_id").notNull().references(() => externalModelVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    publisherSubject: text("publisher_subject").notNull(),
    humanConfirmed: boolean("human_confirmed").notNull().default(false),
    note: text("note").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("external_model_publications_org_version_unique").on(table.organizationId, table.modelVersionId),
    check("external_model_publications_decision_check", sql`${table.decision} in ('published', 'rejected')`),
    check("external_model_publications_lifecycle_check", lifecycleValues),
  ],
);

export const modelInputDefinitions = pgTable(
  "model_input_definitions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    modelVersionId: text("model_version_id").notNull().references(() => externalModelVersions.id, { onDelete: "restrict" }),
    inputKey: text("input_key").notNull(),
    label: text("label").notNull(),
    dataType: text("data_type").notNull(),
    unit: text("unit"),
    allowedValues: jsonb("allowed_values").$type<string[]>().notNull().default([]),
    definition: text("definition").notNull(),
    supportStatus: text("support_status").notNull(),
    transformationBoundary: text("transformation_boundary").notNull(),
    requiredByModel: boolean("required_by_model").notNull().default(false),
  },
  (table) => [
    uniqueIndex("model_inputs_org_version_key_unique").on(table.organizationId, table.modelVersionId, table.inputKey),
    check("model_inputs_type_check", sql`${table.dataType} in ('string', 'number', 'boolean', 'enum', 'date')`),
    check("model_inputs_support_check", sql`${table.supportStatus} in ('supported', 'unsupported', 'requires_provider_confirmation')`),
    check("model_inputs_lifecycle_check", lifecycleValues),
  ],
);

export const modelOutputDefinitions = pgTable(
  "model_output_definitions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    modelVersionId: text("model_version_id").notNull().references(() => externalModelVersions.id, { onDelete: "restrict" }),
    outputKey: text("output_key").notNull(),
    label: text("label").notNull(),
    dataType: text("data_type").notNull(),
    unit: text("unit"),
    definition: text("definition").notNull(),
    limitations: text("limitations").notNull(),
  },
  (table) => [
    uniqueIndex("model_outputs_org_version_key_unique").on(table.organizationId, table.modelVersionId, table.outputKey),
    check("model_outputs_type_check", sql`${table.dataType} in ('string', 'number', 'boolean', 'enum', 'date', 'object')`),
    check("model_outputs_lifecycle_check", lifecycleValues),
  ],
);

export const modelOutputRecords = pgTable(
  "model_output_records",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
    modelVersionId: text("model_version_id").notNull().references(() => externalModelVersions.id, { onDelete: "restrict" }),
    outputDefinitionId: text("output_definition_id").notNull().references(() => modelOutputDefinitions.id, { onDelete: "restrict" }),
    evidenceVersionId: text("evidence_version_id").references(() => evidenceVersions.id, { onDelete: "restrict" }),
    recordedValue: jsonb("recorded_value").$type<Record<string, unknown>>().notNull(),
    asOfDate: date("as_of_date", { mode: "string" }).notNull(),
    sourceAuthority: text("source_authority").notNull(),
    sourceReference: text("source_reference").notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
    limitations: text("limitations").notNull(),
    importedBy: text("imported_by").notNull(),
    humanConfirmed: boolean("human_confirmed").notNull().default(false),
  },
  (table) => [
    index("model_output_records_org_property_idx").on(table.organizationId, table.propertyId, table.asOfDate),
    check("model_output_records_lifecycle_check", lifecycleValues),
  ],
);

export const modelInputMappings = pgTable(
  "model_input_mappings",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
    projectInterventionId: text("project_intervention_id").notNull().references(() => projectInterventions.id, { onDelete: "restrict" }),
    verificationFindingId: text("verification_finding_id").notNull().references(() => verificationFindings.id, { onDelete: "restrict" }),
    verificationCertificateId: text("verification_certificate_id").references(() => verificationCertificates.id, { onDelete: "restrict" }),
    modelVersionId: text("model_version_id").notNull().references(() => externalModelVersions.id, { onDelete: "restrict" }),
    inputDefinitionId: text("input_definition_id").notNull().references(() => modelInputDefinitions.id, { onDelete: "restrict" }),
    preInterventionValue: jsonb("pre_intervention_value").$type<Record<string, unknown>>().notNull(),
    proposedPostInterventionValue: jsonb("proposed_post_intervention_value").$type<Record<string, unknown>>().notNull(),
    transformationMethod: text("transformation_method").notNull(),
    methodologyVersion: text("methodology_version").notNull(),
    confidence: text("confidence").notNull(),
    source: text("source").notNull(),
    limitations: text("limitations").notNull(),
    authorSubject: text("author_subject").notNull(),
    proposedAt: timestamp("proposed_at", { withTimezone: true, mode: "string" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("model_input_mappings_org_property_idx").on(table.organizationId, table.propertyId, table.proposedAt),
    check("model_input_mappings_confidence_check", sql`${table.confidence} in ('low', 'medium', 'high', 'not_assessed')`),
    check("model_input_mappings_expiry_check", sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.proposedAt}`),
    check("model_input_mappings_lifecycle_check", lifecycleValues),
  ],
);

export const modelInputMappingEvidenceLinks = pgTable(
  "model_input_mapping_evidence_links",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    mappingId: text("mapping_id").notNull().references(() => modelInputMappings.id, { onDelete: "restrict" }),
    evidenceVersionId: text("evidence_version_id").notNull().references(() => evidenceVersions.id, { onDelete: "restrict" }),
    relationship: text("relationship").notNull(),
  },
  (table) => [
    uniqueIndex("model_mapping_evidence_org_pair_unique").on(table.organizationId, table.mappingId, table.evidenceVersionId),
    check("model_mapping_evidence_relationship_check", sql`${table.relationship} in ('supports', 'contradicts', 'context_only')`),
    check("model_mapping_evidence_lifecycle_check", lifecycleValues),
  ],
);

export const modelInputMappingReviews = pgTable(
  "model_input_mapping_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    mappingId: text("mapping_id").notNull().references(() => modelInputMappings.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    modelDocumentationChecked: boolean("model_documentation_checked").notNull().default(false),
    verificationChecked: boolean("verification_checked").notNull().default(false),
    note: text("note").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("model_mapping_reviews_org_mapping_unique").on(table.organizationId, table.mappingId),
    check("model_mapping_reviews_decision_check", sql`${table.decision} in ('approved_for_submission', 'changes_requested', 'unsupported')`),
    check("model_mapping_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const modelInputMappingEvents = pgTable(
  "model_input_mapping_events",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    mappingId: text("mapping_id").notNull().references(() => modelInputMappings.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    acceptedValue: jsonb("accepted_value").$type<Record<string, unknown>>(),
    reason: text("reason").notNull(),
    sourceAuthority: text("source_authority").notNull(),
    sourceReference: text("source_reference").notNull(),
    decidedBy: text("decided_by").notNull(),
    humanConfirmed: boolean("human_confirmed").notNull().default(false),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    supersedesEventId: text("supersedes_event_id").references((): AnyPgColumn => modelInputMappingEvents.id, { onDelete: "restrict" }),
  },
  (table) => [
    check("model_mapping_events_type_check", sql`${table.eventType} in ('submitted', 'accepted_by_model_market', 'accepted_with_modification', 'rejected', 'unsupported', 'expired')`),
    check("model_mapping_events_value_check", sql`(${table.eventType} in ('accepted_by_model_market', 'accepted_with_modification') and ${table.acceptedValue} is not null) or (${table.eventType} not in ('accepted_by_model_market', 'accepted_with_modification') and ${table.acceptedValue} is null)`),
    check("model_mapping_events_lifecycle_check", lifecycleValues),
  ],
);

export const recognitionOrganizations = pgTable(
  "recognition_organizations",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    canonicalKey: text("canonical_key").notNull(),
    legalName: text("legal_name").notNull(),
    organizationType: text("organization_type").notNull(),
    status: text("status").notNull().default("active"),
    limitations: text("limitations").notNull(),
  },
  (table) => [
    uniqueIndex("recognition_organizations_org_key_unique").on(table.organizationId, table.canonicalKey),
    check("recognition_organizations_type_check", sql`${table.organizationType} in ('insurer', 'mga', 'reinsurer', 'lender', 'public_programme', 'philanthropic_funder', 'property_operator')`),
    check("recognition_organizations_status_check", sql`${table.status} in ('active', 'suspended', 'inactive')`),
    check("recognition_organizations_lifecycle_check", lifecycleValues),
  ],
);

export const marketCommitments = pgTable(
  "market_commitments",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    committingOrganizationId: text("committing_organization_id").notNull().references(() => recognitionOrganizations.id, { onDelete: "restrict" }),
    canonicalKey: text("canonical_key").notNull(),
    name: text("name").notNull(),
    commitmentType: text("commitment_type").notNull(),
  },
  (table) => [
    uniqueIndex("market_commitments_org_key_unique").on(table.organizationId, table.canonicalKey),
    check("market_commitments_type_check", sql`${table.commitmentType} in ('evidence_review_commitment', 'response_service_level', 'approved_rating_treatment', 'underwriting_reconsideration', 'quote_review', 'capacity_allocation', 'grant_payment', 'milestone_payment', 'financing_product', 'reinsurance_portfolio_review', 'data_sharing_commitment')`),
    check("market_commitments_lifecycle_check", lifecycleValues),
  ],
);

export const marketCommitmentVersions = pgTable(
  "market_commitment_versions",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    commitmentId: text("commitment_id").notNull().references(() => marketCommitments.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    profileVersionId: text("profile_version_id").notNull().references(() => targetProfileVersions.id, { onDelete: "restrict" }),
    modelVersionId: text("model_version_id").references(() => externalModelVersions.id, { onDelete: "restrict" }),
    geography: jsonb("geography").$type<string[]>().notNull().default([]),
    propertyClasses: jsonb("property_classes").$type<string[]>().notNull().default([]),
    evidenceRequired: jsonb("evidence_required").$type<string[]>().notNull().default([]),
    exclusions: jsonb("exclusions").$type<string[]>().notNull().default([]),
    responseOrFinancialAction: text("response_or_financial_action").notNull(),
    authorityScope: text("authority_scope").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    sourceVersionId: text("source_version_id").notNull().references(() => governedSourceVersions.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("draft"),
    limitations: text("limitations").notNull(),
    authorSubject: text("author_subject").notNull(),
    supersedesVersionId: text("supersedes_version_id").references((): AnyPgColumn => marketCommitmentVersions.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("market_commitment_versions_org_commitment_number_unique").on(table.organizationId, table.commitmentId, table.versionNumber),
    check("market_commitment_versions_number_check", sql`${table.versionNumber} >= 1`),
    check("market_commitment_versions_authority_check", sql`${table.authorityScope} in ('review_only', 'rating_treatment', 'underwriting_action', 'financial_action', 'data_sharing')`),
    check("market_commitment_versions_status_check", sql`${table.status} in ('draft', 'published', 'superseded', 'withdrawn')`),
    check("market_commitment_versions_effective_check", sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`),
    check("market_commitment_versions_lifecycle_check", lifecycleValues),
  ],
);

export const marketCommitmentReviews = pgTable(
  "market_commitment_reviews",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    commitmentVersionId: text("commitment_version_id").notNull().references(() => marketCommitmentVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerSubject: text("reviewer_subject").notNull(),
    sourceAndScopeChecked: boolean("source_and_scope_checked").notNull().default(false),
    note: text("note").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("market_commitment_reviews_org_version_unique").on(table.organizationId, table.commitmentVersionId),
    check("market_commitment_reviews_decision_check", sql`${table.decision} in ('approved', 'changes_requested', 'rejected')`),
    check("market_commitment_reviews_lifecycle_check", lifecycleValues),
  ],
);

export const marketCommitmentPublications = pgTable(
  "market_commitment_publications",
  {
    id: text("id").primaryKey(),
    ...tenantColumns(),
    commitmentVersionId: text("commitment_version_id").notNull().references(() => marketCommitmentVersions.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    publisherSubject: text("publisher_subject").notNull(),
    humanConfirmed: boolean("human_confirmed").notNull().default(false),
    note: text("note").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("market_commitment_publications_org_version_unique").on(table.organizationId, table.commitmentVersionId),
    check("market_commitment_publications_decision_check", sql`${table.decision} in ('published', 'rejected')`),
    check("market_commitment_publications_lifecycle_check", lifecycleValues),
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
