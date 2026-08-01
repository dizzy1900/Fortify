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
      sql`${table.role} in ('organization_owner', 'brokerage_administrator', 'practice_leader', 'broker', 'marketer', 'assistant', 'client_property_manager', 'board_contributor', 'evidence_contributor', 'underwriter_reviewer', 'read_only_auditor')`,
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
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
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
    check("case_assignments_lifecycle_check", lifecycleValues),
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
