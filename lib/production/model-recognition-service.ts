import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import { appendAudit, tenantRecord, TenantResourceNotFoundError, type ProductionDatabaseLike, type TenantContext } from "@/lib/production/repository";

export class ModelRecognitionValidationError extends Error {
  constructor(message: string) { super(message); this.name = "ModelRecognitionValidationError"; }
}
export class ModelRecognitionStateError extends Error {
  constructor(message: string) { super(message); this.name = "ModelRecognitionStateError"; }
}

type ModelInput = {
  inputKey: string; label: string; dataType: "string" | "number" | "boolean" | "enum" | "date"; unit?: string;
  allowedValues?: string[]; definition: string; supportStatus: "supported" | "unsupported" | "requires_provider_confirmation";
  transformationBoundary: string; requiredByModel?: boolean;
};
type ModelOutput = {
  outputKey: string; label: string; dataType: "string" | "number" | "boolean" | "enum" | "date" | "object";
  unit?: string; definition: string; limitations: string;
};
export type ModelMappingState = "proposed" | "internally_reviewed" | "submitted" | "accepted_by_model_market" | "accepted_with_modification" | "rejected" | "unsupported" | "expired";
export type MarketCommitmentType = "evidence_review_commitment" | "response_service_level" | "approved_rating_treatment" | "underwriting_reconsideration" | "quote_review" | "capacity_allocation" | "grant_payment" | "milestone_payment" | "financing_product" | "reinsurance_portfolio_review" | "data_sharing_commitment";
export type CommitmentAuthorityScope = "review_only" | "rating_treatment" | "underwriting_action" | "financial_action" | "data_sharing";

const required = (value: string | undefined, label: string) => {
  if (!value?.trim()) throw new ModelRecognitionValidationError(`${label} is required.`);
  return value.trim();
};
const human = (context: TenantContext, action: string) => {
  if (context.principalType !== "membership") throw new ModelRecognitionStateError(`A human organization member must ${action}.`);
};
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export class ModelRecognitionService {
  constructor(private readonly database: ProductionDatabaseLike, private readonly clock: () => Date = () => new Date()) {}

  async createModelVersion(context: TenantContext, input: {
    provider: { canonicalKey: string; name: string; providerType: "catastrophe_model" | "property_risk_model" | "insurer_model" | "programme_model" | "other"; website?: string; limitations: string };
    model: { canonicalKey: string; name: string; peril: string; description: string };
    versionLabel: string; geography: string[]; propertyClasses: string[]; effectiveFrom: string; effectiveTo?: string;
    sourceVersionId: string; methodologySummary: string; usageRights: string; redistributionRestrictions: string;
    limitations: string; supersedesVersionId?: string; inputs: ModelInput[]; outputs: ModelOutput[];
  }) {
    for (const resource of ["model_provider", "external_model", "external_model_version", "model_input_definition", "model_output_definition"] as const)
      assertAuthorized(context, { action: "create", resource, resourceOrganizationId: context.organizationId });
    human(context, "register an external model version");
    if (!input.geography.length || !input.propertyClasses.length || !input.inputs.length || !input.outputs.length)
      throw new ModelRecognitionValidationError("Model geography, property classes, inputs, and outputs must be explicit.");
    if (new Set(input.inputs.map((item) => item.inputKey)).size !== input.inputs.length || new Set(input.outputs.map((item) => item.outputKey)).size !== input.outputs.length)
      throw new ModelRecognitionValidationError("Model input and output keys must be unique within a version.");
    const source = await this.publishedSource(context, input.sourceVersionId);
    const at = this.clock().toISOString();
    const providers = await this.database.select().from(schema.modelProviders).where(and(eq(schema.modelProviders.organizationId, context.organizationId), eq(schema.modelProviders.canonicalKey, input.provider.canonicalKey))).limit(1);
    const providerId = providers[0]?.id ?? randomUUID();
    const models = await this.database.select().from(schema.externalModels).where(and(eq(schema.externalModels.organizationId, context.organizationId), eq(schema.externalModels.canonicalKey, input.model.canonicalKey))).limit(1);
    const modelId = models[0]?.id ?? randomUUID();
    if (models[0] && models[0].providerId !== providerId) throw new ModelRecognitionStateError("An external model cannot move between providers.");
    const prior = await this.database.select().from(schema.externalModelVersions).where(and(eq(schema.externalModelVersions.organizationId, context.organizationId), eq(schema.externalModelVersions.modelId, modelId))).orderBy(desc(schema.externalModelVersions.versionNumber)).limit(1);
    if ((prior[0]?.id ?? undefined) !== input.supersedesVersionId) throw new ModelRecognitionValidationError(prior[0] ? "A successor must reference the latest model version." : "The first model version cannot declare a predecessor.");
    const modelVersionId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      if (!providers[0]) await db.insert(schema.modelProviders).values({ id: providerId, ...tenantRecord(context, at), canonicalKey: required(input.provider.canonicalKey, "Provider key"), name: required(input.provider.name, "Provider name"), providerType: input.provider.providerType, website: input.provider.website, limitations: required(input.provider.limitations, "Provider limitations") });
      if (!models[0]) await db.insert(schema.externalModels).values({ id: modelId, ...tenantRecord(context, at), providerId, canonicalKey: required(input.model.canonicalKey, "Model key"), name: required(input.model.name, "Model name"), peril: required(input.model.peril, "Model peril"), description: required(input.model.description, "Model description") });
      await db.insert(schema.externalModelVersions).values({ id: modelVersionId, ...tenantRecord(context, at), modelId, versionNumber: (prior[0]?.versionNumber ?? 0) + 1, versionLabel: required(input.versionLabel, "Model version label"), geography: input.geography, propertyClasses: input.propertyClasses, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo, sourceVersionId: source.id, methodologySummary: required(input.methodologySummary, "Methodology summary"), usageRights: required(input.usageRights, "Usage rights"), redistributionRestrictions: required(input.redistributionRestrictions, "Redistribution restrictions"), limitations: required(input.limitations, "Model limitations"), authorSubject: context.actorSubject, supersedesVersionId: input.supersedesVersionId });
      const owned = tenantRecord(context, at);
      await db.insert(schema.modelInputDefinitions).values(input.inputs.map((item) => ({ id: randomUUID(), ...owned, modelVersionId, inputKey: required(item.inputKey, "Input key"), label: required(item.label, "Input label"), dataType: item.dataType, unit: item.unit, allowedValues: item.allowedValues ?? [], definition: required(item.definition, "Input definition"), supportStatus: item.supportStatus, transformationBoundary: required(item.transformationBoundary, "Transformation boundary"), requiredByModel: item.requiredByModel ?? false })));
      await db.insert(schema.modelOutputDefinitions).values(input.outputs.map((item) => ({ id: randomUUID(), ...owned, modelVersionId, outputKey: required(item.outputKey, "Output key"), label: required(item.label, "Output label"), dataType: item.dataType, unit: item.unit, definition: required(item.definition, "Output definition"), limitations: required(item.limitations, "Output limitations") })));
      await db.insert(schema.governedSourceDependencies).values({ id: randomUUID(), ...owned, sourceVersionId: source.id, consumerType: "external_model_version", consumerId: modelVersionId, relationship: "relied_on", rationale: "Pins the exact external model documentation, rights, definitions, and limitations.", pinnedAt: at, pinnedBy: context.actorSubject });
      await appendAudit(db, context, { action: "external_model.version_created", resourceType: "external_model_version", resourceId: modelVersionId, detail: { providerId, modelId, sourceVersionId: source.id, inputCount: input.inputs.length, outputCount: input.outputs.length, authoritativeRiskScoreGenerated: false }, occurredAt: at });
    });
    return { providerId, modelId, modelVersionId, versionNumber: (prior[0]?.versionNumber ?? 0) + 1 };
  }

  async reviewModelVersion(context: TenantContext, input: { modelVersionId: string; decision: "approved" | "changes_requested" | "rejected"; sourceRightsAndDefinitionsChecked: boolean; note: string }) {
    assertAuthorized(context, { action: "create", resource: "external_model_version_review", resourceOrganizationId: context.organizationId });
    human(context, "review an external model version");
    const version = await this.modelVersion(context, input.modelVersionId);
    if (version.authorSubject === context.actorSubject) throw new ModelRecognitionStateError("Model-version author and reviewer must be different humans.");
    if (input.decision === "approved" && !input.sourceRightsAndDefinitionsChecked) throw new ModelRecognitionStateError("Approval requires exact source, rights, input, output, and limitation review.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.externalModelVersionReviews).values({ id, ...tenantRecord(context, at), modelVersionId: input.modelVersionId, decision: input.decision, reviewerSubject: context.actorSubject, sourceRightsAndDefinitionsChecked: input.sourceRightsAndDefinitionsChecked, note: required(input.note, "Model review note"), reviewedAt: at });
    await appendAudit(this.database, context, { action: `external_model.version_${input.decision}`, resourceType: "external_model_version_review", resourceId: id, detail: { modelVersionId: input.modelVersionId, sourceRightsAndDefinitionsChecked: input.sourceRightsAndDefinitionsChecked }, occurredAt: at });
    return { reviewId: id, decision: input.decision };
  }

  async publishModelVersion(context: TenantContext, input: { modelVersionId: string; decision: "published" | "rejected"; humanConfirmed: boolean; note: string }) {
    assertAuthorized(context, { action: "create", resource: "external_model_version_publication", resourceOrganizationId: context.organizationId });
    human(context, "publish an external model version");
    if (!input.humanConfirmed) throw new ModelRecognitionStateError("Model publication requires explicit human confirmation.");
    const version = await this.modelVersion(context, input.modelVersionId);
    const review = await this.database.select().from(schema.externalModelVersionReviews).where(and(eq(schema.externalModelVersionReviews.organizationId, context.organizationId), eq(schema.externalModelVersionReviews.modelVersionId, input.modelVersionId), eq(schema.externalModelVersionReviews.decision, "approved"))).limit(1);
    if (!review[0]) throw new ModelRecognitionStateError("Model publication requires an approved independent review.");
    if ([version.authorSubject, review[0].reviewerSubject].includes(context.actorSubject)) throw new ModelRecognitionStateError("Model author, reviewer, and publisher must be separate humans.");
    await this.publishedSource(context, version.sourceVersionId);
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.externalModelVersionPublications).values({ id, ...tenantRecord(context, at), modelVersionId: input.modelVersionId, decision: input.decision, publisherSubject: context.actorSubject, humanConfirmed: true, note: required(input.note, "Model publication note"), publishedAt: at });
      await db.update(schema.externalModelVersions).set({ status: input.decision === "published" ? "active" : "withdrawn", updatedAt: at, updatedBy: context.actorSubject, revision: version.revision + 1 }).where(eq(schema.externalModelVersions.id, version.id));
      if (input.decision === "published" && version.supersedesVersionId) await db.update(schema.externalModelVersions).set({ status: "superseded", updatedAt: at, updatedBy: context.actorSubject }).where(eq(schema.externalModelVersions.id, version.supersedesVersionId));
      await appendAudit(db, context, { action: `external_model.version_${input.decision}`, resourceType: "external_model_version_publication", resourceId: id, detail: { modelVersionId: input.modelVersionId, externalAcceptanceImplied: false }, occurredAt: at });
    });
    return { publicationId: id, status: input.decision === "published" ? "active" : "withdrawn" };
  }

  async recordModelOutput(context: TenantContext, input: { propertyId: string; modelVersionId: string; outputDefinitionId: string; evidenceVersionId?: string; recordedValue: Record<string, unknown>; asOfDate: string; sourceAuthority: string; sourceReference: string; assumptions: string[]; limitations: string; humanConfirmed: boolean }) {
    assertAuthorized(context, { action: "create", resource: "model_output_record", resourceOrganizationId: context.organizationId });
    human(context, "record an externally supplied model output");
    if (!input.humanConfirmed) throw new ModelRecognitionStateError("External model output ingestion requires human confirmation.");
    const [property, version, output, evidence] = await Promise.all([
      this.database.select().from(schema.properties).where(and(eq(schema.properties.organizationId, context.organizationId), eq(schema.properties.id, input.propertyId))).limit(1),
      this.database.select().from(schema.externalModelVersions).where(and(eq(schema.externalModelVersions.organizationId, context.organizationId), eq(schema.externalModelVersions.id, input.modelVersionId), eq(schema.externalModelVersions.status, "active"))).limit(1),
      this.database.select().from(schema.modelOutputDefinitions).where(and(eq(schema.modelOutputDefinitions.organizationId, context.organizationId), eq(schema.modelOutputDefinitions.id, input.outputDefinitionId), eq(schema.modelOutputDefinitions.modelVersionId, input.modelVersionId))).limit(1),
      input.evidenceVersionId ? this.database.select({ id: schema.evidenceVersions.id }).from(schema.evidenceVersions).innerJoin(schema.evidenceItems, eq(schema.evidenceItems.id, schema.evidenceVersions.evidenceItemId)).where(and(eq(schema.evidenceVersions.organizationId, context.organizationId), eq(schema.evidenceVersions.id, input.evidenceVersionId), eq(schema.evidenceItems.propertyId, input.propertyId))).limit(1) : Promise.resolve([]),
    ]);
    if (!property[0] || !version[0] || !output[0] || (input.evidenceVersionId && !evidence[0])) throw new ModelRecognitionStateError("Model output property, active model version, definition, and evidence must share one tenant and property.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.modelOutputRecords).values({ id, ...tenantRecord(context, at), ...input, sourceAuthority: required(input.sourceAuthority, "Output source authority"), sourceReference: required(input.sourceReference, "Output source reference"), limitations: required(input.limitations, "Output limitations"), importedBy: context.actorSubject });
      await appendAudit(db, context, { action: "external_model.output_recorded", resourceType: "model_output_record", resourceId: id, detail: { propertyId: input.propertyId, modelVersionId: input.modelVersionId, outputDefinitionId: input.outputDefinitionId, generatedByFortify: false }, occurredAt: at });
    });
    return { outputRecordId: id };
  }

  async proposeMapping(context: TenantContext, input: { propertyId: string; projectInterventionId: string; verificationFindingId: string; verificationCertificateId?: string; modelVersionId: string; inputDefinitionId: string; preInterventionValue: Record<string, unknown>; proposedPostInterventionValue: Record<string, unknown>; transformationMethod: string; methodologyVersion: string; confidence: "low" | "medium" | "high" | "not_assessed"; source: string; limitations: string; expiresAt?: string; evidenceVersionIds: string[] }) {
    if (!input.evidenceVersionIds.length) throw new ModelRecognitionValidationError("A proposed mapping must cite exact evidence versions.");
    const project = await this.database.select({ projectId: schema.resilienceProjects.id, propertyId: schema.resilienceProjects.propertyId }).from(schema.projectInterventions).innerJoin(schema.resilienceProjects, eq(schema.resilienceProjects.id, schema.projectInterventions.projectId)).where(and(eq(schema.projectInterventions.organizationId, context.organizationId), eq(schema.projectInterventions.id, input.projectInterventionId), eq(schema.resilienceProjects.propertyId, input.propertyId))).limit(1);
    if (!project[0]) throw new ModelRecognitionStateError("The project intervention must belong to the mapped property.");
    assertAuthorized(context, { action: "create", resource: "model_input_mapping", resourceOrganizationId: context.organizationId, projectId: project[0].projectId });
    human(context, "propose a model-input mapping");
    const [version, definition, finding, findingReview, certificate, evidence] = await Promise.all([
      this.database.select().from(schema.externalModelVersions).where(and(eq(schema.externalModelVersions.organizationId, context.organizationId), eq(schema.externalModelVersions.id, input.modelVersionId), eq(schema.externalModelVersions.status, "active"))).limit(1),
      this.database.select().from(schema.modelInputDefinitions).where(and(eq(schema.modelInputDefinitions.organizationId, context.organizationId), eq(schema.modelInputDefinitions.id, input.inputDefinitionId), eq(schema.modelInputDefinitions.modelVersionId, input.modelVersionId))).limit(1),
      this.database.select().from(schema.verificationFindings).where(and(eq(schema.verificationFindings.organizationId, context.organizationId), eq(schema.verificationFindings.id, input.verificationFindingId), eq(schema.verificationFindings.projectInterventionId, input.projectInterventionId), eq(schema.verificationFindings.conclusion, "conforming"))).limit(1),
      this.database.select({ review: schema.verificationFindingReviews }).from(schema.verificationFindingReviews).innerJoin(schema.verificationFindings, eq(schema.verificationFindings.id, schema.verificationFindingReviews.findingId)).where(and(eq(schema.verificationFindingReviews.organizationId, context.organizationId), eq(schema.verificationFindingReviews.findingId, input.verificationFindingId), eq(schema.verificationFindingReviews.decision, "approved"))).limit(1),
      input.verificationCertificateId ? this.database.select({ certificate: schema.verificationCertificates, finding: schema.verificationFindings }).from(schema.verificationCertificates).innerJoin(schema.verificationAssignments, eq(schema.verificationAssignments.id, schema.verificationCertificates.assignmentId)).innerJoin(schema.verificationFindings, eq(schema.verificationFindings.assignmentId, schema.verificationAssignments.id)).where(and(eq(schema.verificationCertificates.organizationId, context.organizationId), eq(schema.verificationCertificates.id, input.verificationCertificateId), eq(schema.verificationFindings.id, input.verificationFindingId))).limit(1) : Promise.resolve([]),
      this.database.select({ id: schema.evidenceVersions.id, propertyId: schema.evidenceItems.propertyId }).from(schema.evidenceVersions).innerJoin(schema.evidenceItems, eq(schema.evidenceItems.id, schema.evidenceVersions.evidenceItemId)).innerJoin(schema.verificationFindingEvidenceLinks, and(eq(schema.verificationFindingEvidenceLinks.evidenceVersionId, schema.evidenceVersions.id), eq(schema.verificationFindingEvidenceLinks.findingId, input.verificationFindingId))).where(and(eq(schema.evidenceVersions.organizationId, context.organizationId), eq(schema.evidenceItems.propertyId, input.propertyId), inArray(schema.evidenceVersions.id, input.evidenceVersionIds))),
    ]);
    if (!version[0] || !definition[0] || !finding[0] || !findingReview[0] || (input.verificationCertificateId && !certificate[0]) || evidence.length !== new Set(input.evidenceVersionIds).size)
      throw new ModelRecognitionStateError("A mapping requires an active model definition, approved conforming finding, optional matching certificate, and exact finding-linked property evidence.");
    if (input.expiresAt && new Date(input.expiresAt).getTime() <= this.clock().getTime()) throw new ModelRecognitionValidationError("A new mapping cannot already be expired.");
    const at = this.clock().toISOString(), mappingId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.modelInputMappings).values({ id: mappingId, ...tenantRecord(context, at), ...input, transformationMethod: required(input.transformationMethod, "Transformation method"), methodologyVersion: required(input.methodologyVersion, "Methodology version"), source: required(input.source, "Mapping source"), limitations: required(input.limitations, "Mapping limitations"), authorSubject: context.actorSubject, proposedAt: at });
      await db.insert(schema.modelInputMappingEvidenceLinks).values([...new Set(input.evidenceVersionIds)].map((evidenceVersionId) => ({ id: randomUUID(), ...tenantRecord(context, at), mappingId, evidenceVersionId, relationship: "supports" })));
      await appendAudit(db, context, { action: "model_input_mapping.proposed", resourceType: "model_input_mapping", resourceId: mappingId, detail: { propertyId: input.propertyId, projectId: project[0].projectId, modelVersionId: input.modelVersionId, inputDefinitionId: input.inputDefinitionId, supportStatus: definition[0].supportStatus, acceptedAutomatically: false }, occurredAt: at });
    });
    return { mappingId, state: "proposed" as const, supportStatus: definition[0].supportStatus };
  }

  async reviewMapping(context: TenantContext, input: { mappingId: string; decision: "approved_for_submission" | "changes_requested" | "unsupported"; modelDocumentationChecked: boolean; verificationChecked: boolean; note: string }) {
    assertAuthorized(context, { action: "create", resource: "model_input_mapping_review", resourceOrganizationId: context.organizationId });
    human(context, "review a proposed model-input mapping");
    const mapping = await this.mapping(context, input.mappingId);
    if (mapping.authorSubject === context.actorSubject) throw new ModelRecognitionStateError("Mapping author and reviewer must be different humans.");
    const definition = await this.inputDefinition(context, mapping.inputDefinitionId);
    if (input.decision === "approved_for_submission" && (!input.modelDocumentationChecked || !input.verificationChecked || definition.supportStatus !== "supported")) throw new ModelRecognitionStateError("Submission approval requires a supported input plus checked model documentation and verification evidence.");
    if (input.decision === "unsupported" && definition.supportStatus === "supported") throw new ModelRecognitionStateError("A supported input cannot be marked unsupported without a successor definition.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.modelInputMappingReviews).values({ id, ...tenantRecord(context, at), mappingId: input.mappingId, decision: input.decision, modelDocumentationChecked: input.modelDocumentationChecked, verificationChecked: input.verificationChecked, note: required(input.note, "Mapping review note"), reviewerSubject: context.actorSubject, reviewedAt: at });
    await appendAudit(this.database, context, { action: `model_input_mapping.${input.decision}`, resourceType: "model_input_mapping_review", resourceId: id, detail: { mappingId: input.mappingId, acceptedAutomatically: false }, occurredAt: at });
    return { reviewId: id, state: input.decision === "approved_for_submission" ? "internally_reviewed" as const : input.decision };
  }

  async recordMappingEvent(context: TenantContext, input: { mappingId: string; eventType: "submitted" | "accepted_by_model_market" | "accepted_with_modification" | "rejected" | "unsupported" | "expired"; acceptedValue?: Record<string, unknown>; reason: string; sourceAuthority: string; sourceReference: string; humanConfirmed: boolean; supersedesEventId?: string }) {
    assertAuthorized(context, { action: "create", resource: "model_input_mapping_event", resourceOrganizationId: context.organizationId });
    human(context, "record a model or market mapping decision");
    if (!input.humanConfirmed) throw new ModelRecognitionStateError("Mapping state changes require explicit human confirmation.");
    const mapping = await this.mapping(context, input.mappingId);
    const review = await this.database.select().from(schema.modelInputMappingReviews).where(and(eq(schema.modelInputMappingReviews.organizationId, context.organizationId), eq(schema.modelInputMappingReviews.mappingId, input.mappingId))).limit(1);
    const prior = await this.database.select().from(schema.modelInputMappingEvents).where(and(eq(schema.modelInputMappingEvents.organizationId, context.organizationId), eq(schema.modelInputMappingEvents.mappingId, input.mappingId))).orderBy(desc(schema.modelInputMappingEvents.occurredAt)).limit(1);
    if ((prior[0]?.id ?? undefined) !== input.supersedesEventId) throw new ModelRecognitionStateError(prior[0] ? "A mapping event must supersede the latest event." : "The first mapping event cannot supersede another event.");
    if (input.eventType === "submitted" && (review[0]?.decision !== "approved_for_submission" || prior[0])) throw new ModelRecognitionStateError("Only an internally approved mapping may be submitted once.");
    if (["accepted_by_model_market", "accepted_with_modification", "rejected"].includes(input.eventType) && prior[0]?.eventType !== "submitted") throw new ModelRecognitionStateError("An external mapping response requires a submitted mapping.");
    if (input.eventType === "unsupported" && review[0]?.decision !== "unsupported") throw new ModelRecognitionStateError("Unsupported state requires an explicit unsupported review.");
    if (["accepted_by_model_market", "accepted_with_modification"].includes(input.eventType) && !input.acceptedValue) throw new ModelRecognitionValidationError("An accepted mapping must preserve the accepted value separately.");
    if (input.eventType === "accepted_by_model_market" && canonical(input.acceptedValue) !== canonical(mapping.proposedPostInterventionValue)) throw new ModelRecognitionStateError("Use accepted-with-modification when the accepted value differs from the proposal.");
    if (input.eventType === "accepted_with_modification" && canonical(input.acceptedValue) === canonical(mapping.proposedPostInterventionValue)) throw new ModelRecognitionStateError("A modified acceptance must preserve a value different from the proposal.");
    if (input.eventType !== "expired" && mapping.expiresAt && new Date(mapping.expiresAt).getTime() <= this.clock().getTime()) throw new ModelRecognitionStateError("An expired mapping cannot advance to another state.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.modelInputMappingEvents).values({ id, ...tenantRecord(context, at), ...input, acceptedValue: input.acceptedValue, reason: required(input.reason, "Mapping event reason"), sourceAuthority: required(input.sourceAuthority, "Mapping decision authority"), sourceReference: required(input.sourceReference, "Mapping decision source"), decidedBy: context.actorSubject, occurredAt: at });
      await appendAudit(db, context, { action: `model_input_mapping.${input.eventType}`, resourceType: "model_input_mapping_event", resourceId: id, detail: { mappingId: input.mappingId, proposedValuePreserved: true, acceptedValueRecordedSeparately: Boolean(input.acceptedValue), externalAcceptanceInferred: false }, occurredAt: at });
    });
    return { eventId: id, state: input.eventType };
  }

  async registerRecognitionOrganization(context: TenantContext, input: { canonicalKey: string; legalName: string; organizationType: "insurer" | "mga" | "reinsurer" | "lender" | "public_programme" | "philanthropic_funder" | "property_operator"; limitations: string }) {
    assertAuthorized(context, { action: "create", resource: "recognition_organization", resourceOrganizationId: context.organizationId });
    human(context, "register a recognition organization");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.recognitionOrganizations).values({ id, ...tenantRecord(context, at), canonicalKey: required(input.canonicalKey, "Recognition organization key"), legalName: required(input.legalName, "Recognition organization name"), organizationType: input.organizationType, limitations: required(input.limitations, "Recognition organization limitations") });
    return { recognitionOrganizationId: id };
  }

  async createCommitmentVersion(context: TenantContext, input: { committingOrganizationId: string; canonicalKey: string; name: string; commitmentType: MarketCommitmentType; profileVersionId: string; modelVersionId?: string; geography: string[]; propertyClasses: string[]; evidenceRequired: string[]; exclusions: string[]; responseOrFinancialAction: string; authorityScope: CommitmentAuthorityScope; effectiveFrom: string; effectiveTo?: string; sourceVersionId: string; limitations: string; commitmentId?: string; supersedesVersionId?: string }) {
    for (const resource of ["market_commitment", "market_commitment_version"] as const) assertAuthorized(context, { action: "create", resource, resourceOrganizationId: context.organizationId });
    human(context, "author a market commitment version");
    if (!input.geography.length || !input.propertyClasses.length || !input.evidenceRequired.length || !input.exclusions.length) throw new ModelRecognitionValidationError("Commitment geography, property classes, evidence, and exclusions must be explicit.");
    const reviewOnly = new Set<MarketCommitmentType>(["evidence_review_commitment", "response_service_level", "quote_review", "reinsurance_portfolio_review"]);
    if (reviewOnly.has(input.commitmentType) && input.authorityScope !== "review_only") throw new ModelRecognitionStateError("A review commitment cannot be translated into insurance, rating, underwriting, or financial authority.");
    const expectedScopes: Partial<Record<MarketCommitmentType, CommitmentAuthorityScope>> = { approved_rating_treatment: "rating_treatment", underwriting_reconsideration: "underwriting_action", capacity_allocation: "underwriting_action", grant_payment: "financial_action", milestone_payment: "financial_action", financing_product: "financial_action", data_sharing_commitment: "data_sharing" };
    if (expectedScopes[input.commitmentType] && expectedScopes[input.commitmentType] !== input.authorityScope) throw new ModelRecognitionStateError("Commitment authority scope does not match its explicit commitment type.");
    const [organization, profilePublication, modelVersion, source] = await Promise.all([
      this.database.select().from(schema.recognitionOrganizations).where(and(eq(schema.recognitionOrganizations.organizationId, context.organizationId), eq(schema.recognitionOrganizations.id, input.committingOrganizationId), eq(schema.recognitionOrganizations.status, "active"))).limit(1),
      this.database.select().from(schema.targetProfilePublications).where(and(eq(schema.targetProfilePublications.organizationId, context.organizationId), eq(schema.targetProfilePublications.profileVersionId, input.profileVersionId), eq(schema.targetProfilePublications.decision, "published"))).limit(1),
      input.modelVersionId ? this.database.select().from(schema.externalModelVersions).where(and(eq(schema.externalModelVersions.organizationId, context.organizationId), eq(schema.externalModelVersions.id, input.modelVersionId), eq(schema.externalModelVersions.status, "active"))).limit(1) : Promise.resolve([]),
      this.publishedSource(context, input.sourceVersionId),
    ]);
    if (!organization[0] || !profilePublication[0] || (input.modelVersionId && !modelVersion[0])) throw new ModelRecognitionStateError("A commitment requires an active committing organization, published profile, and optional active model version in one tenant.");
    const existing = input.commitmentId ? await this.database.select().from(schema.marketCommitments).where(and(eq(schema.marketCommitments.organizationId, context.organizationId), eq(schema.marketCommitments.id, input.commitmentId), eq(schema.marketCommitments.committingOrganizationId, input.committingOrganizationId))).limit(1) : [];
    if (input.commitmentId && !existing[0]) throw new TenantResourceNotFoundError("Market commitment");
    const commitmentId = existing[0]?.id ?? randomUUID();
    const prior = await this.database.select().from(schema.marketCommitmentVersions).where(and(eq(schema.marketCommitmentVersions.organizationId, context.organizationId), eq(schema.marketCommitmentVersions.commitmentId, commitmentId))).orderBy(desc(schema.marketCommitmentVersions.versionNumber)).limit(1);
    if ((prior[0]?.id ?? undefined) !== input.supersedesVersionId) throw new ModelRecognitionValidationError(prior[0] ? "A commitment successor must reference the latest version." : "The first commitment version cannot declare a predecessor.");
    const at = this.clock().toISOString(), commitmentVersionId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      if (!existing[0]) await db.insert(schema.marketCommitments).values({ id: commitmentId, ...tenantRecord(context, at), committingOrganizationId: input.committingOrganizationId, canonicalKey: required(input.canonicalKey, "Commitment key"), name: required(input.name, "Commitment name"), commitmentType: input.commitmentType });
      await db.insert(schema.marketCommitmentVersions).values({ id: commitmentVersionId, ...tenantRecord(context, at), commitmentId, versionNumber: (prior[0]?.versionNumber ?? 0) + 1, profileVersionId: input.profileVersionId, modelVersionId: input.modelVersionId, geography: input.geography, propertyClasses: input.propertyClasses, evidenceRequired: input.evidenceRequired, exclusions: input.exclusions, responseOrFinancialAction: required(input.responseOrFinancialAction, "Commitment action"), authorityScope: input.authorityScope, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo, sourceVersionId: source.id, limitations: required(input.limitations, "Commitment limitations"), authorSubject: context.actorSubject, supersedesVersionId: input.supersedesVersionId });
      await db.insert(schema.governedSourceDependencies).values({ id: randomUUID(), ...tenantRecord(context, at), sourceVersionId: source.id, consumerType: "market_commitment_version", consumerId: commitmentVersionId, relationship: "relied_on", rationale: "Pins the exact legal or contractual source, scope, exclusions, and effective period.", pinnedAt: at, pinnedBy: context.actorSubject });
      await appendAudit(db, context, { action: "market_commitment.version_created", resourceType: "market_commitment_version", resourceId: commitmentVersionId, detail: { commitmentId, commitmentType: input.commitmentType, authorityScope: input.authorityScope, willReviewMeansWillInsure: false }, occurredAt: at });
    });
    return { commitmentId, commitmentVersionId, versionNumber: (prior[0]?.versionNumber ?? 0) + 1 };
  }

  async reviewCommitmentVersion(context: TenantContext, input: { commitmentVersionId: string; decision: "approved" | "changes_requested" | "rejected"; sourceAndScopeChecked: boolean; note: string }) {
    assertAuthorized(context, { action: "create", resource: "market_commitment_review", resourceOrganizationId: context.organizationId });
    human(context, "review a market commitment version");
    const version = await this.commitmentVersion(context, input.commitmentVersionId);
    if (version.authorSubject === context.actorSubject) throw new ModelRecognitionStateError("Commitment author and reviewer must be different humans.");
    if (input.decision === "approved" && !input.sourceAndScopeChecked) throw new ModelRecognitionStateError("Commitment approval requires exact source, scope, exclusions, and authority review.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.marketCommitmentReviews).values({ id, ...tenantRecord(context, at), commitmentVersionId: input.commitmentVersionId, decision: input.decision, reviewerSubject: context.actorSubject, sourceAndScopeChecked: input.sourceAndScopeChecked, note: required(input.note, "Commitment review note"), reviewedAt: at });
    return { reviewId: id, decision: input.decision };
  }

  async publishCommitmentVersion(context: TenantContext, input: { commitmentVersionId: string; decision: "published" | "rejected"; humanConfirmed: boolean; note: string }) {
    assertAuthorized(context, { action: "create", resource: "market_commitment_publication", resourceOrganizationId: context.organizationId });
    human(context, "publish a market commitment version");
    if (!input.humanConfirmed) throw new ModelRecognitionStateError("Commitment publication requires explicit human confirmation.");
    const version = await this.commitmentVersion(context, input.commitmentVersionId);
    const review = await this.database.select().from(schema.marketCommitmentReviews).where(and(eq(schema.marketCommitmentReviews.organizationId, context.organizationId), eq(schema.marketCommitmentReviews.commitmentVersionId, input.commitmentVersionId), eq(schema.marketCommitmentReviews.decision, "approved"))).limit(1);
    if (!review[0] || [version.authorSubject, review[0].reviewerSubject].includes(context.actorSubject)) throw new ModelRecognitionStateError("Commitment publication requires approved review and a third human publisher.");
    await this.publishedSource(context, version.sourceVersionId);
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.marketCommitmentPublications).values({ id, ...tenantRecord(context, at), commitmentVersionId: input.commitmentVersionId, decision: input.decision, publisherSubject: context.actorSubject, humanConfirmed: true, note: required(input.note, "Commitment publication note"), publishedAt: at });
      await db.update(schema.marketCommitmentVersions).set({ status: input.decision === "published" ? "published" : "withdrawn", updatedAt: at, updatedBy: context.actorSubject, revision: version.revision + 1 }).where(eq(schema.marketCommitmentVersions.id, version.id));
      if (input.decision === "published" && version.supersedesVersionId) await db.update(schema.marketCommitmentVersions).set({ status: "superseded", updatedAt: at, updatedBy: context.actorSubject }).where(eq(schema.marketCommitmentVersions.id, version.supersedesVersionId));
      await appendAudit(db, context, { action: `market_commitment.version_${input.decision}`, resourceType: "market_commitment_publication", resourceId: id, detail: { commitmentVersionId: input.commitmentVersionId, authorityScope: version.authorityScope, insuranceOutcomeGuaranteed: false }, occurredAt: at });
    });
    return { publicationId: id, status: input.decision === "published" ? "published" : "withdrawn" };
  }

  async getWorkspace(context: TenantContext) {
    assertAuthorized(context, { action: "read", resource: "external_model_version", resourceOrganizationId: context.organizationId });
    const organizationId = context.organizationId;
    const [providers, models, modelVersions, modelReviews, modelPublications, inputs, outputs, outputRecords, rawMappings, mappingEvidence, mappingReviews, mappingEvents, recognitionOrganizations, commitments, commitmentVersions, commitmentReviews, commitmentPublications] = await Promise.all([
      this.database.select().from(schema.modelProviders).where(eq(schema.modelProviders.organizationId, organizationId)),
      this.database.select().from(schema.externalModels).where(eq(schema.externalModels.organizationId, organizationId)),
      this.database.select().from(schema.externalModelVersions).where(eq(schema.externalModelVersions.organizationId, organizationId)).orderBy(asc(schema.externalModelVersions.versionNumber)),
      this.database.select().from(schema.externalModelVersionReviews).where(eq(schema.externalModelVersionReviews.organizationId, organizationId)),
      this.database.select().from(schema.externalModelVersionPublications).where(eq(schema.externalModelVersionPublications.organizationId, organizationId)),
      this.database.select().from(schema.modelInputDefinitions).where(eq(schema.modelInputDefinitions.organizationId, organizationId)),
      this.database.select().from(schema.modelOutputDefinitions).where(eq(schema.modelOutputDefinitions.organizationId, organizationId)),
      this.database.select().from(schema.modelOutputRecords).where(eq(schema.modelOutputRecords.organizationId, organizationId)),
      this.database.select().from(schema.modelInputMappings).where(eq(schema.modelInputMappings.organizationId, organizationId)),
      this.database.select().from(schema.modelInputMappingEvidenceLinks).where(eq(schema.modelInputMappingEvidenceLinks.organizationId, organizationId)),
      this.database.select().from(schema.modelInputMappingReviews).where(eq(schema.modelInputMappingReviews.organizationId, organizationId)),
      this.database.select().from(schema.modelInputMappingEvents).where(eq(schema.modelInputMappingEvents.organizationId, organizationId)).orderBy(asc(schema.modelInputMappingEvents.occurredAt)),
      this.database.select().from(schema.recognitionOrganizations).where(eq(schema.recognitionOrganizations.organizationId, organizationId)),
      this.database.select().from(schema.marketCommitments).where(eq(schema.marketCommitments.organizationId, organizationId)),
      this.database.select().from(schema.marketCommitmentVersions).where(eq(schema.marketCommitmentVersions.organizationId, organizationId)),
      this.database.select().from(schema.marketCommitmentReviews).where(eq(schema.marketCommitmentReviews.organizationId, organizationId)),
      this.database.select().from(schema.marketCommitmentPublications).where(eq(schema.marketCommitmentPublications.organizationId, organizationId)),
    ]);
    const mappings = rawMappings.map((mapping) => {
      const events = mappingEvents.filter((event) => event.mappingId === mapping.id);
      const review = mappingReviews.find((item) => item.mappingId === mapping.id);
      const currentState: ModelMappingState = events.at(-1)?.eventType as ModelMappingState ?? (review?.decision === "approved_for_submission" ? "internally_reviewed" : review?.decision === "unsupported" ? "unsupported" : "proposed");
      return { ...mapping, currentState, acceptedValue: events.at(-1)?.acceptedValue ?? null };
    });
    return { providers, models, modelVersions, modelReviews, modelPublications, inputs, outputs, outputRecords, mappings, mappingEvidence, mappingReviews, mappingEvents, recognitionOrganizations, commitments, commitmentVersions, commitmentReviews, commitmentPublications, doctrine: { fortifyGeneratesRiskScores: false, proposedEqualsAccepted: false, reviewCommitmentEqualsInsurance: false, externalAcceptanceRequiresHumanEvidence: true, unsupportedMappingsPass: false } };
  }

  private async publishedSource(context: TenantContext, sourceVersionId: string) {
    const rows = await this.database.select({ version: schema.governedSourceVersions, publication: schema.governedSourcePublications }).from(schema.governedSourceVersions).innerJoin(schema.governedSourcePublications, eq(schema.governedSourcePublications.sourceVersionId, schema.governedSourceVersions.id)).where(and(eq(schema.governedSourceVersions.organizationId, context.organizationId), eq(schema.governedSourceVersions.id, sourceVersionId), eq(schema.governedSourceVersions.verifyCurrentStatus, "verified_current"), eq(schema.governedSourcePublications.decision, "published"))).limit(1);
    if (!rows[0] || rows[0].version.rightsStatus === "pending") throw new ModelRecognitionStateError("The exact source version must be published, verified current, and rights-reviewed.");
    return rows[0].version;
  }

  private async modelVersion(context: TenantContext, id: string) {
    const rows = await this.database.select().from(schema.externalModelVersions).where(and(eq(schema.externalModelVersions.organizationId, context.organizationId), eq(schema.externalModelVersions.id, id))).limit(1);
    if (!rows[0]) throw new TenantResourceNotFoundError("External model version");
    return rows[0];
  }

  private async mapping(context: TenantContext, id: string) {
    const rows = await this.database.select().from(schema.modelInputMappings).where(and(eq(schema.modelInputMappings.organizationId, context.organizationId), eq(schema.modelInputMappings.id, id))).limit(1);
    if (!rows[0]) throw new TenantResourceNotFoundError("Model-input mapping");
    return rows[0];
  }

  private async inputDefinition(context: TenantContext, id: string) {
    const rows = await this.database.select().from(schema.modelInputDefinitions).where(and(eq(schema.modelInputDefinitions.organizationId, context.organizationId), eq(schema.modelInputDefinitions.id, id))).limit(1);
    if (!rows[0]) throw new TenantResourceNotFoundError("Model input definition");
    return rows[0];
  }

  private async commitmentVersion(context: TenantContext, id: string) {
    const rows = await this.database.select().from(schema.marketCommitmentVersions).where(and(eq(schema.marketCommitmentVersions.organizationId, context.organizationId), eq(schema.marketCommitmentVersions.id, id))).limit(1);
    if (!rows[0]) throw new TenantResourceNotFoundError("Market commitment version");
    return rows[0];
  }
}
