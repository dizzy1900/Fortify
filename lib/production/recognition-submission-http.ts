import { getProductionDatabase } from "@/db/production/client";
import { IdentityService } from "@/lib/production/identity-service";
import {
  DeterministicMarketDeliveryProvider,
  type MarketDeliveryProvider,
} from "@/lib/production/market-delivery";
import type { ObjectStorageAdapter } from "@/lib/production/object-storage";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import { RecognitionSubmissionService } from "@/lib/production/recognition-submission-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export const getProductionRecognitionSubmissionService = (
  database: ProductionDatabaseLike = getProductionDatabase(),
  storage: ObjectStorageAdapter = getProductionObjectStorage(),
  deliveryProvider: MarketDeliveryProvider = new DeterministicMarketDeliveryProvider(),
) =>
  new RecognitionSubmissionService(
    database,
    storage,
    deliveryProvider,
    new IdentityService(database),
  );

type Workspace = Awaited<
  ReturnType<RecognitionSubmissionService["getWorkspace"]>
>;
type ReviewerWorkspace = Awaited<
  ReturnType<RecognitionSubmissionService["getReviewerWorkspace"]>
>;

const fields = <T extends object, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Pick<T, K> =>
  Object.fromEntries(keys.map((key) => [key, value[key]])) as Pick<T, K>;

const presentResponse = <
  T extends {
    id: unknown;
    submissionVersionId: unknown;
    disposition: unknown;
    sourceAuthority: unknown;
    sourceReference: unknown;
    originalLanguage: unknown;
    normalizedReason: unknown;
    supersedesEventId: unknown;
    recordedAt: unknown;
  },
>(
  item: T,
) =>
  fields(item, [
    "id",
    "submissionVersionId",
    "disposition",
    "sourceAuthority",
    "sourceReference",
    "originalLanguage",
    "normalizedReason",
    "supersedesEventId",
    "recordedAt",
  ]);

const presentBinding = (item: Workspace["bindings"][number]) =>
  fields(item, [
    "id",
    "submissionVersionId",
    "playbookVersionId",
    "profileVersionId",
    "commitmentVersionId",
    "requestedAction",
    "destinationLabel",
    "deliveryMethod",
    "readinessStatus",
    "blockerSnapshot",
    "caveatSnapshot",
    "preparedAt",
    "humanConfirmed",
  ]);

export function presentRecognitionWorkspace(workspace: Workspace) {
  return {
    bindings: workspace.bindings.map(presentBinding),
    deliveries: workspace.deliveries.map((item) =>
      fields(item, [
        "id",
        "submissionVersionId",
        "attemptNumber",
        "deliveryMethod",
        "destination",
        "providerKey",
        "status",
        "providerReference",
        "failureCode",
        "attemptedAt",
        "deliveredAt",
        "requestHash",
        "supersedesDeliveryId",
      ]),
    ),
    receipts: workspace.receipts.map((item) =>
      fields(item, [
        "id",
        "deliveryId",
        "receiptType",
        "receiptHash",
        "sourceAuthority",
        "sourceReference",
        "receivedAt",
        "humanConfirmed",
      ]),
    ),
    sessions: workspace.sessions.map((item) =>
      fields(item, [
        "id",
        "submissionVersionId",
        "allowedActions",
        "downloadAllowed",
        "status",
        "expiresAt",
        "openedAt",
        "lastUsedAt",
        "revokedAt",
      ]),
    ),
    requests: workspace.requests.map((item) =>
      fields(item, [
        "id",
        "reviewerSessionId",
        "submissionVersionId",
        "requestType",
        "originalLanguage",
        "normalizedReason",
        "status",
        "requestedAt",
        "supersedesRequestId",
      ]),
    ),
    requestResponses: workspace.requestResponses.map((item) =>
      fields(item, [
        "id",
        "reviewerRequestId",
        "originalLanguage",
        "evidenceVersionIds",
        "respondedAt",
        "humanConfirmed",
      ]),
    ),
    outcomes: {
      evidence: workspace.outcomes.evidence.map((item) => ({
        ...presentResponse(item),
        ...fields(item, ["evidenceVersionId"]),
      })),
      model: workspace.outcomes.model.map((item) => ({
        ...presentResponse(item),
        ...fields(item, ["mappingId", "acceptedValue"]),
      })),
      rating: workspace.outcomes.rating.map((item) => ({
        ...presentResponse(item),
        ...fields(item, ["governedSourceVersionId"]),
      })),
      underwriting: workspace.outcomes.underwriting.map(presentResponse),
      placement: workspace.outcomes.placement.map((item) => ({
        ...presentResponse(item),
        ...fields(item, ["termSnapshot"]),
      })),
      funding: workspace.outcomes.funding.map(presentResponse),
    },
    closures: workspace.closures.map((item) =>
      fields(item, [
        "id",
        "caseId",
        "submissionVersionId",
        "closureStatus",
        "unresolvedCaveats",
        "note",
        "decidedAt",
        "supersedesEventId",
      ]),
    ),
    rollForwards: workspace.rollForwards.map((item) =>
      fields(item, [
        "id",
        "sourceCaseId",
        "targetCaseId",
        "maintenanceObligationId",
        "evidenceVersionId",
        "status",
        "basis",
        "reviewedAt",
      ]),
    ),
    doctrine: workspace.doctrine,
  };
}

export function presentRecognitionReviewerWorkspace(
  workspace: ReviewerWorkspace,
) {
  return {
    session: workspace.session,
    submission: workspace.submission,
    binding: workspace.binding ? presentBinding(workspace.binding) : undefined,
    artifacts: workspace.artifacts,
    evidenceItems: workspace.evidenceItems.map((item) =>
      fields(item, [
        "id",
        "submissionVersionId",
        "evidenceVersionId",
        "exhibitLabel",
      ]),
    ),
    mappings: workspace.mappings.map((item) =>
      fields(item, [
        "id",
        "submissionVersionId",
        "mappingId",
        "stateAtSubmission",
        "acceptedValueSnapshot",
      ]),
    ),
    requests: workspace.requests.map((item) =>
      fields(item, [
        "id",
        "reviewerSessionId",
        "submissionVersionId",
        "requestType",
        "originalLanguage",
        "normalizedReason",
        "status",
        "requestedAt",
        "supersedesRequestId",
      ]),
    ),
    responses: {
      evidence: workspace.responses.evidence.map((item) => ({
        ...presentResponse(item),
        ...fields(item, ["evidenceVersionId"]),
      })),
      model: workspace.responses.model.map((item) => ({
        ...presentResponse(item),
        ...fields(item, ["mappingId", "acceptedValue"]),
      })),
      rating: workspace.responses.rating.map((item) => ({
        ...presentResponse(item),
        ...fields(item, ["governedSourceVersionId"]),
      })),
      underwriting: workspace.responses.underwriting.map(presentResponse),
      placement: workspace.responses.placement.map((item) => ({
        ...presentResponse(item),
        ...fields(item, ["termSnapshot"]),
      })),
    },
    doctrine: workspace.doctrine,
  };
}
