import { describe, expect, test } from "vitest";
import {
  boundedContextIds,
  defineCommand,
  defineQuery,
  OperationContractError,
} from "@/lib/production/kernel/operations";

const context = {
  organizationId: "organization-kernel-test",
  actorSubject: "actor-kernel-test",
  principalType: "membership" as const,
  grantedScopes: ["property_portfolio:read"],
};

describe("application operation semantic kernel", () => {
  test("preserves bounded query identity and tenant actor context", () => {
    expect(
      defineQuery({
        boundedContext: "portfolio_property",
        name: "property_graph.workspace",
        context,
        input: undefined,
      }),
    ).toEqual({
      kind: "query",
      boundedContext: "portfolio_property",
      name: "property_graph.workspace",
      context,
      input: undefined,
    });
  });

  test("normalizes command idempotency and rejects missing operation authority", () => {
    expect(
      defineCommand({
        boundedContext: "portfolio_property",
        name: "property_graph.register",
        context,
        idempotencyKey: "  property-command-1  ",
        input: { portfolioId: "portfolio-kernel-test" },
      }).idempotencyKey,
    ).toBe("property-command-1");

    expect(() =>
      defineCommand({
        boundedContext: "portfolio_property",
        name: "property_graph.register",
        context,
        idempotencyKey: " ",
        input: {},
      }),
    ).toThrow(OperationContractError);
    expect(() =>
      defineQuery({
        boundedContext: "portfolio_property",
        name: "property_graph.workspace",
        context: { ...context, organizationId: "" },
        input: undefined,
      }),
    ).toThrow(OperationContractError);
  });

  test("keeps the complete bounded-context vocabulary stable", () => {
    expect(new Set(boundedContextIds).size).toBe(boundedContextIds.length);
    expect(boundedContextIds).toContain("sandbox_compatibility");
    expect(boundedContextIds).toContain("market_recognition");
  });
});
