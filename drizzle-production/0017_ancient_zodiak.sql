CREATE TABLE "baseline_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"property_id" text NOT NULL,
	"profile_version_id" text NOT NULL,
	"applicability_state" text NOT NULL,
	"applicability_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assessed_at" timestamp with time zone NOT NULL,
	"assessed_by" text NOT NULL,
	CONSTRAINT "baseline_assessments_applicability_check" CHECK ("baseline_assessments"."applicability_state" in ('applicable', 'inapplicable', 'insufficient_property_data')),
	CONSTRAINT "baseline_assessments_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "baseline_gaps" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"baseline_assessment_id" text NOT NULL,
	"criterion_id" text NOT NULL,
	"state" text NOT NULL,
	"observed_condition" text NOT NULL,
	"evidence_item_id" text,
	CONSTRAINT "baseline_gaps_state_check" CHECK ("baseline_gaps"."state" in ('satisfied', 'gap', 'insufficient_evidence', 'not_applicable')),
	CONSTRAINT "baseline_gaps_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "capital_plan_scenario_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"scenario_id" text NOT NULL,
	"project_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "capital_scenario_projects_position_check" CHECK ("capital_plan_scenario_projects"."position" >= 1),
	CONSTRAINT "capital_scenario_projects_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "capital_plan_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"capital_plan_id" text NOT NULL,
	"name" text NOT NULL,
	"total_cost_low_cents" integer NOT NULL,
	"total_cost_high_cents" integer NOT NULL,
	"duration_days" integer NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"maintenance_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"funding_eligibility_state" text NOT NULL,
	"modeled_benefit_state" text NOT NULL,
	"insurer_treatment_state" text NOT NULL,
	"rationale" text NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "capital_plan_scenarios_cost_check" CHECK ("capital_plan_scenarios"."total_cost_low_cents" >= 0 and "capital_plan_scenarios"."total_cost_high_cents" >= "capital_plan_scenarios"."total_cost_low_cents"),
	CONSTRAINT "capital_plan_scenarios_duration_check" CHECK ("capital_plan_scenarios"."duration_days" >= 0),
	CONSTRAINT "capital_plan_scenarios_funding_check" CHECK ("capital_plan_scenarios"."funding_eligibility_state" in ('unknown', 'potential_candidate', 'not_eligible')),
	CONSTRAINT "capital_plan_scenarios_benefit_check" CHECK ("capital_plan_scenarios"."modeled_benefit_state" in ('unavailable', 'not_requested', 'externally_supplied_unverified')),
	CONSTRAINT "capital_plan_scenarios_insurer_check" CHECK ("capital_plan_scenarios"."insurer_treatment_state" in ('unverified', 'no_commitment', 'externally_acknowledged')),
	CONSTRAINT "capital_plan_scenarios_position_check" CHECK ("capital_plan_scenarios"."position" >= 1),
	CONSTRAINT "capital_plan_scenarios_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "capital_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"property_id" text NOT NULL,
	"baseline_assessment_id" text NOT NULL,
	"name" text NOT NULL,
	"planning_state" text NOT NULL,
	"decision_boundary" text NOT NULL,
	"selected_scenario_id" text,
	CONSTRAINT "capital_plans_state_check" CHECK ("capital_plans"."planning_state" in ('options_available', 'insufficient_evidence', 'no_attractive_path', 'inapplicable')),
	CONSTRAINT "capital_plans_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "intervention_version_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"intervention_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"note" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "intervention_reviews_decision_check" CHECK ("intervention_version_reviews"."decision" in ('approved', 'changes_requested')),
	CONSTRAINT "intervention_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "intervention_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"intervention_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"technical_specification" text NOT NULL,
	"evidence_level" text NOT NULL,
	"typical_cost_low_cents" integer NOT NULL,
	"typical_cost_high_cents" integer NOT NULL,
	"typical_duration_days" integer NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"maintenance_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"benefit_statement" text NOT NULL,
	"benefit_boundary" text NOT NULL,
	"author_subject" text NOT NULL,
	"reviewer_subject" text,
	"reviewed_at" timestamp with time zone,
	"supersedes_version_id" text,
	CONSTRAINT "intervention_versions_status_check" CHECK ("intervention_versions"."status" in ('draft', 'published', 'superseded', 'withdrawn')),
	CONSTRAINT "intervention_versions_evidence_check" CHECK ("intervention_versions"."evidence_level" in ('self_attested', 'documented', 'professional_observation', 'independent_verification', 'jurisdictional_record', 'programme_recognition', 'insurer_acknowledgement', 'modeled_analysis', 'measured_outcome')),
	CONSTRAINT "intervention_versions_cost_check" CHECK ("intervention_versions"."typical_cost_low_cents" >= 0 and "intervention_versions"."typical_cost_high_cents" >= "intervention_versions"."typical_cost_low_cents"),
	CONSTRAINT "intervention_versions_duration_check" CHECK ("intervention_versions"."typical_duration_days" >= 0),
	CONSTRAINT "intervention_versions_reviewer_check" CHECK ("intervention_versions"."reviewer_subject" is null or "intervention_versions"."reviewer_subject" <> "intervention_versions"."author_subject"),
	CONSTRAINT "intervention_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "interventions" (
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
	"category" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "interventions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "project_interventions" (
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
	"intervention_version_id" text NOT NULL,
	"rationale" text NOT NULL,
	CONSTRAINT "project_interventions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "resilience_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"property_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	CONSTRAINT "resilience_projects_status_check" CHECK ("resilience_projects"."status" in ('candidate', 'planned', 'approved', 'in_progress', 'complete', 'cancelled')),
	CONSTRAINT "resilience_projects_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "target_profile_applicability" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"profile_version_id" text NOT NULL,
	"field" text NOT NULL,
	"operator" text NOT NULL,
	"expected_values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "target_profile_applicability_operator_check" CHECK ("target_profile_applicability"."operator" in ('equals', 'includes', 'one_of')),
	CONSTRAINT "target_profile_applicability_position_check" CHECK ("target_profile_applicability"."position" >= 1),
	CONSTRAINT "target_profile_applicability_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "target_profile_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"profile_version_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"target_level" text NOT NULL,
	"evidence_level" text NOT NULL,
	"requirement_text" text NOT NULL,
	"verification_method" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "target_profile_criteria_level_check" CHECK ("target_profile_criteria"."target_level" in ('minimum', 'preferred')),
	CONSTRAINT "target_profile_criteria_evidence_check" CHECK ("target_profile_criteria"."evidence_level" in ('self_attested', 'documented', 'professional_observation', 'independent_verification', 'jurisdictional_record', 'programme_recognition', 'insurer_acknowledgement', 'modeled_analysis', 'measured_outcome')),
	CONSTRAINT "target_profile_criteria_position_check" CHECK ("target_profile_criteria"."position" >= 1),
	CONSTRAINT "target_profile_criteria_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "target_profile_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"profile_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"publisher_subject" text NOT NULL,
	"note" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	CONSTRAINT "target_profile_publications_decision_check" CHECK ("target_profile_publications"."decision" in ('published', 'rejected')),
	CONSTRAINT "target_profile_publications_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "target_profile_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"profile_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"note" text NOT NULL,
	"source_pins_checked" boolean DEFAULT false NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "target_profile_reviews_decision_check" CHECK ("target_profile_reviews"."decision" in ('approved', 'changes_requested')),
	CONSTRAINT "target_profile_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "target_profile_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"profile_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_subject" text NOT NULL,
	"change_summary" text NOT NULL,
	"limitations" text NOT NULL,
	"recognition_state" text DEFAULT 'unavailable_no_commitment_registry' NOT NULL,
	"supersedes_version_id" text,
	CONSTRAINT "target_profile_versions_number_check" CHECK ("target_profile_versions"."version_number" >= 1),
	CONSTRAINT "target_profile_versions_status_check" CHECK ("target_profile_versions"."status" in ('draft', 'published', 'superseded', 'withdrawn')),
	CONSTRAINT "target_profile_versions_recognition_check" CHECK ("target_profile_versions"."recognition_state" in ('unavailable_no_commitment_registry', 'unverified_external_reference')),
	CONSTRAINT "target_profile_versions_effective_check" CHECK ("target_profile_versions"."effective_to" is null or "target_profile_versions"."effective_to" >= "target_profile_versions"."effective_from"),
	CONSTRAINT "target_profile_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "target_profiles" (
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
	"description" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"peril" text NOT NULL,
	"property_class" text NOT NULL,
	CONSTRAINT "target_profiles_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "governed_source_dependencies" DROP CONSTRAINT "governed_source_dependencies_consumer_check";--> statement-breakpoint
ALTER TABLE "baseline_assessments" ADD CONSTRAINT "baseline_assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_assessments" ADD CONSTRAINT "baseline_assessments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_assessments" ADD CONSTRAINT "baseline_assessments_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_gaps" ADD CONSTRAINT "baseline_gaps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_gaps" ADD CONSTRAINT "baseline_gaps_baseline_assessment_id_baseline_assessments_id_fk" FOREIGN KEY ("baseline_assessment_id") REFERENCES "public"."baseline_assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_gaps" ADD CONSTRAINT "baseline_gaps_criterion_id_target_profile_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."target_profile_criteria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_gaps" ADD CONSTRAINT "baseline_gaps_evidence_item_id_evidence_items_id_fk" FOREIGN KEY ("evidence_item_id") REFERENCES "public"."evidence_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_plan_scenario_projects" ADD CONSTRAINT "capital_plan_scenario_projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_plan_scenario_projects" ADD CONSTRAINT "capital_plan_scenario_projects_scenario_id_capital_plan_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."capital_plan_scenarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_plan_scenario_projects" ADD CONSTRAINT "capital_plan_scenario_projects_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_plan_scenarios" ADD CONSTRAINT "capital_plan_scenarios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_plan_scenarios" ADD CONSTRAINT "capital_plan_scenarios_capital_plan_id_capital_plans_id_fk" FOREIGN KEY ("capital_plan_id") REFERENCES "public"."capital_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_plans" ADD CONSTRAINT "capital_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_plans" ADD CONSTRAINT "capital_plans_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_plans" ADD CONSTRAINT "capital_plans_baseline_assessment_id_baseline_assessments_id_fk" FOREIGN KEY ("baseline_assessment_id") REFERENCES "public"."baseline_assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_version_reviews" ADD CONSTRAINT "intervention_version_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_version_reviews" ADD CONSTRAINT "intervention_version_reviews_intervention_version_id_intervention_versions_id_fk" FOREIGN KEY ("intervention_version_id") REFERENCES "public"."intervention_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_versions" ADD CONSTRAINT "intervention_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_versions" ADD CONSTRAINT "intervention_versions_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_versions" ADD CONSTRAINT "intervention_versions_supersedes_version_id_intervention_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."intervention_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_interventions" ADD CONSTRAINT "project_interventions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_interventions" ADD CONSTRAINT "project_interventions_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_interventions" ADD CONSTRAINT "project_interventions_intervention_version_id_intervention_versions_id_fk" FOREIGN KEY ("intervention_version_id") REFERENCES "public"."intervention_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resilience_projects" ADD CONSTRAINT "resilience_projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resilience_projects" ADD CONSTRAINT "resilience_projects_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_applicability" ADD CONSTRAINT "target_profile_applicability_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_applicability" ADD CONSTRAINT "target_profile_applicability_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_criteria" ADD CONSTRAINT "target_profile_criteria_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_criteria" ADD CONSTRAINT "target_profile_criteria_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_publications" ADD CONSTRAINT "target_profile_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_publications" ADD CONSTRAINT "target_profile_publications_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_reviews" ADD CONSTRAINT "target_profile_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_reviews" ADD CONSTRAINT "target_profile_reviews_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_versions" ADD CONSTRAINT "target_profile_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_versions" ADD CONSTRAINT "target_profile_versions_profile_id_target_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."target_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profile_versions" ADD CONSTRAINT "target_profile_versions_supersedes_version_id_target_profile_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_profiles" ADD CONSTRAINT "target_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "baseline_gaps_org_assessment_criterion_unique" ON "baseline_gaps" USING btree ("organization_id","baseline_assessment_id","criterion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capital_scenario_projects_org_pair_unique" ON "capital_plan_scenario_projects" USING btree ("organization_id","scenario_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intervention_reviews_org_version_unique" ON "intervention_version_reviews" USING btree ("organization_id","intervention_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intervention_versions_org_item_number_unique" ON "intervention_versions" USING btree ("organization_id","intervention_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "interventions_org_key_unique" ON "interventions" USING btree ("organization_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "project_interventions_org_project_version_unique" ON "project_interventions" USING btree ("organization_id","project_id","intervention_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "target_profile_applicability_org_version_position_unique" ON "target_profile_applicability" USING btree ("organization_id","profile_version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "target_profile_criteria_org_version_code_unique" ON "target_profile_criteria" USING btree ("organization_id","profile_version_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "target_profile_publications_org_version_unique" ON "target_profile_publications" USING btree ("organization_id","profile_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "target_profile_reviews_org_version_unique" ON "target_profile_reviews" USING btree ("organization_id","profile_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "target_profile_versions_org_profile_number_unique" ON "target_profile_versions" USING btree ("organization_id","profile_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "target_profiles_org_key_unique" ON "target_profiles" USING btree ("organization_id","canonical_key");--> statement-breakpoint
ALTER TABLE "governed_source_dependencies" ADD CONSTRAINT "governed_source_dependencies_consumer_check" CHECK ("governed_source_dependencies"."consumer_type" in ('playbook_version', 'renewal_case', 'target_profile_version'));
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "target_profile_versions_profile_tenant_guard" AFTER INSERT OR UPDATE ON "target_profile_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_id', 'target_profiles');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "target_profile_versions_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "target_profile_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "target_profile_criteria_version_tenant_guard" AFTER INSERT OR UPDATE ON "target_profile_criteria" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "target_profile_applicability_version_tenant_guard" AFTER INSERT OR UPDATE ON "target_profile_applicability" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "target_profile_reviews_version_tenant_guard" AFTER INSERT OR UPDATE ON "target_profile_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "target_profile_publications_version_tenant_guard" AFTER INSERT OR UPDATE ON "target_profile_publications" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "intervention_versions_item_tenant_guard" AFTER INSERT OR UPDATE ON "intervention_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('intervention_id', 'interventions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "intervention_versions_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "intervention_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'intervention_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "intervention_reviews_version_tenant_guard" AFTER INSERT OR UPDATE ON "intervention_version_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('intervention_version_id', 'intervention_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "baseline_assessments_property_tenant_guard" AFTER INSERT OR UPDATE ON "baseline_assessments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "baseline_assessments_profile_tenant_guard" AFTER INSERT OR UPDATE ON "baseline_assessments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "baseline_gaps_assessment_tenant_guard" AFTER INSERT OR UPDATE ON "baseline_gaps" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('baseline_assessment_id', 'baseline_assessments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "baseline_gaps_criterion_tenant_guard" AFTER INSERT OR UPDATE ON "baseline_gaps" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('criterion_id', 'target_profile_criteria');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "baseline_gaps_evidence_tenant_guard" AFTER INSERT OR UPDATE ON "baseline_gaps" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."evidence_item_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('evidence_item_id', 'evidence_items');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "resilience_projects_property_tenant_guard" AFTER INSERT OR UPDATE ON "resilience_projects" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "project_interventions_project_tenant_guard" AFTER INSERT OR UPDATE ON "project_interventions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "project_interventions_version_tenant_guard" AFTER INSERT OR UPDATE ON "project_interventions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('intervention_version_id', 'intervention_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "capital_plans_property_tenant_guard" AFTER INSERT OR UPDATE ON "capital_plans" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "capital_plans_baseline_tenant_guard" AFTER INSERT OR UPDATE ON "capital_plans" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('baseline_assessment_id', 'baseline_assessments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "capital_plan_scenarios_plan_tenant_guard" AFTER INSERT OR UPDATE ON "capital_plan_scenarios" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('capital_plan_id', 'capital_plans');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "capital_scenario_projects_scenario_tenant_guard" AFTER INSERT OR UPDATE ON "capital_plan_scenario_projects" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('scenario_id', 'capital_plan_scenarios');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "capital_scenario_projects_project_tenant_guard" AFTER INSERT OR UPDATE ON "capital_plan_scenario_projects" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_profile_lineage_guard() RETURNS trigger AS $$
DECLARE predecessor record;
BEGIN
  IF NEW.supersedes_version_id IS NULL AND NEW.version_number <> 1 THEN RAISE EXCEPTION 'profile successor versions require predecessor lineage'; END IF;
  IF NEW.supersedes_version_id IS NOT NULL THEN
    SELECT profile_id, version_number INTO predecessor FROM target_profile_versions WHERE id = NEW.supersedes_version_id AND organization_id = NEW.organization_id;
    IF predecessor IS NULL OR predecessor.profile_id <> NEW.profile_id OR predecessor.version_number <> NEW.version_number - 1 THEN RAISE EXCEPTION 'profile successor must reference the immediately prior version'; END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "target_profile_versions_lineage_guard" BEFORE INSERT ON "target_profile_versions" FOR EACH ROW EXECUTE FUNCTION fortify_profile_lineage_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_profile_review_guard() RETURNS trigger AS $$
DECLARE author text;
BEGIN
  SELECT author_subject INTO author FROM target_profile_versions WHERE id = NEW.profile_version_id AND organization_id = NEW.organization_id;
  IF author IS NULL OR author = NEW.reviewer_subject THEN RAISE EXCEPTION 'profile review requires a distinct in-tenant author and reviewer'; END IF;
  IF NEW.decision = 'approved' AND NEW.source_pins_checked IS NOT TRUE THEN RAISE EXCEPTION 'profile approval requires exact source-pin review'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "target_profile_reviews_separation_guard" BEFORE INSERT ON "target_profile_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_profile_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_profile_publication_guard() RETURNS trigger AS $$
DECLARE author text; reviewer text;
BEGIN
  SELECT author_subject INTO author FROM target_profile_versions WHERE id = NEW.profile_version_id AND organization_id = NEW.organization_id;
  SELECT reviewer_subject INTO reviewer FROM target_profile_reviews WHERE profile_version_id = NEW.profile_version_id AND organization_id = NEW.organization_id AND decision = 'approved';
  IF NEW.decision = 'published' AND (author IS NULL OR reviewer IS NULL OR NEW.publisher_subject IN (author, reviewer)) THEN RAISE EXCEPTION 'profile publication requires separate author, approved reviewer, and publisher'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "target_profile_publications_separation_guard" BEFORE INSERT ON "target_profile_publications" FOR EACH ROW EXECUTE FUNCTION fortify_profile_publication_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_intervention_lineage_guard() RETURNS trigger AS $$
DECLARE predecessor record;
BEGIN
  IF NEW.supersedes_version_id IS NULL AND NEW.version_number <> 1 THEN RAISE EXCEPTION 'intervention successor versions require predecessor lineage'; END IF;
  IF NEW.supersedes_version_id IS NOT NULL THEN
    SELECT intervention_id, version_number INTO predecessor FROM intervention_versions WHERE id = NEW.supersedes_version_id AND organization_id = NEW.organization_id;
    IF predecessor IS NULL OR predecessor.intervention_id <> NEW.intervention_id OR predecessor.version_number <> NEW.version_number - 1 THEN RAISE EXCEPTION 'intervention successor must reference the immediately prior version'; END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "intervention_versions_lineage_guard" BEFORE INSERT ON "intervention_versions" FOR EACH ROW EXECUTE FUNCTION fortify_intervention_lineage_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_intervention_review_guard() RETURNS trigger AS $$
DECLARE author text;
BEGIN
  SELECT author_subject INTO author FROM intervention_versions WHERE id = NEW.intervention_version_id AND organization_id = NEW.organization_id;
  IF author IS NULL OR author = NEW.reviewer_subject THEN RAISE EXCEPTION 'intervention review requires a distinct in-tenant author and reviewer'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "intervention_reviews_separation_guard" BEFORE INSERT ON "intervention_version_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_intervention_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_governed_source_dependency_guard()
RETURNS trigger AS $$
DECLARE target_organization text; published boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM governed_source_publications WHERE source_version_id = NEW.source_version_id AND organization_id = NEW.organization_id AND decision = 'published') INTO published;
  IF published IS NOT TRUE THEN RAISE EXCEPTION 'only a published source version may be relied on'; END IF;
  IF NEW.consumer_type = 'playbook_version' THEN SELECT organization_id INTO target_organization FROM playbook_versions WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'renewal_case' THEN SELECT organization_id INTO target_organization FROM renewal_cases WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'target_profile_version' THEN SELECT organization_id INTO target_organization FROM target_profile_versions WHERE id = NEW.consumer_id;
  END IF;
  IF target_organization IS NULL OR target_organization <> NEW.organization_id THEN RAISE EXCEPTION 'source dependency consumer is unavailable in this organization'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_baseline_profile_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM target_profile_publications WHERE profile_version_id = NEW.profile_version_id AND organization_id = NEW.organization_id AND decision = 'published') THEN RAISE EXCEPTION 'baseline assessment requires a published target profile version'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "baseline_assessments_published_profile_guard" BEFORE INSERT ON "baseline_assessments" FOR EACH ROW EXECUTE FUNCTION fortify_baseline_profile_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_project_intervention_review_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM intervention_version_reviews WHERE intervention_version_id = NEW.intervention_version_id AND organization_id = NEW.organization_id AND decision = 'approved') THEN RAISE EXCEPTION 'projects may use only independently reviewed intervention versions'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "project_interventions_review_guard" BEFORE INSERT ON "project_interventions" FOR EACH ROW EXECUTE FUNCTION fortify_project_intervention_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_capital_plan_baseline_guard() RETURNS trigger AS $$
DECLARE baseline_property text;
BEGIN
  SELECT property_id INTO baseline_property FROM baseline_assessments WHERE id = NEW.baseline_assessment_id AND organization_id = NEW.organization_id;
  IF baseline_property IS NULL OR baseline_property <> NEW.property_id THEN RAISE EXCEPTION 'capital plan baseline must belong to the same property and organization'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "capital_plans_baseline_property_guard" BEFORE INSERT ON "capital_plans" FOR EACH ROW EXECUTE FUNCTION fortify_capital_plan_baseline_guard();
--> statement-breakpoint
CREATE TRIGGER "target_profile_versions_immutable_update" BEFORE UPDATE ON "target_profile_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "target_profile_versions_immutable_delete" BEFORE DELETE ON "target_profile_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "target_profile_criteria_immutable_update" BEFORE UPDATE ON "target_profile_criteria" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "target_profile_criteria_immutable_delete" BEFORE DELETE ON "target_profile_criteria" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "target_profile_applicability_immutable_update" BEFORE UPDATE ON "target_profile_applicability" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "target_profile_applicability_immutable_delete" BEFORE DELETE ON "target_profile_applicability" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "target_profile_reviews_immutable_update" BEFORE UPDATE ON "target_profile_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "target_profile_reviews_immutable_delete" BEFORE DELETE ON "target_profile_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "target_profile_publications_immutable_update" BEFORE UPDATE ON "target_profile_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "target_profile_publications_immutable_delete" BEFORE DELETE ON "target_profile_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "intervention_versions_immutable_update" BEFORE UPDATE ON "intervention_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "intervention_versions_immutable_delete" BEFORE DELETE ON "intervention_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "intervention_reviews_immutable_update" BEFORE UPDATE ON "intervention_version_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "intervention_reviews_immutable_delete" BEFORE DELETE ON "intervention_version_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "baseline_assessments_immutable_update" BEFORE UPDATE ON "baseline_assessments" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "baseline_assessments_immutable_delete" BEFORE DELETE ON "baseline_assessments" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "baseline_gaps_immutable_update" BEFORE UPDATE ON "baseline_gaps" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "baseline_gaps_immutable_delete" BEFORE DELETE ON "baseline_gaps" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "capital_plan_scenarios_immutable_update" BEFORE UPDATE ON "capital_plan_scenarios" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "capital_plan_scenarios_immutable_delete" BEFORE DELETE ON "capital_plan_scenarios" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
