export const organizationRoles = [
  "organization_owner",
  "brokerage_administrator",
  "practice_leader",
  "broker",
  "marketer",
  "assistant",
  "client_property_manager",
  "board_contributor",
  "evidence_contributor",
  "underwriter_reviewer",
  "read_only_auditor",
] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export const resourceClasses = [
  "organization",
  "membership",
  "team",
  "book",
  "client",
  "community",
  "property",
  "property_identifier",
  "location",
  "building",
  "market",
  "program",
  "policy",
  "renewal_case",
  "source_document",
  "source_passage",
  "requirement_set",
  "requirement",
  "requirement_version",
  "evidence_item",
  "evidence_version",
  "evidence_requirement_link",
  "contradiction",
  "task",
  "submission",
  "submission_version",
  "submission_item",
  "market_response",
  "renewal_outcome",
  "maintenance_event",
  "idempotency_key",
  "audit_event",
  "invitation",
  "case_assignment",
  "external_principal",
  "external_access_grant",
  "service_account",
  "api_credential",
  "support_access_grant",
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
  sessionId?: string;
}

export interface AuthorizationRequest {
  action: ResourceAction;
  resource: ResourceClass;
  resourceOrganizationId: string;
  caseId?: string;
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
  "property",
  "property_identifier",
  "location",
  "building",
  "policy",
  "renewal_case",
  "source_document",
  "source_passage",
  "evidence_item",
  "evidence_version",
  "evidence_requirement_link",
  "contradiction",
  "task",
  "submission",
  "submission_version",
  "submission_item",
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
    ...writeScopes("book", "client", "market", "program", "requirement_set", "requirement", "requirement_version"),
    "case_assignment:manage",
    "team:manage",
  ]),
  broker: new Set([
    ...readScopes(...resourceClasses),
    ...writeScopes(...commonCaseResources),
    "case_assignment:manage",
  ]),
  marketer: new Set([
    ...readScopes(...commonCaseResources, "market", "program", "requirement_set", "requirement", "requirement_version", "audit_event"),
    ...writeScopes("renewal_case", "source_document", "source_passage", "task", "submission", "submission_version", "submission_item", "market_response", "renewal_outcome"),
  ]),
  assistant: new Set([
    ...readScopes(...commonCaseResources, "requirement", "requirement_version"),
    ...writeScopes("source_document", "source_passage", "evidence_item", "evidence_version", "task", "maintenance_event"),
  ]),
  client_property_manager: new Set([
    ...readScopes("community", "property", "property_identifier", "location", "building", "policy", "renewal_case", "requirement", "requirement_version", "evidence_item", "evidence_version", "task", "maintenance_event"),
    ...writeScopes("evidence_item", "evidence_version", "task", "maintenance_event"),
  ]),
  board_contributor: new Set([
    ...readScopes("community", "property", "policy", "renewal_case", "requirement", "evidence_item", "evidence_version", "task"),
    ...writeScopes("evidence_item", "evidence_version", "task"),
  ]),
  evidence_contributor: new Set([
    ...readScopes("community", "property", "renewal_case", "requirement", "requirement_version", "evidence_item", "evidence_version", "task"),
    ...writeScopes("evidence_item", "evidence_version", "task"),
  ]),
  underwriter_reviewer: new Set([
    ...readScopes("community", "property", "policy", "renewal_case", "source_document", "source_passage", "requirement", "requirement_version", "evidence_item", "evidence_version", "evidence_requirement_link", "contradiction", "submission", "submission_version", "submission_item"),
    ...writeScopes("market_response"),
  ]),
  read_only_auditor: new Set(readScopes(...resourceClasses)),
};

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
