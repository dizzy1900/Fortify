CREATE TABLE "capital_stack_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"capital_stack_id" text NOT NULL,
	"programme_version_id" text,
	"contribution_type" text NOT NULL,
	"contributor_name" text NOT NULL,
	"source_reference" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"cost_share_bps" integer NOT NULL,
	"purpose" text NOT NULL,
	CONSTRAINT "capital_stack_contributions_type_check" CHECK ("capital_stack_contributions"."contribution_type" in ('owner', 'grant', 'financing', 'insurer', 'reinsurer', 'local_government', 'philanthropic')),
	CONSTRAINT "capital_stack_contributions_amount_check" CHECK ("capital_stack_contributions"."amount_cents" > 0),
	CONSTRAINT "capital_stack_contributions_share_check" CHECK ("capital_stack_contributions"."cost_share_bps" between 1 and 10000),
	CONSTRAINT "capital_stack_contributions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "capital_stacks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"project_id" text NOT NULL,
	"capital_plan_scenario_id" text,
	"name" text NOT NULL,
	"project_cost_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"state" text DEFAULT 'proposed' NOT NULL,
	"decision_boundary" text NOT NULL,
	CONSTRAINT "capital_stacks_cost_check" CHECK ("capital_stacks"."project_cost_cents" > 0),
	CONSTRAINT "capital_stacks_state_check" CHECK ("capital_stacks"."state" in ('proposed', 'approved', 'cancelled')),
	CONSTRAINT "capital_stacks_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "disbursement_exports" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"payment_approval_id" text NOT NULL,
	"export_version" integer NOT NULL,
	"instruction_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"exported_by" text NOT NULL,
	"exported_at" timestamp with time zone NOT NULL,
	"execution_state" text DEFAULT 'not_executed_export_only' NOT NULL,
	CONSTRAINT "disbursement_exports_version_check" CHECK ("disbursement_exports"."export_version" >= 1),
	CONSTRAINT "disbursement_exports_execution_check" CHECK ("disbursement_exports"."execution_state" = 'not_executed_export_only'),
	CONSTRAINT "disbursement_exports_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"project_id" text NOT NULL,
	"programme_version_id" text NOT NULL,
	"eligibility_assessment_id" text NOT NULL,
	"requested_amount_cents" integer NOT NULL,
	"state" text DEFAULT 'prepared' NOT NULL,
	"human_confirmed_by" text NOT NULL,
	"prepared_at" timestamp with time zone NOT NULL,
	"limitations" text NOT NULL,
	CONSTRAINT "funding_applications_amount_check" CHECK ("funding_applications"."requested_amount_cents" > 0),
	CONSTRAINT "funding_applications_state_check" CHECK ("funding_applications"."state" in ('prepared', 'submitted_external', 'withdrawn')),
	CONSTRAINT "funding_applications_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_commitment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"commitment_id" text NOT NULL,
	"event_type" text NOT NULL,
	"effective_amount_cents" integer NOT NULL,
	"rationale" text NOT NULL,
	"decided_by" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"supersedes_event_id" text,
	CONSTRAINT "funding_commitment_events_type_check" CHECK ("funding_commitment_events"."event_type" in ('proposed', 'approved', 'corrected', 'cancelled')),
	CONSTRAINT "funding_commitment_events_amount_check" CHECK ("funding_commitment_events"."effective_amount_cents" >= 0),
	CONSTRAINT "funding_commitment_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_commitments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"contribution_id" text NOT NULL,
	"committed_amount_cents" integer NOT NULL,
	"terms" text NOT NULL,
	"proposed_by" text NOT NULL,
	"proposed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "funding_commitments_amount_check" CHECK ("funding_commitments"."committed_amount_cents" > 0),
	CONSTRAINT "funding_commitments_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_eligibility_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"project_id" text NOT NULL,
	"programme_version_id" text NOT NULL,
	"state" text NOT NULL,
	"input_facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"input_hash" text NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assessed_by" text NOT NULL,
	"assessed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "funding_eligibility_assessments_state_check" CHECK ("funding_eligibility_assessments"."state" in ('eligible', 'ineligible', 'insufficient_evidence')),
	CONSTRAINT "funding_eligibility_assessments_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_eligibility_rule_results" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"assessment_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"state" text NOT NULL,
	"observed_value" jsonb,
	"reason" text NOT NULL,
	CONSTRAINT "funding_rule_results_state_check" CHECK ("funding_eligibility_rule_results"."state" in ('matched', 'not_matched', 'insufficient_evidence')),
	CONSTRAINT "funding_rule_results_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_eligibility_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"programme_version_id" text NOT NULL,
	"code" text NOT NULL,
	"field" text NOT NULL,
	"operator" text NOT NULL,
	"expected_values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "funding_eligibility_rules_operator_check" CHECK ("funding_eligibility_rules"."operator" in ('equals', 'one_of', 'includes', 'at_least', 'at_most')),
	CONSTRAINT "funding_eligibility_rules_position_check" CHECK ("funding_eligibility_rules"."position" >= 1),
	CONSTRAINT "funding_eligibility_rules_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_programme_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"programme_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"publisher_subject" text NOT NULL,
	"note" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	CONSTRAINT "funding_programme_publications_decision_check" CHECK ("funding_programme_publications"."decision" in ('published', 'rejected')),
	CONSTRAINT "funding_programme_publications_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_programme_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"programme_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"source_and_rules_checked" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "funding_programme_reviews_decision_check" CHECK ("funding_programme_reviews"."decision" in ('approved', 'changes_requested')),
	CONSTRAINT "funding_programme_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_programme_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"programme_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"governed_source_version_id" text NOT NULL,
	"target_profile_version_id" text,
	"jurisdiction" text NOT NULL,
	"hazard" text NOT NULL,
	"property_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"application_opens_on" date NOT NULL,
	"application_closes_on" date NOT NULL,
	"maximum_award_cents" integer NOT NULL,
	"maximum_cost_share_bps" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"evidence_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payment_conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"maintenance_obligations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"limitations" text NOT NULL,
	"author_subject" text NOT NULL,
	"supersedes_version_id" text,
	CONSTRAINT "funding_programme_versions_number_check" CHECK ("funding_programme_versions"."version_number" >= 1),
	CONSTRAINT "funding_programme_versions_window_check" CHECK ("funding_programme_versions"."application_closes_on" >= "funding_programme_versions"."application_opens_on"),
	CONSTRAINT "funding_programme_versions_award_check" CHECK ("funding_programme_versions"."maximum_award_cents" >= 0),
	CONSTRAINT "funding_programme_versions_share_check" CHECK ("funding_programme_versions"."maximum_cost_share_bps" between 0 and 10000),
	CONSTRAINT "funding_programme_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_programmes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"canonical_key" text NOT NULL,
	"name" text NOT NULL,
	"sponsor_name" text NOT NULL,
	"programme_type" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "funding_programmes_type_check" CHECK ("funding_programmes"."programme_type" in ('public_grant', 'insurer', 'reinsurer', 'lender', 'philanthropic', 'local_government', 'mixed')),
	CONSTRAINT "funding_programmes_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "payment_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"milestone_id" text NOT NULL,
	"contribution_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"decision" text NOT NULL,
	"approver_subject" text NOT NULL,
	"note" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_approvals_amount_check" CHECK ("payment_approvals"."amount_cents" > 0),
	CONSTRAINT "payment_approvals_decision_check" CHECK ("payment_approvals"."decision" in ('approved', 'rejected')),
	CONSTRAINT "payment_approvals_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "project_external_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"project_id" text NOT NULL,
	"external_principal_id" text NOT NULL,
	"collaborator_role" text NOT NULL,
	"purpose" text NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"due_on" date,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "project_external_assignments_role_check" CHECK ("project_external_assignments"."collaborator_role" in ('property_manager', 'board_contributor', 'contractor')),
	CONSTRAINT "project_external_assignments_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "project_milestone_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"milestone_id" text NOT NULL,
	"depends_on_milestone_id" text NOT NULL,
	CONSTRAINT "project_milestone_dependencies_self_check" CHECK ("project_milestone_dependencies"."milestone_id" <> "project_milestone_dependencies"."depends_on_milestone_id"),
	CONSTRAINT "project_milestone_dependencies_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "project_milestone_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"milestone_id" text NOT NULL,
	"event_type" text NOT NULL,
	"note" text NOT NULL,
	"decided_by" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"supersedes_event_id" text,
	CONSTRAINT "project_milestone_events_type_check" CHECK ("project_milestone_events"."event_type" in ('started', 'evidence_submitted', 'approved', 'changes_requested', 'corrected', 'cancelled')),
	CONSTRAINT "project_milestone_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"project_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"due_on" date,
	"evidence_requirement" text NOT NULL,
	"payment_eligible" boolean DEFAULT false NOT NULL,
	"planned_payment_cents" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "project_milestones_position_check" CHECK ("project_milestones"."position" >= 1),
	CONSTRAINT "project_milestones_payment_check" CHECK ("project_milestones"."planned_payment_cents" >= 0),
	CONSTRAINT "project_milestones_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "stakeholder_benefit_ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"project_id" text NOT NULL,
	"stakeholder_type" text NOT NULL,
	"stakeholder_name" text NOT NULL,
	"expected_benefit_category" text NOT NULL,
	"expected_cost_cents" integer NOT NULL,
	"funding_contribution_cents" integer NOT NULL,
	"evidence_level" text NOT NULL,
	"source" text NOT NULL,
	"timeframe" text NOT NULL,
	"uncertainty" text NOT NULL,
	"commitment_state" text NOT NULL,
	"realised_response_state" text NOT NULL,
	"correction_of_id" text,
	CONSTRAINT "stakeholder_benefit_cost_check" CHECK ("stakeholder_benefit_ledger_entries"."expected_cost_cents" >= 0 and "stakeholder_benefit_ledger_entries"."funding_contribution_cents" >= 0),
	CONSTRAINT "stakeholder_benefit_evidence_check" CHECK ("stakeholder_benefit_ledger_entries"."evidence_level" in ('self_attested', 'documented', 'professional_observation', 'independent_verification', 'jurisdictional_record', 'programme_recognition', 'insurer_acknowledgement', 'modeled_analysis', 'measured_outcome')),
	CONSTRAINT "stakeholder_benefit_commitment_check" CHECK ("stakeholder_benefit_ledger_entries"."commitment_state" in ('none', 'proposed', 'approved', 'cancelled')),
	CONSTRAINT "stakeholder_benefit_response_check" CHECK ("stakeholder_benefit_ledger_entries"."realised_response_state" in ('not_observed', 'recorded', 'corrected')),
	CONSTRAINT "stakeholder_benefit_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "capital_stack_contributions" ADD CONSTRAINT "capital_stack_contributions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_stack_contributions" ADD CONSTRAINT "capital_stack_contributions_capital_stack_id_capital_stacks_id_fk" FOREIGN KEY ("capital_stack_id") REFERENCES "public"."capital_stacks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_stack_contributions" ADD CONSTRAINT "capital_stack_contributions_programme_version_id_funding_programme_versions_id_fk" FOREIGN KEY ("programme_version_id") REFERENCES "public"."funding_programme_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_stacks" ADD CONSTRAINT "capital_stacks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_stacks" ADD CONSTRAINT "capital_stacks_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_stacks" ADD CONSTRAINT "capital_stacks_capital_plan_scenario_id_capital_plan_scenarios_id_fk" FOREIGN KEY ("capital_plan_scenario_id") REFERENCES "public"."capital_plan_scenarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursement_exports" ADD CONSTRAINT "disbursement_exports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursement_exports" ADD CONSTRAINT "disbursement_exports_payment_approval_id_payment_approvals_id_fk" FOREIGN KEY ("payment_approval_id") REFERENCES "public"."payment_approvals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_applications" ADD CONSTRAINT "funding_applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_applications" ADD CONSTRAINT "funding_applications_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_applications" ADD CONSTRAINT "funding_applications_programme_version_id_funding_programme_versions_id_fk" FOREIGN KEY ("programme_version_id") REFERENCES "public"."funding_programme_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_applications" ADD CONSTRAINT "funding_applications_eligibility_assessment_id_funding_eligibility_assessments_id_fk" FOREIGN KEY ("eligibility_assessment_id") REFERENCES "public"."funding_eligibility_assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_commitment_events" ADD CONSTRAINT "funding_commitment_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_commitment_events" ADD CONSTRAINT "funding_commitment_events_commitment_id_funding_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."funding_commitments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_commitment_events" ADD CONSTRAINT "funding_commitment_events_supersedes_event_id_funding_commitment_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."funding_commitment_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_commitments" ADD CONSTRAINT "funding_commitments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_commitments" ADD CONSTRAINT "funding_commitments_contribution_id_capital_stack_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."capital_stack_contributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_eligibility_assessments" ADD CONSTRAINT "funding_eligibility_assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_eligibility_assessments" ADD CONSTRAINT "funding_eligibility_assessments_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_eligibility_assessments" ADD CONSTRAINT "funding_eligibility_assessments_programme_version_id_funding_programme_versions_id_fk" FOREIGN KEY ("programme_version_id") REFERENCES "public"."funding_programme_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_eligibility_rule_results" ADD CONSTRAINT "funding_eligibility_rule_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_eligibility_rule_results" ADD CONSTRAINT "funding_eligibility_rule_results_assessment_id_funding_eligibility_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."funding_eligibility_assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_eligibility_rule_results" ADD CONSTRAINT "funding_eligibility_rule_results_rule_id_funding_eligibility_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."funding_eligibility_rules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_eligibility_rules" ADD CONSTRAINT "funding_eligibility_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_eligibility_rules" ADD CONSTRAINT "funding_eligibility_rules_programme_version_id_funding_programme_versions_id_fk" FOREIGN KEY ("programme_version_id") REFERENCES "public"."funding_programme_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programme_publications" ADD CONSTRAINT "funding_programme_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programme_publications" ADD CONSTRAINT "funding_programme_publications_programme_version_id_funding_programme_versions_id_fk" FOREIGN KEY ("programme_version_id") REFERENCES "public"."funding_programme_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programme_reviews" ADD CONSTRAINT "funding_programme_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programme_reviews" ADD CONSTRAINT "funding_programme_reviews_programme_version_id_funding_programme_versions_id_fk" FOREIGN KEY ("programme_version_id") REFERENCES "public"."funding_programme_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programme_versions" ADD CONSTRAINT "funding_programme_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programme_versions" ADD CONSTRAINT "funding_programme_versions_programme_id_funding_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."funding_programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programme_versions" ADD CONSTRAINT "funding_programme_versions_governed_source_version_id_governed_source_versions_id_fk" FOREIGN KEY ("governed_source_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programme_versions" ADD CONSTRAINT "funding_programme_versions_target_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("target_profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programme_versions" ADD CONSTRAINT "funding_programme_versions_supersedes_version_id_funding_programme_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."funding_programme_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_programmes" ADD CONSTRAINT "funding_programmes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_approvals" ADD CONSTRAINT "payment_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_approvals" ADD CONSTRAINT "payment_approvals_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_approvals" ADD CONSTRAINT "payment_approvals_contribution_id_capital_stack_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."capital_stack_contributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_external_assignments" ADD CONSTRAINT "project_external_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_external_assignments" ADD CONSTRAINT "project_external_assignments_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_external_assignments" ADD CONSTRAINT "project_external_assignments_external_principal_id_external_principals_id_fk" FOREIGN KEY ("external_principal_id") REFERENCES "public"."external_principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestone_dependencies" ADD CONSTRAINT "project_milestone_dependencies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestone_dependencies" ADD CONSTRAINT "project_milestone_dependencies_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestone_dependencies" ADD CONSTRAINT "project_milestone_dependencies_depends_on_milestone_id_project_milestones_id_fk" FOREIGN KEY ("depends_on_milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestone_events" ADD CONSTRAINT "project_milestone_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestone_events" ADD CONSTRAINT "project_milestone_events_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestone_events" ADD CONSTRAINT "project_milestone_events_supersedes_event_id_project_milestone_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."project_milestone_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_benefit_ledger_entries" ADD CONSTRAINT "stakeholder_benefit_ledger_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_benefit_ledger_entries" ADD CONSTRAINT "stakeholder_benefit_ledger_entries_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_benefit_ledger_entries" ADD CONSTRAINT "stakeholder_benefit_ledger_entries_correction_of_id_stakeholder_benefit_ledger_entries_id_fk" FOREIGN KEY ("correction_of_id") REFERENCES "public"."stakeholder_benefit_ledger_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "capital_stack_contributions_org_source_unique" ON "capital_stack_contributions" USING btree ("organization_id","capital_stack_id","source_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "disbursement_exports_org_approval_version_unique" ON "disbursement_exports" USING btree ("organization_id","payment_approval_id","export_version");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_applications_org_project_programme_unique" ON "funding_applications" USING btree ("organization_id","project_id","programme_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_commitments_org_contribution_unique" ON "funding_commitments" USING btree ("organization_id","contribution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_rule_results_org_pair_unique" ON "funding_eligibility_rule_results" USING btree ("organization_id","assessment_id","rule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_eligibility_rules_org_code_unique" ON "funding_eligibility_rules" USING btree ("organization_id","programme_version_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_programme_publications_org_version_unique" ON "funding_programme_publications" USING btree ("organization_id","programme_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_programme_reviews_org_version_unique" ON "funding_programme_reviews" USING btree ("organization_id","programme_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_programme_versions_org_number_unique" ON "funding_programme_versions" USING btree ("organization_id","programme_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "funding_programmes_org_key_unique" ON "funding_programmes" USING btree ("organization_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "project_external_assignments_token_unique" ON "project_external_assignments" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "project_milestone_dependencies_org_pair_unique" ON "project_milestone_dependencies" USING btree ("organization_id","milestone_id","depends_on_milestone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_milestones_org_code_unique" ON "project_milestones" USING btree ("organization_id","project_id","code");
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_versions_programme_tenant_guard" AFTER INSERT OR UPDATE ON "funding_programme_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('programme_id', 'funding_programmes');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_versions_source_tenant_guard" AFTER INSERT OR UPDATE ON "funding_programme_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('governed_source_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_versions_profile_tenant_guard" AFTER INSERT OR UPDATE ON "funding_programme_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."target_profile_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('target_profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_versions_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "funding_programme_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'funding_programme_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_rules_version_tenant_guard" AFTER INSERT OR UPDATE ON "funding_eligibility_rules" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('programme_version_id', 'funding_programme_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_reviews_version_tenant_guard" AFTER INSERT OR UPDATE ON "funding_programme_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('programme_version_id', 'funding_programme_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_publications_version_tenant_guard" AFTER INSERT OR UPDATE ON "funding_programme_publications" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('programme_version_id', 'funding_programme_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_assessments_project_tenant_guard" AFTER INSERT OR UPDATE ON "funding_eligibility_assessments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_assessments_version_tenant_guard" AFTER INSERT OR UPDATE ON "funding_eligibility_assessments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('programme_version_id', 'funding_programme_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_results_assessment_tenant_guard" AFTER INSERT OR UPDATE ON "funding_eligibility_rule_results" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('assessment_id', 'funding_eligibility_assessments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_results_rule_tenant_guard" AFTER INSERT OR UPDATE ON "funding_eligibility_rule_results" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('rule_id', 'funding_eligibility_rules');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_applications_project_tenant_guard" AFTER INSERT OR UPDATE ON "funding_applications" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_applications_version_tenant_guard" AFTER INSERT OR UPDATE ON "funding_applications" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('programme_version_id', 'funding_programme_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_applications_assessment_tenant_guard" AFTER INSERT OR UPDATE ON "funding_applications" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('eligibility_assessment_id', 'funding_eligibility_assessments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "capital_stacks_project_tenant_guard" AFTER INSERT OR UPDATE ON "capital_stacks" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "capital_stacks_scenario_tenant_guard" AFTER INSERT OR UPDATE ON "capital_stacks" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."capital_plan_scenario_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('capital_plan_scenario_id', 'capital_plan_scenarios');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "capital_contributions_stack_tenant_guard" AFTER INSERT OR UPDATE ON "capital_stack_contributions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('capital_stack_id', 'capital_stacks');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "capital_contributions_programme_tenant_guard" AFTER INSERT OR UPDATE ON "capital_stack_contributions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."programme_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('programme_version_id', 'funding_programme_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_commitments_contribution_tenant_guard" AFTER INSERT OR UPDATE ON "funding_commitments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('contribution_id', 'capital_stack_contributions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_commitment_events_commitment_tenant_guard" AFTER INSERT OR UPDATE ON "funding_commitment_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('commitment_id', 'funding_commitments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_commitment_events_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "funding_commitment_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_event_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_event_id', 'funding_commitment_events');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "project_milestones_project_tenant_guard" AFTER INSERT OR UPDATE ON "project_milestones" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "project_milestone_dependencies_item_tenant_guard" AFTER INSERT OR UPDATE ON "project_milestone_dependencies" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('milestone_id', 'project_milestones');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "project_milestone_dependencies_predecessor_tenant_guard" AFTER INSERT OR UPDATE ON "project_milestone_dependencies" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('depends_on_milestone_id', 'project_milestones');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "project_milestone_events_item_tenant_guard" AFTER INSERT OR UPDATE ON "project_milestone_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('milestone_id', 'project_milestones');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "project_milestone_events_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "project_milestone_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_event_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_event_id', 'project_milestone_events');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "payment_approvals_milestone_tenant_guard" AFTER INSERT OR UPDATE ON "payment_approvals" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('milestone_id', 'project_milestones');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "payment_approvals_contribution_tenant_guard" AFTER INSERT OR UPDATE ON "payment_approvals" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('contribution_id', 'capital_stack_contributions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "disbursement_exports_approval_tenant_guard" AFTER INSERT OR UPDATE ON "disbursement_exports" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('payment_approval_id', 'payment_approvals');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "project_external_assignments_project_tenant_guard" AFTER INSERT OR UPDATE ON "project_external_assignments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "project_external_assignments_principal_tenant_guard" AFTER INSERT OR UPDATE ON "project_external_assignments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('external_principal_id', 'external_principals');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "stakeholder_benefits_project_tenant_guard" AFTER INSERT OR UPDATE ON "stakeholder_benefit_ledger_entries" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "stakeholder_benefits_correction_tenant_guard" AFTER INSERT OR UPDATE ON "stakeholder_benefit_ledger_entries" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."correction_of_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('correction_of_id', 'stakeholder_benefit_ledger_entries');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_capital_stack_scenario_project_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.capital_plan_scenario_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM capital_plan_scenario_projects
    WHERE organization_id = NEW.organization_id
      AND scenario_id = NEW.capital_plan_scenario_id
      AND project_id = NEW.project_id
  ) THEN RAISE EXCEPTION 'capital stack scenario must include the same project'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "capital_stacks_scenario_project_guard" BEFORE INSERT ON "capital_stacks" FOR EACH ROW EXECUTE FUNCTION fortify_capital_stack_scenario_project_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_payment_approval_project_guard() RETURNS trigger AS $$
DECLARE milestone_project text; contribution_project text;
BEGIN
  SELECT project_id INTO milestone_project FROM project_milestones WHERE id = NEW.milestone_id AND organization_id = NEW.organization_id;
  SELECT stacks.project_id INTO contribution_project
    FROM capital_stack_contributions contributions
    JOIN capital_stacks stacks ON stacks.id = contributions.capital_stack_id
    WHERE contributions.id = NEW.contribution_id AND contributions.organization_id = NEW.organization_id;
  IF milestone_project IS NULL OR contribution_project IS NULL OR milestone_project <> contribution_project THEN
    RAISE EXCEPTION 'payment approval milestone and contribution must belong to the same project';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "payment_approvals_project_guard" BEFORE INSERT ON "payment_approvals" FOR EACH ROW EXECUTE FUNCTION fortify_payment_approval_project_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_funding_programme_lineage_guard() RETURNS trigger AS $$
DECLARE predecessor record;
BEGIN
  IF NEW.supersedes_version_id IS NULL AND NEW.version_number <> 1 THEN RAISE EXCEPTION 'funding programme successor versions require predecessor lineage'; END IF;
  IF NEW.supersedes_version_id IS NOT NULL THEN
    SELECT programme_id, version_number INTO predecessor FROM funding_programme_versions WHERE id = NEW.supersedes_version_id AND organization_id = NEW.organization_id;
    IF predecessor IS NULL OR predecessor.programme_id <> NEW.programme_id OR predecessor.version_number <> NEW.version_number - 1 THEN RAISE EXCEPTION 'funding programme successor must reference the immediately prior version'; END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "funding_programme_versions_lineage_guard" BEFORE INSERT ON "funding_programme_versions" FOR EACH ROW EXECUTE FUNCTION fortify_funding_programme_lineage_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_funding_review_guard() RETURNS trigger AS $$
DECLARE author text;
BEGIN
  SELECT author_subject INTO author FROM funding_programme_versions WHERE id = NEW.programme_version_id AND organization_id = NEW.organization_id;
  IF author IS NULL OR author = NEW.reviewer_subject THEN RAISE EXCEPTION 'funding programme review requires a distinct author and reviewer'; END IF;
  IF NEW.decision = 'approved' AND NEW.source_and_rules_checked IS NOT TRUE THEN RAISE EXCEPTION 'funding programme approval requires source and rules review'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "funding_programme_reviews_separation_guard" BEFORE INSERT ON "funding_programme_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_funding_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_funding_publication_guard() RETURNS trigger AS $$
DECLARE author text; reviewer text;
BEGIN
  SELECT author_subject INTO author FROM funding_programme_versions WHERE id = NEW.programme_version_id AND organization_id = NEW.organization_id;
  SELECT reviewer_subject INTO reviewer FROM funding_programme_reviews WHERE programme_version_id = NEW.programme_version_id AND organization_id = NEW.organization_id AND decision = 'approved';
  IF NEW.decision = 'published' AND (author IS NULL OR reviewer IS NULL OR NEW.publisher_subject IN (author, reviewer)) THEN RAISE EXCEPTION 'funding programme publication requires separate author, approved reviewer, and publisher'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "funding_programme_publications_separation_guard" BEFORE INSERT ON "funding_programme_publications" FOR EACH ROW EXECUTE FUNCTION fortify_funding_publication_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_funding_assessment_publication_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM funding_programme_publications WHERE programme_version_id = NEW.programme_version_id AND organization_id = NEW.organization_id AND decision = 'published') THEN RAISE EXCEPTION 'funding eligibility requires a published programme version'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "funding_assessments_publication_guard" BEFORE INSERT ON "funding_eligibility_assessments" FOR EACH ROW EXECUTE FUNCTION fortify_funding_assessment_publication_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_funding_application_assessment_guard() RETURNS trigger AS $$
DECLARE assessment record;
BEGIN
  SELECT project_id, programme_version_id, state INTO assessment FROM funding_eligibility_assessments WHERE id = NEW.eligibility_assessment_id AND organization_id = NEW.organization_id;
  IF assessment IS NULL OR assessment.project_id <> NEW.project_id OR assessment.programme_version_id <> NEW.programme_version_id OR assessment.state <> 'eligible' THEN RAISE EXCEPTION 'funding application requires a matching eligible assessment'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "funding_applications_assessment_guard" BEFORE INSERT ON "funding_applications" FOR EACH ROW EXECUTE FUNCTION fortify_funding_application_assessment_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_milestone_dependency_guard() RETURNS trigger AS $$
DECLARE item record; predecessor record;
BEGIN
  SELECT project_id, position INTO item FROM project_milestones WHERE id = NEW.milestone_id AND organization_id = NEW.organization_id;
  SELECT project_id, position INTO predecessor FROM project_milestones WHERE id = NEW.depends_on_milestone_id AND organization_id = NEW.organization_id;
  IF item IS NULL OR predecessor IS NULL OR item.project_id <> predecessor.project_id OR predecessor.position >= item.position THEN RAISE EXCEPTION 'milestone dependency must reference an earlier milestone in the same project'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "project_milestone_dependencies_order_guard" BEFORE INSERT ON "project_milestone_dependencies" FOR EACH ROW EXECUTE FUNCTION fortify_milestone_dependency_guard();
--> statement-breakpoint
CREATE TRIGGER "funding_programmes_immutable_update" BEFORE UPDATE ON "funding_programmes" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_programmes_immutable_delete" BEFORE DELETE ON "funding_programmes" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_programme_versions_immutable_update" BEFORE UPDATE ON "funding_programme_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_programme_versions_immutable_delete" BEFORE DELETE ON "funding_programme_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_eligibility_rules_immutable_update" BEFORE UPDATE ON "funding_eligibility_rules" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_eligibility_rules_immutable_delete" BEFORE DELETE ON "funding_eligibility_rules" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_programme_reviews_immutable_update" BEFORE UPDATE ON "funding_programme_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_programme_reviews_immutable_delete" BEFORE DELETE ON "funding_programme_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_programme_publications_immutable_update" BEFORE UPDATE ON "funding_programme_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_programme_publications_immutable_delete" BEFORE DELETE ON "funding_programme_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_eligibility_assessments_immutable_update" BEFORE UPDATE ON "funding_eligibility_assessments" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_eligibility_assessments_immutable_delete" BEFORE DELETE ON "funding_eligibility_assessments" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_eligibility_rule_results_immutable_update" BEFORE UPDATE ON "funding_eligibility_rule_results" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_eligibility_rule_results_immutable_delete" BEFORE DELETE ON "funding_eligibility_rule_results" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_applications_immutable_update" BEFORE UPDATE ON "funding_applications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_applications_immutable_delete" BEFORE DELETE ON "funding_applications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "capital_stacks_immutable_update" BEFORE UPDATE ON "capital_stacks" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "capital_stacks_immutable_delete" BEFORE DELETE ON "capital_stacks" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "capital_stack_contributions_immutable_update" BEFORE UPDATE ON "capital_stack_contributions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "capital_stack_contributions_immutable_delete" BEFORE DELETE ON "capital_stack_contributions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_commitments_immutable_update" BEFORE UPDATE ON "funding_commitments" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_commitments_immutable_delete" BEFORE DELETE ON "funding_commitments" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_commitment_events_immutable_update" BEFORE UPDATE ON "funding_commitment_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_commitment_events_immutable_delete" BEFORE DELETE ON "funding_commitment_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "project_milestones_immutable_update" BEFORE UPDATE ON "project_milestones" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "project_milestones_immutable_delete" BEFORE DELETE ON "project_milestones" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "project_milestone_dependencies_immutable_update" BEFORE UPDATE ON "project_milestone_dependencies" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "project_milestone_dependencies_immutable_delete" BEFORE DELETE ON "project_milestone_dependencies" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "project_milestone_events_immutable_update" BEFORE UPDATE ON "project_milestone_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "project_milestone_events_immutable_delete" BEFORE DELETE ON "project_milestone_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "payment_approvals_immutable_update" BEFORE UPDATE ON "payment_approvals" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "payment_approvals_immutable_delete" BEFORE DELETE ON "payment_approvals" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "disbursement_exports_immutable_update" BEFORE UPDATE ON "disbursement_exports" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "disbursement_exports_immutable_delete" BEFORE DELETE ON "disbursement_exports" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "stakeholder_benefits_immutable_update" BEFORE UPDATE ON "stakeholder_benefit_ledger_entries" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "stakeholder_benefits_immutable_delete" BEFORE DELETE ON "stakeholder_benefit_ledger_entries" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_project_external_assignment_transition_guard() RETURNS trigger AS $$
BEGIN
  IF OLD.project_id <> NEW.project_id OR OLD.external_principal_id <> NEW.external_principal_id OR OLD.collaborator_role <> NEW.collaborator_role OR OLD.purpose <> NEW.purpose OR OLD.token_hash <> NEW.token_hash OR OLD.scopes <> NEW.scopes OR OLD.due_on IS DISTINCT FROM NEW.due_on OR OLD.expires_at <> NEW.expires_at OR OLD.created_at <> NEW.created_at OR OLD.created_by <> NEW.created_by OR OLD.organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'project external assignment scope is immutable'; END IF;
  IF OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL THEN RAISE EXCEPTION 'project external assignment may only transition once to revoked'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "project_external_assignments_transition_guard" BEFORE UPDATE ON "project_external_assignments" FOR EACH ROW EXECUTE FUNCTION fortify_project_external_assignment_transition_guard();
--> statement-breakpoint
CREATE TRIGGER "project_external_assignments_immutable_delete" BEFORE DELETE ON "project_external_assignments" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
