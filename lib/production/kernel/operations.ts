/**
 * Small shared semantic kernel for application operations.
 *
 * Bounded contexts own their payloads and results. The kernel owns only the
 * metadata required to execute them consistently: tenant/actor context,
 * operation identity, and idempotency for commands.
 */

export const boundedContextIds = [
  "platform",
  "identity_access",
  "evidence_custody",
  "portfolio_import",
  "portfolio_property",
  "case_workflow",
  "document_intelligence",
  "source_governance",
  "resilience_planning",
  "funding_execution",
  "market_playbooks",
  "independent_verification",
  "model_recognition",
  "market_recognition",
  "programme_intelligence",
  "integrations",
  "sandbox_compatibility",
] as const;

export type BoundedContextId = (typeof boundedContextIds)[number];

export interface OperationActorContext {
  organizationId: string;
  actorSubject: string;
}

export interface QueryOperation<
  TName extends string,
  TContext extends OperationActorContext,
  TInput = undefined,
> {
  kind: "query";
  boundedContext: BoundedContextId;
  name: TName;
  context: TContext;
  input: TInput;
}

export interface CommandOperation<
  TName extends string,
  TContext extends OperationActorContext,
  TInput,
> {
  kind: "command";
  boundedContext: BoundedContextId;
  name: TName;
  context: TContext;
  idempotencyKey: string;
  input: TInput;
}

export class OperationContractError extends Error {
  readonly code = "operation_contract_invalid";

  constructor(message: string) {
    super(message);
    this.name = "OperationContractError";
  }
}

function requireActorContext<TContext extends OperationActorContext>(
  context: TContext,
): TContext {
  if (!context.organizationId?.trim() || !context.actorSubject?.trim())
    throw new OperationContractError(
      "An organization and actor are required for every tenant operation.",
    );
  return context;
}

export function defineQuery<
  TName extends string,
  TContext extends OperationActorContext,
  TInput = undefined,
>(input: {
  boundedContext: BoundedContextId;
  name: TName;
  context: TContext;
  input: TInput;
}): QueryOperation<TName, TContext, TInput> {
  return {
    kind: "query",
    boundedContext: input.boundedContext,
    name: input.name,
    context: requireActorContext(input.context),
    input: input.input,
  };
}

export function defineCommand<
  TName extends string,
  TContext extends OperationActorContext,
  TInput,
>(input: {
  boundedContext: BoundedContextId;
  name: TName;
  context: TContext;
  idempotencyKey: string;
  input: TInput;
}): CommandOperation<TName, TContext, TInput> {
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey)
    throw new OperationContractError(
      "An idempotency key is required for every command.",
    );
  return {
    kind: "command",
    boundedContext: input.boundedContext,
    name: input.name,
    context: requireActorContext(input.context),
    idempotencyKey,
    input: input.input,
  };
}
