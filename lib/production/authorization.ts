export const organizationRoles = [
  "organization_owner",
  "brokerage_administrator",
  "practice_leader",
  "broker",
  "marketer",
  "assistant",
  "property_operator_administrator",
  "property_manager",
  "client_property_manager",
  "board_contributor",
  "contractor_evidence_contributor",
  "evidence_contributor",
  "independent_verifier",
  "programme_administrator",
  "insurer_mga_reviewer",
  "underwriter_reviewer",
  "lender_funder_reviewer",
  "read_only_auditor",
] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export const resourceClasses = [
  "organization",
  "membership",
  "team",
  "book",
  "client",
  "property_portfolio",
  "portfolio_property",
  "community",
  "property",
  "property_identifier",
  "location",
  "building",
  "parcel",
  "unit_summary",
  "property_scope",
  "property_alias",
  "property_relationship",
  "property_version",
  "market",
  "program",
  "policy",
  "renewal_case",
  "source_document",
  "source_passage",
  "document_processing_job",
  "document_processing_attempt",
  "document_extraction_run",
  "extracted_field",
  "extracted_field_review",
  "document_fact",
  "requirement_set",
  "requirement",
  "requirement_version",
  "market_playbook",
  "playbook_version",
  "playbook_requirement",
  "playbook_applicability_rule",
  "playbook_version_review",
  "case_playbook_link",
  "evidence_item",
  "evidence_version",
  "evidence_requirement_link",
  "contradiction",
  "task",
  "evidence_request",
  "evidence_request_version",
  "submission",
  "submission_version",
  "submission_item",
  "submission_artifact",
  "market_response",
  "renewal_outcome",
  "maintenance_event",
  "idempotency_key",
  "audit_event",
  "invitation",
  "case_assignment",
  "portfolio_assignment",
  "data_access_log",
  "external_principal",
  "external_access_grant",
  "service_account",
  "api_credential",
  "support_access_grant",
  "storage_object",
  "storage_access_grant",
  "malware_scan_result",
  "backup_manifest",
  "backup_manifest_item",
  "import_mapping",
  "import_mapping_version",
  "portfolio_import",
  "import_row",
  "import_receipt",
] as const;

export type ResourceClass = (typeof resourceClasses)[number];
export type ResourceAction = "read" | "create" | "update" | "delete" | "manage";
export type PrincipalType =
  | "membership"
  | "external_collaborator"
  | "external_reviewer"
  | "service_account"
  | "support_administrator";

export interface AuthorizationContext {
  organizationId: string;
  actorSubject: string;
  principalType: PrincipalType;
  role?: OrganizationRole;
  grantedScopes: string[];
  assignedCaseIds?: string[];
  assignedPortfolioIds?: string[];
  assignedCaseScopes?: Record<string, string[]>;
  assignedPortfolioScopes?: Record<string, string[]>;
  sessionId?: string;
}

export interface AuthorizationRequest {
  action: ResourceAction;
  resource: ResourceClass;
  resourceOrganizationId: string;
  caseId?: string;
  portfolioId?: string;
}

export class AuthorizationDeniedError extends Error {
  constructor(message = "The active principal is not authorized for this resource.") {
    super(message);
    this.name = "AuthorizationDeniedError";
  }
}

const allResourceScopes = resourceClasses.flatMap((resource) => [
  `${resource}:read`,
  `${resource}:create`,
  `${resource}:update`,
  `${resource}:delete`,
  `${resource}:manage`,
]);

const readScopes = (...resources: ResourceClass[]) =>
  resources.map((resource) => `${resource}:read`);
const writeScopes = (...resources: ResourceClass[]) =>
  resources.flatMap((resource) => [
    `${resource}:read`,
    `${resource}:create`,
    `${resource}:update`,
  ]);

const commonCaseResources: ResourceClass[] = [
  "community",
  "property_portfolio",
  "portfolio_property",
  "property",
  "property_identifier",
  "location",
  "building",
  "parcel",
  "unit_summary",
  "property_scope",
  "property_alias",
  "property_relationship",
  "property_version",
  "policy",
  "renewal_case",
  "source_document",
  "source_passage",
  "extracted_field",
  "extracted_field_review",
  "document_fact",
  "evidence_item",
  "evidence_version",
  "storage_object",
  "storage_access_grant",
  "malware_scan_result",
  "evidence_requirement_link",
  "contradiction",
  "task",
  "evidence_request",
  "evidence_request_version",
  "submission",
  "submission_version",
  "submission_item",
  "submission_artifact",
  "market_response",
  "renewal_outcome",
  "maintenance_event",
];

const roleScopes: Record<OrganizationRole, ReadonlySet<string>> = {
  organization_owner: new Set(allResourceScopes),
  brokerage_administrator: new Set([
    ...allResourceScopes,
    "support_access_grant:manage",
  ]),
  practice_leader: new Set([
    ...readScopes(...resourceClasses),
    ...writeScopes(...commonCaseResources),
    ...writeScopes("book", "client", "property_portfolio", "portfolio_property", "parcel", "unit_summary", "property_scope", "property_alias", "property_relationship", "property_version", "market", "program", "requirement_set", "requirement", "requirement_version", "market_playbook", "playbook_version", "playbook_requirement", "playbook_applicability_rule", "playbook_version_review", "import_mapping", "import_mapping_version", "portfolio_import", "import_row", "import_receipt", "document_processing_job"),
    "case_assignment:manage",
    "portfolio_assignment:manage",
    "data_access_log:create",
    "team:manage",
  ]),
  broker: new Set([
    ...readScopes(...resourceClasses),
    ...writeScopes(...commonCaseResources),
    ...writeScopes("portfolio_import", "import_row", "import_receipt", "document_processing_job"),
    "case_assignment:manage",
    "portfolio_assignment:read",
    "data_access_log:create",
  ]),
  marketer: new Set([
    ...readScopes(...commonCaseResources, "market", "program", "requirement_set", "requirement", "requirement_version", "market_playbook", "playbook_version", "playbook_requirement", "playbook_applicability_rule", "playbook_version_review", "audit_event", "document_processing_job", "document_processing_attempt", "document_extraction_run"),
    ...writeScopes("renewal_case", "source_document", "source_passage", "extracted_field_review", "document_fact", "document_processing_job", "task", "submission", "submission_version", "submission_item", "market_response", "renewal_outcome"),
    "portfolio_assignment:read",
    "data_access_log:create",
  ]),
  assistant: new Set([
    ...readScopes(...commonCaseResources, "requirement", "requirement_version", "market_playbook", "playbook_version", "playbook_requirement", "playbook_applicability_rule", "playbook_version_review", "document_processing_job", "document_processing_attempt", "document_extraction_run"),
    ...readScopes("book", "import_mapping", "import_mapping_version"),
    ...writeScopes("source_document", "source_passage", "extracted_field_review", "document_fact", "document_processing_job", "evidence_item", "evidence_version", "storage_object", "storage_access_grant", "portfolio_import", "import_row", "import_receipt", "task", "maintenance_event"),
    "portfolio_assignment:read",
    "data_access_log:create",
  ]),
  property_operator_administrator: new Set([
    ...readScopes("book", "client", "community", "property_portfolio", "portfolio_property", "property", "property_identifier", "location", "building", "parcel", "unit_summary", "property_scope", "property_alias", "property_relationship", "property_version", "policy", "renewal_case", "requirement", "requirement_version", "market_playbook", "playbook_version", "playbook_requirement", "case_playbook_link", "evidence_item", "evidence_version", "evidence_requirement_link", "contradiction", "task", "evidence_request", "evidence_request_version", "maintenance_event", "portfolio_assignment"),
    ...writeScopes("community", "property", "property_identifier", "location", "building", "parcel", "unit_summary", "property_scope", "property_alias", "property_relationship", "property_version", "evidence_item", "evidence_version", "storage_object", "storage_access_grant", "task", "evidence_request", "evidence_request_version", "maintenance_event"),
    "case_assignment:manage",
    "portfolio_assignment:manage",
    "data_access_log:create",
  ]),
  property_manager: new Set([
    ...readScopes("community", "property_portfolio", "portfolio_property", "property", "property_identifier", "location", "building", "parcel", "unit_summary", "property_scope", "property_alias", "property_relationship", "property_version", "policy", "renewal_case", "requirement", "requirement_version", "market_playbook", "playbook_version", "playbook_requirement", "case_playbook_link", "evidence_item", "evidence_version", "task", "evidence_request", "evidence_request_version", "maintenance_event", "portfolio_assignment"),
    ...writeScopes("evidence_item", "evidence_version", "storage_object", "storage_access_grant", "task", "maintenance_event"),
    "data_access_log:create",
  ]),
  client_property_manager: new Set([
    ...readScopes("community", "property_portfolio", "portfolio_property", "property", "property_identifier", "location", "building", "parcel", "unit_summary", "property_scope", "property_alias", "property_relationship", "property_version", "policy", "renewal_case", "requirement", "requirement_version", "market_playbook", "playbook_version", "playbook_requirement", "case_playbook_link", "evidence_item", "evidence_version", "task", "evidence_request", "evidence_request_version", "maintenance_event"),
    ...writeScopes("evidence_item", "evidence_version", "storage_object", "storage_access_grant", "task", "maintenance_event"),
    "portfolio_assignment:read",
    "data_access_log:create",
  ]),
  board_contributor: new Set([
    ...readScopes("community", "property", "policy", "renewal_case", "requirement", "market_playbook", "playbook_version", "playbook_requirement", "case_playbook_link", "evidence_item", "evidence_version", "task", "evidence_request", "evidence_request_version"),
    ...writeScopes("evidence_item", "evidence_version", "storage_object", "storage_access_grant", "task"),
    "portfolio_assignment:read",
    "data_access_log:create",
  ]),
  contractor_evidence_contributor: new Set([
    ...readScopes("community", "property", "building", "parcel", "unit_summary", "property_scope", "renewal_case", "requirement", "evidence_item", "evidence_version", "task", "evidence_request", "evidence_request_version", "portfolio_assignment"),
    ...writeScopes("evidence_item", "evidence_version", "storage_object", "storage_access_grant", "task"),
    "data_access_log:create",
  ]),
  evidence_contributor: new Set([
    ...readScopes("community", "property", "renewal_case", "requirement", "requirement_version", "market_playbook", "playbook_version", "playbook_requirement", "case_playbook_link", "evidence_item", "evidence_version", "task", "evidence_request", "evidence_request_version"),
    ...writeScopes("evidence_item", "evidence_version", "storage_object", "storage_access_grant", "task"),
    "portfolio_assignment:read",
    "data_access_log:create",
  ]),
  independent_verifier: new Set([
    ...readScopes("community", "property_portfolio", "portfolio_property", "property", "property_identifier", "location", "building", "parcel", "unit_summary", "property_scope", "property_version", "renewal_case", "requirement", "requirement_version", "evidence_item", "evidence_version", "evidence_requirement_link", "contradiction", "task", "maintenance_event", "portfolio_assignment"),
    "data_access_log:create",
  ]),
  programme_administrator: new Set([
    ...readScopes("book", "client", "community", "property_portfolio", "portfolio_property", "property", "property_identifier", "location", "building", "parcel", "unit_summary", "property_scope", "property_version", "renewal_case", "evidence_item", "evidence_version", "evidence_requirement_link", "task", "maintenance_event", "audit_event", "portfolio_assignment"),
    ...writeScopes("task", "maintenance_event"),
    "portfolio_assignment:manage",
    "data_access_log:create",
  ]),
  insurer_mga_reviewer: new Set([
    ...readScopes("community", "property", "policy", "renewal_case", "source_document", "source_passage", "extracted_field", "extracted_field_review", "document_fact", "requirement", "requirement_version", "market_playbook", "playbook_version", "playbook_requirement", "playbook_applicability_rule", "playbook_version_review", "case_playbook_link", "evidence_item", "evidence_version", "evidence_requirement_link", "contradiction", "submission", "submission_version", "submission_item", "submission_artifact", "portfolio_assignment"),
    ...writeScopes("market_response"),
    "data_access_log:create",
  ]),
  underwriter_reviewer: new Set([
    ...readScopes("community", "property", "policy", "renewal_case", "source_document", "source_passage", "extracted_field", "extracted_field_review", "document_fact", "requirement", "requirement_version", "market_playbook", "playbook_version", "playbook_requirement", "playbook_applicability_rule", "playbook_version_review", "case_playbook_link", "evidence_item", "evidence_version", "evidence_requirement_link", "contradiction", "submission", "submission_version", "submission_item", "submission_artifact"),
    ...writeScopes("market_response"),
    "portfolio_assignment:read",
    "data_access_log:create",
  ]),
  lender_funder_reviewer: new Set([
    ...readScopes("community", "property_portfolio", "portfolio_property", "property", "property_identifier", "location", "building", "parcel", "unit_summary", "property_scope", "property_version", "renewal_case", "evidence_item", "evidence_version", "evidence_requirement_link", "task", "maintenance_event", "portfolio_assignment"),
    "data_access_log:create",
  ]),
  read_only_auditor: new Set([
    ...readScopes(...resourceClasses),
    "data_access_log:create",
  ]),
};

const assignmentRestrictedRoles = new Set<OrganizationRole>([
  "broker",
  "marketer",
  "assistant",
  "property_operator_administrator",
  "property_manager",
  "client_property_manager",
  "board_contributor",
  "contractor_evidence_contributor",
  "evidence_contributor",
  "independent_verifier",
  "programme_administrator",
  "insurer_mga_reviewer",
  "underwriter_reviewer",
  "lender_funder_reviewer",
]);

function hasScope(scopes: ReadonlySet<string> | string[], request: AuthorizationRequest) {
  const exact = `${request.resource}:${request.action}`;
  if (Array.isArray(scopes))
    return (
      scopes.includes(exact) ||
      scopes.includes(`${request.resource}:manage`) ||
      scopes.includes("*")
    );
  return (
    scopes.has(exact) ||
    scopes.has(`${request.resource}:manage`) ||
    scopes.has("*")
  );
}

export function assertAuthorized(
  context: AuthorizationContext,
  request: AuthorizationRequest,
) {
  if (
    !context.organizationId?.trim() ||
    !context.actorSubject?.trim() ||
    context.organizationId !== request.resourceOrganizationId
  )
    throw new AuthorizationDeniedError();

  if (request.caseId && context.assignedCaseIds) {
    if (!context.assignedCaseIds.includes(request.caseId))
      throw new AuthorizationDeniedError("The principal is not assigned to this case.");
    const assignmentScopes = context.assignedCaseScopes?.[request.caseId];
    if (assignmentScopes && !hasScope(assignmentScopes, request))
      throw new AuthorizationDeniedError(
        "The case assignment does not grant this operation.",
      );
  }

  if (request.portfolioId && context.assignedPortfolioIds) {
    if (!context.assignedPortfolioIds.includes(request.portfolioId))
      throw new AuthorizationDeniedError(
        "The principal is not assigned to this portfolio.",
      );
    const assignmentScopes =
      context.assignedPortfolioScopes?.[request.portfolioId];
    if (assignmentScopes && !hasScope(assignmentScopes, request))
      throw new AuthorizationDeniedError(
        "The portfolio assignment does not grant this operation.",
      );
  }

  if (context.principalType === "membership") {
    if (!context.role || !hasScope(roleScopes[context.role], request))
      throw new AuthorizationDeniedError();
    return;
  }

  if (!hasScope(context.grantedScopes, request))
    throw new AuthorizationDeniedError();
}

export function assertOrganizationBootstrap(context: AuthorizationContext) {
  if (
    !context.actorSubject?.trim() ||
    !["service_account", "support_administrator"].includes(
      context.principalType,
    ) ||
    !context.grantedScopes.includes("organization:bootstrap")
  )
    throw new AuthorizationDeniedError(
      "Organization provisioning requires explicit bootstrap authority.",
    );
}

export function scopesForRole(role: OrganizationRole) {
  return [...roleScopes[role]].sort();
}

export function roleRequiresAssignment(role: OrganizationRole) {
  return assignmentRestrictedRoles.has(role);
}
