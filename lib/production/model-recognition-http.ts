import { getProductionDatabase } from "@/db/production/client";
import { ModelRecognitionService } from "@/lib/production/model-recognition-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export const getProductionModelRecognitionService = (
  database: ProductionDatabaseLike = getProductionDatabase(),
) => new ModelRecognitionService(database);

type Workspace = Awaited<ReturnType<ModelRecognitionService["getWorkspace"]>>;

const fields = <T extends object, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Pick<T, K> =>
  Object.fromEntries(keys.map((key) => [key, value[key]])) as Pick<T, K>;

export function presentModelRecognitionWorkspace(workspace: Workspace) {
  return {
    providers: workspace.providers.map((item) =>
      fields(item, ["id", "name", "providerType", "limitations"]),
    ),
    models: workspace.models.map((item) =>
      fields(item, ["id", "providerId", "name", "peril", "description"]),
    ),
    modelVersions: workspace.modelVersions.map((item) =>
      fields(item, [
        "id",
        "modelId",
        "versionNumber",
        "versionLabel",
        "geography",
        "propertyClasses",
        "effectiveFrom",
        "sourceVersionId",
        "methodologySummary",
        "usageRights",
        "redistributionRestrictions",
        "limitations",
        "status",
      ]),
    ),
    modelReviews: workspace.modelReviews.map((item) =>
      fields(item, [
        "modelVersionId",
        "decision",
        "reviewerSubject",
        "sourceRightsAndDefinitionsChecked",
      ]),
    ),
    modelPublications: workspace.modelPublications.map((item) =>
      fields(item, [
        "modelVersionId",
        "decision",
        "publisherSubject",
        "humanConfirmed",
      ]),
    ),
    inputs: workspace.inputs.map((item) =>
      fields(item, [
        "id",
        "modelVersionId",
        "inputKey",
        "label",
        "dataType",
        "unit",
        "definition",
        "supportStatus",
        "transformationBoundary",
      ]),
    ),
    outputs: workspace.outputs.map((item) =>
      fields(item, [
        "id",
        "modelVersionId",
        "outputKey",
        "label",
        "definition",
        "limitations",
      ]),
    ),
    outputRecords: workspace.outputRecords.map((item) =>
      fields(item, [
        "id",
        "modelVersionId",
        "sourceAuthority",
        "sourceReference",
        "asOfDate",
        "limitations",
      ]),
    ),
    mappings: workspace.mappings.map((item) =>
      fields(item, [
        "id",
        "inputDefinitionId",
        "preInterventionValue",
        "proposedPostInterventionValue",
        "transformationMethod",
        "methodologyVersion",
        "confidence",
        "source",
        "limitations",
        "expiresAt",
        "currentState",
        "acceptedValue",
      ]),
    ),
    mappingEvidence: workspace.mappingEvidence.map((item) =>
      fields(item, ["mappingId", "evidenceVersionId"]),
    ),
    mappingEvents: workspace.mappingEvents.map((item) =>
      fields(item, [
        "mappingId",
        "eventType",
        "acceptedValue",
        "reason",
        "sourceAuthority",
        "sourceReference",
        "decidedBy",
        "occurredAt",
      ]),
    ),
    recognitionOrganizations: workspace.recognitionOrganizations.map((item) =>
      fields(item, ["id", "legalName", "organizationType", "limitations"]),
    ),
    commitments: workspace.commitments.map((item) =>
      fields(item, [
        "id",
        "committingOrganizationId",
        "name",
        "commitmentType",
      ]),
    ),
    commitmentVersions: workspace.commitmentVersions.map((item) =>
      fields(item, [
        "id",
        "commitmentId",
        "versionNumber",
        "geography",
        "propertyClasses",
        "evidenceRequired",
        "exclusions",
        "responseOrFinancialAction",
        "authorityScope",
        "effectiveFrom",
        "effectiveTo",
        "sourceVersionId",
        "limitations",
        "status",
      ]),
    ),
    commitmentReviews: workspace.commitmentReviews.map((item) =>
      fields(item, [
        "commitmentVersionId",
        "decision",
        "reviewerSubject",
        "sourceAndScopeChecked",
      ]),
    ),
    commitmentPublications: workspace.commitmentPublications.map((item) =>
      fields(item, [
        "commitmentVersionId",
        "decision",
        "publisherSubject",
        "humanConfirmed",
      ]),
    ),
    doctrine: workspace.doctrine,
  };
}
