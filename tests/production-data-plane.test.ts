import { PGlite } from "@electric-sql/pglite";
import { count, eq, sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  IdempotencyConflictError,
  OptimisticConcurrencyError,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";
import {
  SANDBOX_ORGANIZATION_ID,
  migrateDemoSeedToProduction,
} from "@/lib/production/seed-migration";
import { buildSeedState } from "@/lib/seed";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;

describe("normalized PostgreSQL tenant data plane", () => {
  beforeEach(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
  });

  afterEach(async () => {
    await client.close();
  });

  test("migrates a blank PostgreSQL-compatible database without DemoState storage", async () => {
    const tables = await client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    const triggers = await client.query<{ trigger_name: string }>(
      "select trigger_name from information_schema.triggers where trigger_schema = 'public' order by trigger_name",
    );
    expect(tables.rows.map((row) => row.table_name)).toHaveLength(190);
    expect(tables.rows.map((row) => row.table_name)).not.toContain("app_state");
    const triggerNames = [
      ...new Set(triggers.rows.map((row) => row.trigger_name)),
    ];
    expect(triggerNames).toEqual(
      expect.arrayContaining([
        "audit_events_no_delete",
        "audit_events_no_update",
        "evidence_versions_no_delete",
        "evidence_versions_no_update",
        "requirement_versions_no_delete",
        "requirement_versions_no_update",
        "submission_versions_no_delete",
        "submission_versions_no_update",
        "tenant_guard_communities_client",
        "tenant_guard_evidence_links_evidence",
        "tenant_guard_submissions_case",
        "tenant_guard_invitations_membership",
        "tenant_guard_external_access_case",
        "storage_access_grants_tenant_guard",
        "malware_scan_results_tenant_guard",
        "malware_scan_results_immutable_update",
        "backup_manifest_items_immutable_delete",
        "portfolio_imports_mapping_tenant_guard",
        "import_mapping_versions_immutable_update",
        "import_receipts_immutable_delete",
        "document_processing_jobs_document_tenant_guard",
        "document_processing_attempts_transition_guard",
        "document_extraction_runs_immutable_update",
        "extracted_fields_passage_tenant_guard",
        "extracted_field_reviews_immutable_delete",
        "document_facts_supersedes_tenant_guard",
        "document_facts_immutable_update",
        "playbook_versions_playbook_tenant_guard",
        "playbook_requirements_requirement_tenant_guard",
        "playbook_applicability_rules_requirement_tenant_guard",
        "playbook_version_reviews_separation_guard",
        "playbook_versions_scope_lineage_guard",
        "case_playbook_links_applicability_guard",
        "playbook_versions_immutable_update",
        "playbook_version_reviews_immutable_delete",
        "case_playbook_links_immutable_update",
        "governed_source_versions_source_tenant_guard",
        "governed_source_versions_storage_tenant_guard",
        "governed_source_reviews_separation_guard",
        "governed_source_publications_approval_guard",
        "governed_source_dependencies_consumer_guard",
        "source_change_alerts_lineage_guard",
        "playbook_versions_governed_source_publication_guard",
        "governed_sources_immutable_update",
        "governed_source_versions_immutable_update",
        "governed_source_reviews_immutable_delete",
        "governed_source_publications_immutable_delete",
        "governed_source_dependencies_immutable_update",
        "source_change_alerts_immutable_update",
        "target_profile_versions_profile_tenant_guard",
        "target_profile_versions_lineage_guard",
        "target_profile_reviews_separation_guard",
        "target_profile_publications_separation_guard",
        "intervention_versions_lineage_guard",
        "intervention_reviews_separation_guard",
        "baseline_assessments_published_profile_guard",
        "project_interventions_review_guard",
        "capital_plans_baseline_property_guard",
        "target_profile_versions_immutable_update",
        "baseline_gaps_immutable_delete",
        "capital_plan_scenarios_immutable_update",
        "funding_versions_programme_tenant_guard",
        "funding_programme_versions_lineage_guard",
        "funding_programme_reviews_separation_guard",
        "funding_programme_publications_separation_guard",
        "funding_assessments_publication_guard",
        "funding_applications_assessment_guard",
        "capital_contributions_stack_tenant_guard",
        "funding_commitment_events_immutable_update",
        "project_milestone_dependencies_order_guard",
        "project_milestone_events_immutable_delete",
        "disbursement_exports_immutable_update",
        "project_external_assignments_transition_guard",
        "stakeholder_benefits_immutable_delete",
        "property_portfolios_client_tenant_guard",
        "portfolio_properties_client_reference_guard",
        "portfolio_properties_property_tenant_guard",
        "parcels_property_tenant_guard",
        "unit_summaries_building_tenant_guard",
        "unit_summaries_property_reference_guard",
        "property_scopes_reference_guard",
        "property_relationships_to_tenant_guard",
        "property_versions_lineage_guard",
        "property_versions_immutable_update",
        "tenant_guard_portfolio_assignments_portfolio",
        "tenant_guard_portfolio_assignments_membership",
        "tenant_guard_portfolio_assignments_team",
        "tenant_guard_portfolio_assignments_external_principal",
        "tenant_guard_data_access_logs_portfolio",
        "tenant_guard_data_access_logs_case",
        "portfolio_assignments_revocation_only",
        "case_assignments_revocation_only",
        "data_access_logs_no_update",
        "data_access_logs_no_delete",
        "tenant_guard_evidence_requests_case",
        "tenant_guard_evidence_requests_external_principal",
        "tenant_guard_evidence_request_versions_request",
        "evidence_requests_current_version_guard",
        "evidence_requests_transition_guard",
        "evidence_request_versions_no_update",
        "evidence_request_versions_no_delete",
        "tenant_guard_submission_artifacts_version",
        "tenant_guard_submission_artifacts_storage",
        "submission_artifacts_no_update",
        "submission_artifacts_no_delete",
        "capital_stacks_scenario_project_guard",
        "payment_approvals_project_guard",
        "verification_assignments_integrity_guard",
        "verification_findings_integrity_guard",
        "verification_conflicts_immutable_update",
        "verification_findings_immutable_delete",
        "verification_certificate_events_immutable_update",
        "maintenance_obligation_events_immutable_delete",
        "property_condition_events_immutable_update",
        "external_model_versions_integrity_guard",
        "external_model_reviews_separation_guard",
        "external_model_publications_separation_guard",
        "model_output_records_integrity_guard",
        "model_input_mappings_integrity_guard",
        "model_mapping_evidence_integrity_guard",
        "model_mapping_reviews_separation_guard",
        "model_mapping_events_transition_guard",
        "market_commitment_versions_integrity_guard",
        "market_commitment_reviews_separation_guard",
        "market_commitment_publications_separation_guard",
        "model_input_mappings_immutable_update",
        "market_commitment_versions_restricted_update",
        "recognition_bindings_integrity_guard",
        "recognition_mappings_integrity_guard",
        "submission_deliveries_lineage_guard",
        "delivery_receipts_integrity_guard",
        "reviewer_sessions_integrity_guard",
        "reviewer_requests_integrity_guard",
        "reviewer_responses_integrity_guard",
        "evidence_acceptance_integrity_guard",
        "model_responses_integrity_guard",
        "rating_responses_integrity_guard",
        "underwriting_responses_integrity_guard",
        "placement_responses_integrity_guard",
        "funding_responses_integrity_guard",
        "recognition_closures_integrity_guard",
        "maintenance_roll_forward_integrity_guard",
        "reviewer_sessions_restricted_update",
        "recognition_bindings_immutable_update",
        "delivery_receipts_immutable_delete",
        "programme_cohort_versions_integrity_guard",
        "programme_membership_integrity_guard",
        "analytics_policy_publications_integrity_guard",
        "recognition_graph_integrity_guard",
        "programme_snapshots_integrity_guard",
        "analytics_reports_integrity_guard",
        "analytics_artifacts_integrity_guard",
        "analytics_receipts_integrity_guard",
        "analytics_reports_immutable_update",
        "integration_events_integrity_guard",
        "integration_schemas_integrity_guard",
        "integration_jobs_integrity_guard",
        "integration_attempts_integrity_guard",
        "integration_receipts_integrity_guard",
        "integration_webhooks_integrity_guard",
        "integration_deliveries_integrity_guard",
        "integration_jobs_restricted_update",
        "integration_receipts_immutable_delete",
      ]),
    );
    expect(triggerNames).toHaveLength(637);
  });

  test("isolates reads and mutations by explicit organization context", async () => {
    const alpha = await createTenantFixture(
      database as unknown as ProductionDatabaseLike,
      "alpha",
    );
    const beta = await createTenantFixture(
      database as unknown as ProductionDatabaseLike,
      "beta",
    );
    expect(await alpha.repository.listCommunities(alpha.context)).toHaveLength(1);
    expect(await beta.repository.listCommunities(beta.context)).toHaveLength(1);
    expect(
      await alpha.repository.getCommunity(alpha.context, beta.communityId),
    ).toBeNull();
    await expect(
      alpha.repository.updateCommunitySummary(
        alpha.context,
        beta.communityId,
        1,
        "Cross-tenant write",
      ),
    ).rejects.toBeInstanceOf(TenantResourceNotFoundError);
    await expect(
      database.insert(schema.communities).values({
        id: "community-cross-tenant",
        organizationId: alpha.organizationId,
        clientId: beta.clientId,
        name: "Invalid cross-tenant community",
        propertyClass: "condominium",
        summary: "Must never persist",
        createdAt: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-08-01T12:00:00.000Z",
        createdBy: alpha.context.actorSubject,
        updatedBy: alpha.context.actorSubject,
        revision: 1,
        lifecycleStatus: "active",
      }),
    ).rejects.toThrow();
    expect(
      await alpha.repository.getCommunity(
        alpha.context,
        "community-cross-tenant",
      ),
    ).toBeNull();
  });

  test("uses optimistic concurrency and commits audit with the mutation", async () => {
    const fixture = await createTenantFixture(
      database as unknown as ProductionDatabaseLike,
      "concurrency",
    );
    const updated = await fixture.repository.updateCommunitySummary(
      fixture.context,
      fixture.communityId,
      1,
      "Broker-confirmed summary",
    );
    expect(updated.revision).toBe(2);
    await expect(
      fixture.repository.updateCommunitySummary(
        fixture.context,
        fixture.communityId,
        1,
        "Stale write",
      ),
    ).rejects.toBeInstanceOf(OptimisticConcurrencyError);
    const events = await fixture.repository.listAuditEvents(fixture.context);
    expect(events.map((event) => event.action)).toEqual([
      "community.created",
      "community.summary_updated",
    ]);
    await expect(
      database
        .update(schema.auditEvents)
        .set({ action: "tampered" })
        .where(eq(schema.auditEvents.id, events[0].id)),
    ).rejects.toThrow();
    const unchangedAudit = await database
      .select({ action: schema.auditEvents.action })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.id, events[0].id));
    expect(unchangedAudit[0].action).toBe("community.created");
  });

  test("replays identical case creation and rejects idempotency key reuse", async () => {
    const fixture = await createTenantFixture(
      database as unknown as ProductionDatabaseLike,
      "idempotency",
    );
    const input = {
      id: "case-idempotency",
      policyId: fixture.policyId,
      title: "2027 renewal",
      status: "open",
      caseType: "renewal" as const,
      peril: "wildfire",
      jurisdiction: "US-CO",
      propertyClass: "condominium",
      renewalDate: "2027-01-01",
    };
    const first = await fixture.repository.createRenewalCase(
      fixture.context,
      "request-1",
      input,
    );
    const replay = await fixture.repository.createRenewalCase(
      fixture.context,
      "request-1",
      input,
    );
    expect(replay).toEqual(first);
    const caseCount = await database
      .select({ value: count() })
      .from(schema.renewalCases)
      .where(
        eq(schema.renewalCases.organizationId, fixture.organizationId),
      );
    expect(caseCount[0].value).toBe(1);
    await expect(
      fixture.repository.createRenewalCase(fixture.context, "request-1", {
        ...input,
        title: "Different request",
      }),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  test("migrates the deterministic seed into an isolated synthetic organization", async () => {
    const seed = buildSeedState();
    const receipt = await migrateDemoSeedToProduction(
      database as unknown as ProductionDatabaseLike,
      seed,
    );
    expect(receipt.replayed).toBe(false);
    expect(receipt.organizationId).toBe(SANDBOX_ORGANIZATION_ID);
    expect(receipt.counts).toMatchObject({
      communities: 3,
      requirements: 28,
      evidenceVersions: 42,
      submissions: 3,
    });
    const replay = await migrateDemoSeedToProduction(
      database as unknown as ProductionDatabaseLike,
      seed,
    );
    expect(replay.replayed).toBe(true);
    const sandbox = await database
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, SANDBOX_ORGANIZATION_ID));
    expect(sandbox[0]).toMatchObject({
      environment: "sandbox",
      synthetic: true,
      crossCustomerAnalyticsOptIn: false,
    });
    const evidenceCount = await database
      .select({ value: count() })
      .from(schema.evidenceVersions)
      .where(
        eq(
          schema.evidenceVersions.organizationId,
          SANDBOX_ORGANIZATION_ID,
        ),
      );
    expect(evidenceCount[0].value).toBe(42);
    const evidence = await database
      .select({ id: schema.evidenceVersions.id })
      .from(schema.evidenceVersions)
      .limit(1);
    await expect(
      database
        .update(schema.evidenceVersions)
        .set({ reviewStatus: "tampered" })
        .where(eq(schema.evidenceVersions.id, evidence[0].id)),
    ).rejects.toThrow();
    const unchangedEvidence = await database
      .select({ reviewStatus: schema.evidenceVersions.reviewStatus })
      .from(schema.evidenceVersions)
      .where(eq(schema.evidenceVersions.id, evidence[0].id));
    expect(unchangedEvidence[0].reviewStatus).not.toBe("tampered");
    const stateTable = await database.execute(
      sql`select to_regclass('public.app_state') as name`,
    );
    expect(stateTable.rows[0]).toEqual({ name: null });
  });

  test("rolls back a failed seed migration without partial tenant records", async () => {
    const brokenSeed = structuredClone(buildSeedState());
    brokenSeed.evidence[1].sha256 = brokenSeed.evidence[0].sha256;
    await expect(
      migrateDemoSeedToProduction(
        database as unknown as ProductionDatabaseLike,
        brokenSeed,
      ),
    ).rejects.toThrow();
    const communitiesAfterFailure = await database
      .select({ value: count() })
      .from(schema.communities)
      .where(
        eq(schema.communities.organizationId, SANDBOX_ORGANIZATION_ID),
      );
    const receiptsAfterFailure = await database
      .select({ value: count() })
      .from(schema.idempotencyKeys)
      .where(
        eq(schema.idempotencyKeys.organizationId, SANDBOX_ORGANIZATION_ID),
      );
    expect(communitiesAfterFailure[0].value).toBe(0);
    expect(receiptsAfterFailure[0].value).toBe(0);
  });
});
