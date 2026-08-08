import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { boundedContextIds } from "../lib/production/kernel/operations.ts";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function filesUnder(directory) {
  const absolute = path.join(root, directory);
  return fs
    .readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => {
      const relative = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(relative) : [relative];
    })
    .map((file) => file.split(path.sep).join("/"))
    .sort();
}

function quotedArray(source, declaration) {
  const match = source.match(
    new RegExp(`export const ${declaration} = \\[([\\s\\S]*?)\\] as const;`),
  );
  if (!match) throw new Error(`Unable to locate ${declaration}.`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function range(items, start, end) {
  const first = items.indexOf(start);
  const last = items.indexOf(end);
  if (first < 0 || last < first)
    throw new Error(`Invalid inventory range ${start}..${end}.`);
  return items.slice(first, last + 1);
}

function assign(ownership, context, artifacts) {
  for (const artifact of artifacts) {
    const existing = ownership.get(artifact);
    if (existing)
      throw new Error(
        `${artifact} is assigned to both ${existing} and ${context}.`,
      );
    ownership.set(artifact, context);
  }
}

function requireComplete(kind, artifacts, ownership) {
  const missing = artifacts.filter((artifact) => !ownership.has(artifact));
  const unexpected = [...ownership].filter(
    ([artifact]) => !artifacts.includes(artifact),
  );
  if (missing.length || unexpected.length)
    throw new Error(
      `${kind} ownership is incomplete. Missing: ${missing.join(", ") || "none"}. Unexpected: ${unexpected.map(([artifact]) => artifact).join(", ") || "none"}.`,
    );
}

const schemaSource = read("db/production/schema.ts");
const tables = [
  ...schemaSource.matchAll(/export const (\w+) = pgTable\(/g),
].map((match) => match[1]);
const tableOwnership = new Map();
assign(tableOwnership, "platform", ["organizations"]);
assign(
  tableOwnership,
  "identity_access",
  range(tables, "identities", "supportAccessGrants"),
);
assign(
  tableOwnership,
  "evidence_custody",
  range(tables, "storageObjects", "backupManifestItems"),
);
assign(
  tableOwnership,
  "portfolio_import",
  range(tables, "importMappings", "importReceipts"),
);
assign(
  tableOwnership,
  "portfolio_property",
  range(tables, "books", "propertyVersions"),
);
assign(
  tableOwnership,
  "case_workflow",
  range(tables, "markets", "renewalCases"),
);
assign(
  tableOwnership,
  "identity_access",
  range(tables, "caseAssignments", "externalAccessGrants"),
);
assign(
  tableOwnership,
  "document_intelligence",
  range(tables, "sourceDocuments", "documentFacts"),
);
assign(
  tableOwnership,
  "source_governance",
  range(tables, "requirementSets", "sourceChangeAlerts"),
);
assign(
  tableOwnership,
  "resilience_planning",
  range(tables, "targetProfiles", "capitalPlanScenarioProjects"),
);
assign(
  tableOwnership,
  "funding_execution",
  range(tables, "fundingProgrammes", "stakeholderBenefitLedgerEntries"),
);
assign(
  tableOwnership,
  "market_playbooks",
  range(tables, "marketPlaybooks", "casePlaybookLinks"),
);
assign(
  tableOwnership,
  "case_workflow",
  range(tables, "evidenceItems", "maintenanceEvents"),
);
assign(
  tableOwnership,
  "independent_verification",
  range(tables, "verificationOrganizations", "propertyConditionEvents"),
);
assign(
  tableOwnership,
  "model_recognition",
  range(tables, "modelProviders", "marketCommitmentPublications"),
);
assign(
  tableOwnership,
  "market_recognition",
  range(tables, "recognitionSubmissionBindings", "maintenanceRollForwards"),
);
assign(
  tableOwnership,
  "programme_intelligence",
  range(tables, "programmeCohorts", "analyticsQueryReceipts"),
);
assign(
  tableOwnership,
  "integrations",
  range(tables, "integrationConnections", "integrationProviderHealthChecks"),
);
assign(
  tableOwnership,
  "platform",
  range(tables, "idempotencyKeys", "requestRateLimitWindows"),
);
requireComplete("Table", tables, tableOwnership);

const authorizationSource = read("lib/production/authorization.ts");
const resources = quotedArray(authorizationSource, "resourceClasses");
const resourceOwnership = new Map();
assign(resourceOwnership, "platform", ["organization"]);
assign(
  resourceOwnership,
  "identity_access",
  range(resources, "membership", "team"),
);
assign(
  resourceOwnership,
  "portfolio_property",
  range(resources, "book", "property_version"),
);
assign(
  resourceOwnership,
  "case_workflow",
  range(resources, "market", "renewal_case"),
);
assign(
  resourceOwnership,
  "document_intelligence",
  range(resources, "source_document", "document_fact"),
);
assign(
  resourceOwnership,
  "source_governance",
  range(resources, "requirement_set", "source_change_alert"),
);
assign(
  resourceOwnership,
  "resilience_planning",
  range(resources, "target_profile", "capital_plan_scenario_project"),
);
assign(
  resourceOwnership,
  "funding_execution",
  range(resources, "funding_programme", "stakeholder_benefit_ledger_entry"),
);
assign(
  resourceOwnership,
  "independent_verification",
  range(resources, "verification_organization", "property_condition_event"),
);
assign(
  resourceOwnership,
  "model_recognition",
  range(resources, "model_provider", "market_commitment_publication"),
);
assign(
  resourceOwnership,
  "market_recognition",
  range(
    resources,
    "recognition_submission_binding",
    "maintenance_roll_forward",
  ),
);
assign(
  resourceOwnership,
  "programme_intelligence",
  range(resources, "programme_cohort", "analytics_query_receipt"),
);
assign(
  resourceOwnership,
  "integrations",
  range(
    resources,
    "integration_connection",
    "integration_provider_health_check",
  ),
);
assign(
  resourceOwnership,
  "market_playbooks",
  range(resources, "market_playbook", "case_playbook_link"),
);
assign(
  resourceOwnership,
  "case_workflow",
  range(resources, "evidence_item", "maintenance_event"),
);
assign(resourceOwnership, "platform", ["idempotency_key", "audit_event"]);
assign(
  resourceOwnership,
  "identity_access",
  range(resources, "invitation", "support_access_grant"),
);
assign(
  resourceOwnership,
  "evidence_custody",
  range(resources, "storage_object", "backup_manifest_item"),
);
assign(
  resourceOwnership,
  "portfolio_import",
  range(resources, "import_mapping", "import_receipt"),
);
requireComplete("Authorization resource", resources, resourceOwnership);

const productionFamilyContexts = {
  access: "identity_access",
  memberships: "identity_access",
  brokerage: "case_workflow",
  communities: "portfolio_property",
  "property-graph": "portfolio_property",
  documents: "document_intelligence",
  funding: "funding_execution",
  integrations: "integrations",
  "model-recognition": "model_recognition",
  playbooks: "market_playbooks",
  "portfolio-imports": "portfolio_import",
  "programme-analytics": "programme_intelligence",
  recognition: "market_recognition",
  "resilience-planning": "resilience_planning",
  sources: "source_governance",
  storage: "evidence_custody",
  verification: "independent_verification",
};

const routes = filesUnder("app/api").filter((file) =>
  file.endsWith("/route.ts"),
);
const routeOwnership = new Map();
for (const route of routes) {
  const relative = route.slice("app/api/".length);
  let context;
  if (relative.startsWith("production/")) {
    const family = relative.split("/")[1];
    context = productionFamilyContexts[family];
  } else if (relative.startsWith("auth/")) context = "identity_access";
  else if (relative === "health/route.ts" || relative === "ready/route.ts")
    context = "platform";
  else context = "sandbox_compatibility";
  if (!context) throw new Error(`No route owner for ${route}.`);
  assign(routeOwnership, context, [route]);
}
requireComplete("Route", routes, routeOwnership);

const legacyServiceFiles = filesUnder("lib/production").filter((file) =>
  /-(service|http)\.ts$/.test(file),
);
const contextModuleFiles = filesUnder("lib/production/contexts").filter(
  (file) => file.endsWith(".ts"),
);
const serviceFiles = [...legacyServiceFiles, ...contextModuleFiles].sort();
const servicePrefixContexts = {
  "access-control": "identity_access",
  community: "portfolio_property",
  "property-graph": "portfolio_property",
  "portfolio-import": "portfolio_import",
  "brokerage-case": "case_workflow",
  "document-pipeline": "document_intelligence",
  "governed-source": "source_governance",
  "market-playbook": "market_playbooks",
  "resilience-planning": "resilience_planning",
  "funding-project": "funding_execution",
  verification: "independent_verification",
  "model-recognition": "model_recognition",
  "recognition-submission": "market_recognition",
  "programme-analytics": "programme_intelligence",
  integration: "integrations",
  identity: "identity_access",
  storage: "evidence_custody",
};
const serviceOwnership = new Map();
for (const file of serviceFiles) {
  const contextModule = file.match(/^lib\/production\/contexts\/([^/]+)\//);
  const name = path.basename(file).replace(/-(service|http)\.ts$/, "");
  const context = contextModule
    ? contextModule[1].replaceAll("-", "_")
    : servicePrefixContexts[name];
  if (!context) throw new Error(`No service owner for ${file}.`);
  if (!boundedContextIds.includes(context))
    throw new Error(`Unknown bounded context ${context} for ${file}.`);
  assign(serviceOwnership, context, [file]);
}
requireComplete("Service", serviceFiles, serviceOwnership);

const directCrossContextDependencies = [];
const crossContextPortDependencies = [];
const dependencySourceFiles = serviceFiles.filter(
  (file) => !file.endsWith("-http.ts"),
);
for (const file of dependencySourceFiles) {
  const sourceContext = serviceOwnership.get(file);
  const source = read(file);
  for (const match of source.matchAll(/from\s+["'](@\/[^"']+)["']/g)) {
    const candidate = `${match[1].slice(2)}.ts`;
    const targetContext = serviceOwnership.get(candidate);
    if (!targetContext || targetContext === sourceContext) continue;
    const dependency = {
      source: file,
      sourceContext,
      target: candidate,
      targetContext,
    };
    if (/\/contexts\/[^/]+\/[^/]+-port\.ts$/.test(candidate))
      crossContextPortDependencies.push(dependency);
    else directCrossContextDependencies.push(dependency);
  }
}
if (directCrossContextDependencies.length)
  throw new Error(
    `Direct cross-context service dependencies are forbidden. Depend on an explicit port instead: ${directCrossContextDependencies
      .map(
        (item) =>
          `${item.source} (${item.sourceContext}) -> ${item.target} (${item.targetContext})`,
      )
      .join(", ")}.`,
  );

const componentContexts = {
  "access-control-workspace.tsx": "identity_access",
  "brokerage-case-workspace.tsx": "case_workflow",
  "document-review-workspace.tsx": "document_intelligence",
  "funding-project-workspace.tsx": "funding_execution",
  "governed-source-workspace.tsx": "source_governance",
  "integration-operations-workspace.tsx": "integrations",
  "market-playbook-workspace.tsx": "market_playbooks",
  "market-recognition-workspace.tsx": "market_recognition",
  "model-recognition-workspace.tsx": "model_recognition",
  "portfolio-import-workspace.tsx": "portfolio_import",
  "programme-analytics-workspace.tsx": "programme_intelligence",
  "property-graph-workspace.tsx": "portfolio_property",
  "resilience-planning-workspace.tsx": "resilience_planning",
  "verification-workspace.tsx": "independent_verification",
  "workspace-view.tsx": "sandbox_compatibility",
};
const dtoInventory = [];
for (const [component, context] of Object.entries(componentContexts)) {
  const file = `components/${component}`;
  const source = read(file);
  for (const match of source.matchAll(
    /(?:type|interface)\s+(\w*Workspace\w*)\s*(?:=|\{)/g,
  )) {
    const excerpt = source.slice(match.index, match.index + 160);
    const sharedContract = /\w+WorkspaceResponse/.test(excerpt);
    dtoInventory.push({
      file,
      name: match[1],
      context,
      decision: sharedContract ? "keep_shared_contract" : "merge",
      target: sharedContract
        ? `lib/contracts/${context === "portfolio_property" ? "property-graph" : context.replaceAll("_", "-")}.ts`
        : `lib/contracts/${context.replaceAll("_", "-")}.ts`,
    });
  }
}

const runtimeRoots = ["lib", "app", "components", "scripts"];
const runtimeSources = runtimeRoots.flatMap((directory) =>
  filesUnder(directory)
    .filter((file) => /\.(ts|tsx|mjs)$/.test(file))
    .filter((file) => file !== "db/production/schema.ts")
    .map((file) => [file, read(file)]),
);
const tableReferences = new Map(
  tables.map((table) => [
    table,
    runtimeSources
      .filter(([, source]) => source.includes(`schema.${table}`))
      .map(([file]) => file),
  ]),
);

const tableDecisions = new Map(
  tables.map((table) => [
    table,
    { decision: "keep", note: "Owned runtime record." },
  ]),
);
tableDecisions.set("teams", {
  decision: "keep",
  note: "Identity/access aggregate retained for membership and assignment foreign-key integrity despite no direct runtime query.",
});
tableDecisions.set("marketResponses", {
  decision: "merge",
  note: "Legacy sandbox response row; migrate compatibility reads to the separated recognition response ledgers before retirement.",
});
tableDecisions.set("renewalOutcomes", {
  decision: "merge",
  note: "Legacy sandbox outcome row; migrate to explicit recognition closure and outcome events before retirement.",
});
tableDecisions.set("maintenanceEvents", {
  decision: "merge",
  note: "Legacy sandbox maintenance row; migrate to governed maintenance obligations, condition events, and roll-forwards before retirement.",
});
for (const table of [
  "tasks",
  "marketResponses",
  "renewalOutcomes",
  "maintenanceEvents",
])
  if (
    (tableReferences.get(table) ?? []).every((file) =>
      file.includes("seed-migration"),
    )
  )
    tableDecisions.set(table, {
      ...(tableDecisions.get(table) ?? { decision: "keep" }),
      note:
        tableDecisions.get(table)?.note ??
        "Preserved only for deterministic sandbox migration; production case-first replacement required before retirement.",
    });

function grouped(artifacts, ownership) {
  return Object.fromEntries(
    boundedContextIds.map((context) => [
      context,
      artifacts.filter((artifact) => ownership.get(artifact) === context),
    ]),
  );
}

function bulletList(items) {
  return items.length ? items.map((item) => `\`${item}\``).join(", ") : "None.";
}

const tablesByContext = grouped(tables, tableOwnership);
const resourcesByContext = grouped(resources, resourceOwnership);
const routesByContext = grouped(routes, routeOwnership);
const servicesByContext = grouped(serviceFiles, serviceOwnership);
const duplicateDtos = dtoInventory.filter((item) => item.decision === "merge");
const decisionRows = [...tableDecisions]
  .filter(
    ([, value]) =>
      value.decision !== "keep" || value.note !== "Owned runtime record.",
  )
  .map(
    ([table, value]) =>
      `| \`${table}\` | ${tableOwnership.get(table)} | ${value.decision} | ${value.note} |`,
  );

const lines = [
  "# Architecture inventory and bounded-context decisions",
  "",
  "Generated by `npm run inventory:architecture:print`; enforced by `npm run inventory:architecture`. Do not edit generated counts or ownership lists without changing the source catalog and regenerating this file.",
  "",
  "## Measured inventory",
  "",
  `- ${tables.length} PostgreSQL tables: ${tableOwnership.size}/${tables.length} have exactly one bounded-context owner.`,
  `- ${resources.length} authorization resources: ${resourceOwnership.size}/${resources.length} have exactly one bounded-context owner.`,
  `- ${routes.length} API routes: ${routeOwnership.size}/${routes.length} have exactly one bounded-context owner, including isolated sandbox compatibility routes.`,
  `- ${serviceFiles.length} production service/HTTP/context modules: ${serviceOwnership.size}/${serviceFiles.length} have exactly one bounded-context owner.`,
  `- ${dtoInventory.length} client workspace DTO declarations: ${dtoInventory.length - duplicateDtos.length} use a shared contract and ${duplicateDtos.length} are explicit merge work.`,
  `- ${directCrossContextDependencies.length} direct cross-context service dependencies; ${crossContextPortDependencies.length} explicit cross-context port dependency.`,
  "",
  "This inventory is architecture evidence, not a claim that C1 is complete. It creates the fail-closed ownership baseline required before schema or route additions. A new artifact that lacks exactly one owner fails validation.",
  "",
  "## Bounded contexts",
  "",
  ...boundedContextIds.flatMap((context) => [
    `### ${context}`,
    "",
    `Tables (${tablesByContext[context].length}): ${bulletList(tablesByContext[context])}`,
    "",
    `Authorization resources (${resourcesByContext[context].length}): ${bulletList(resourcesByContext[context])}`,
    "",
    `API routes (${routesByContext[context].length}): ${bulletList(routesByContext[context])}`,
    "",
    `Service/HTTP modules (${servicesByContext[context].length}): ${bulletList(servicesByContext[context])}`,
    "",
  ]),
  "## Keep, merge, and retirement decisions",
  "",
  "No production table or route is deleted in this slice. The deterministic Colorado sandbox remains isolated and compatible. Legacy outcome rows are merge candidates, not evidence that separated recognition outcomes can be collapsed.",
  "",
  "| Artifact | Owner | Decision | Reason and safe successor |",
  "| --- | --- | --- | --- |",
  ...decisionRows,
  "| `app/api/artifacts`, `app/api/evidence`, `app/api/notices`, `app/api/reset`, `app/api/state` | sandbox_compatibility | keep | Preserve the deterministic Colorado regression surface; production navigation and clients must not call these routes. |",
  "| All current production routes | assigned context | keep | Retain until a case-first compatibility route has executable parity and callers have migrated. |",
  "",
  "## DTO convergence decisions",
  "",
  "The property-graph and integration presenters and clients now compile against bounded-context contracts in `lib/contracts`. Remaining client-owned workspace DTOs must merge into bounded-context contracts; none may become a second authority.",
  "",
  "| Client declaration | Owner | Decision | Contract target |",
  "| --- | --- | --- | --- |",
  ...dtoInventory.map(
    (item) =>
      `| \`${item.file}:${item.name}\` | ${item.context} | ${item.decision} | \`${item.target}\` |`,
  ),
  "",
  "## Dependency boundaries",
  "",
  "Context-owned service modules may not import another context's service implementation. Cross-context collaboration must target an explicit `-port.ts` contract and be composed by an HTTP/runtime adapter. The gate currently proves zero direct implementation dependencies and records the following explicit port edges:",
  "",
  ...(crossContextPortDependencies.length
    ? crossContextPortDependencies.map(
        (item) =>
          `- \`${item.source}\` (${item.sourceContext}) -> \`${item.target}\` (${item.targetContext})`,
      )
    : ["- None."]),
  "",
  "## Service split order",
  "",
  "Large services remain behaviorally intact in this slice. Split work proceeds within the assigned owner: integration, identity, portfolio import, market playbooks, brokerage cases, document intelligence, storage, governed sources, then the remaining contexts. Cross-context reads must go through explicit query ports; commands retain tenant transaction, audit, error, and idempotency metadata from the shared semantic kernel.",
  "",
  "## Addition gate",
  "",
  "Before adding a table, authorization resource, API route, service/HTTP module, or client workspace DTO: assign exactly one bounded-context owner, record keep/merge/retire intent, regenerate this inventory, and pass the architecture gate. Missing or duplicate ownership fails closed.",
  "",
].join("\n");

const target = path.join(root, "docs/ARCHITECTURE_INVENTORY.md");
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== lines) {
    console.error(
      "Architecture inventory drifted. Run npm run inventory:architecture:print and update docs/ARCHITECTURE_INVENTORY.md.",
    );
    process.exit(1);
  }
  console.log(
    `Architecture inventory passed: ${tables.length} tables, ${resources.length} resources, ${routes.length} routes, ${serviceFiles.length} service/HTTP/context modules, ${dtoInventory.length} workspace DTO declarations, ${directCrossContextDependencies.length} direct cross-context dependencies.`,
  );
} else {
  process.stdout.write(lines);
}
