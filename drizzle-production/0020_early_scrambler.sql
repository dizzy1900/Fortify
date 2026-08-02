CREATE TABLE "external_model_version_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"model_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"publisher_subject" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	CONSTRAINT "external_model_publications_decision_check" CHECK ("external_model_version_publications"."decision" in ('published', 'rejected')),
	CONSTRAINT "external_model_publications_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "external_model_version_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"model_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"source_rights_and_definitions_checked" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "external_model_reviews_decision_check" CHECK ("external_model_version_reviews"."decision" in ('approved', 'changes_requested', 'rejected')),
	CONSTRAINT "external_model_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "external_model_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"model_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"version_label" text NOT NULL,
	"geography" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"property_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"source_version_id" text NOT NULL,
	"methodology_summary" text NOT NULL,
	"usage_rights" text NOT NULL,
	"redistribution_restrictions" text NOT NULL,
	"limitations" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_subject" text NOT NULL,
	"supersedes_version_id" text,
	CONSTRAINT "external_model_versions_number_check" CHECK ("external_model_versions"."version_number" >= 1),
	CONSTRAINT "external_model_versions_status_check" CHECK ("external_model_versions"."status" in ('draft', 'active', 'superseded', 'withdrawn')),
	CONSTRAINT "external_model_versions_effective_check" CHECK ("external_model_versions"."effective_to" is null or "external_model_versions"."effective_to" >= "external_model_versions"."effective_from"),
	CONSTRAINT "external_model_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "external_models" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"provider_id" text NOT NULL,
	"canonical_key" text NOT NULL,
	"name" text NOT NULL,
	"peril" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "external_models_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "market_commitment_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"commitment_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"publisher_subject" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	CONSTRAINT "market_commitment_publications_decision_check" CHECK ("market_commitment_publications"."decision" in ('published', 'rejected')),
	CONSTRAINT "market_commitment_publications_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "market_commitment_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"commitment_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"source_and_scope_checked" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "market_commitment_reviews_decision_check" CHECK ("market_commitment_reviews"."decision" in ('approved', 'changes_requested', 'rejected')),
	CONSTRAINT "market_commitment_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "market_commitment_versions" (
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
	"version_number" integer NOT NULL,
	"profile_version_id" text NOT NULL,
	"model_version_id" text,
	"geography" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"property_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_required" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"response_or_financial_action" text NOT NULL,
	"authority_scope" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"source_version_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"limitations" text NOT NULL,
	"author_subject" text NOT NULL,
	"supersedes_version_id" text,
	CONSTRAINT "market_commitment_versions_number_check" CHECK ("market_commitment_versions"."version_number" >= 1),
	CONSTRAINT "market_commitment_versions_authority_check" CHECK ("market_commitment_versions"."authority_scope" in ('review_only', 'rating_treatment', 'underwriting_action', 'financial_action', 'data_sharing')),
	CONSTRAINT "market_commitment_versions_status_check" CHECK ("market_commitment_versions"."status" in ('draft', 'published', 'superseded', 'withdrawn')),
	CONSTRAINT "market_commitment_versions_effective_check" CHECK ("market_commitment_versions"."effective_to" is null or "market_commitment_versions"."effective_to" >= "market_commitment_versions"."effective_from"),
	CONSTRAINT "market_commitment_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "market_commitments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"committing_organization_id" text NOT NULL,
	"canonical_key" text NOT NULL,
	"name" text NOT NULL,
	"commitment_type" text NOT NULL,
	CONSTRAINT "market_commitments_type_check" CHECK ("market_commitments"."commitment_type" in ('evidence_review_commitment', 'response_service_level', 'approved_rating_treatment', 'underwriting_reconsideration', 'quote_review', 'capacity_allocation', 'grant_payment', 'milestone_payment', 'financing_product', 'reinsurance_portfolio_review', 'data_sharing_commitment')),
	CONSTRAINT "market_commitments_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "model_input_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"model_version_id" text NOT NULL,
	"input_key" text NOT NULL,
	"label" text NOT NULL,
	"data_type" text NOT NULL,
	"unit" text,
	"allowed_values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"definition" text NOT NULL,
	"support_status" text NOT NULL,
	"transformation_boundary" text NOT NULL,
	"required_by_model" boolean DEFAULT false NOT NULL,
	CONSTRAINT "model_inputs_type_check" CHECK ("model_input_definitions"."data_type" in ('string', 'number', 'boolean', 'enum', 'date')),
	CONSTRAINT "model_inputs_support_check" CHECK ("model_input_definitions"."support_status" in ('supported', 'unsupported', 'requires_provider_confirmation')),
	CONSTRAINT "model_inputs_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "model_input_mapping_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"mapping_id" text NOT NULL,
	"event_type" text NOT NULL,
	"accepted_value" jsonb,
	"reason" text NOT NULL,
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"decided_by" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"supersedes_event_id" text,
	CONSTRAINT "model_mapping_events_type_check" CHECK ("model_input_mapping_events"."event_type" in ('submitted', 'accepted_by_model_market', 'accepted_with_modification', 'rejected', 'unsupported', 'expired')),
	CONSTRAINT "model_mapping_events_value_check" CHECK (("model_input_mapping_events"."event_type" in ('accepted_by_model_market', 'accepted_with_modification') and "model_input_mapping_events"."accepted_value" is not null) or ("model_input_mapping_events"."event_type" not in ('accepted_by_model_market', 'accepted_with_modification') and "model_input_mapping_events"."accepted_value" is null)),
	CONSTRAINT "model_mapping_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "model_input_mapping_evidence_links" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"mapping_id" text NOT NULL,
	"evidence_version_id" text NOT NULL,
	"relationship" text NOT NULL,
	CONSTRAINT "model_mapping_evidence_relationship_check" CHECK ("model_input_mapping_evidence_links"."relationship" in ('supports', 'contradicts', 'context_only')),
	CONSTRAINT "model_mapping_evidence_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "model_input_mapping_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"mapping_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"model_documentation_checked" boolean DEFAULT false NOT NULL,
	"verification_checked" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "model_mapping_reviews_decision_check" CHECK ("model_input_mapping_reviews"."decision" in ('approved_for_submission', 'changes_requested', 'unsupported')),
	CONSTRAINT "model_mapping_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "model_input_mappings" (
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
	"project_intervention_id" text NOT NULL,
	"verification_finding_id" text NOT NULL,
	"verification_certificate_id" text,
	"model_version_id" text NOT NULL,
	"input_definition_id" text NOT NULL,
	"pre_intervention_value" jsonb NOT NULL,
	"proposed_post_intervention_value" jsonb NOT NULL,
	"transformation_method" text NOT NULL,
	"methodology_version" text NOT NULL,
	"confidence" text NOT NULL,
	"source" text NOT NULL,
	"limitations" text NOT NULL,
	"author_subject" text NOT NULL,
	"proposed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "model_input_mappings_confidence_check" CHECK ("model_input_mappings"."confidence" in ('low', 'medium', 'high', 'not_assessed')),
	CONSTRAINT "model_input_mappings_expiry_check" CHECK ("model_input_mappings"."expires_at" is null or "model_input_mappings"."expires_at" > "model_input_mappings"."proposed_at"),
	CONSTRAINT "model_input_mappings_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "model_output_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"model_version_id" text NOT NULL,
	"output_key" text NOT NULL,
	"label" text NOT NULL,
	"data_type" text NOT NULL,
	"unit" text,
	"definition" text NOT NULL,
	"limitations" text NOT NULL,
	CONSTRAINT "model_outputs_type_check" CHECK ("model_output_definitions"."data_type" in ('string', 'number', 'boolean', 'enum', 'date', 'object')),
	CONSTRAINT "model_outputs_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "model_output_records" (
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
	"model_version_id" text NOT NULL,
	"output_definition_id" text NOT NULL,
	"evidence_version_id" text,
	"recorded_value" jsonb NOT NULL,
	"as_of_date" date NOT NULL,
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"limitations" text NOT NULL,
	"imported_by" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "model_output_records_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "model_providers" (
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
	"provider_type" text NOT NULL,
	"website" text,
	"status" text DEFAULT 'active' NOT NULL,
	"limitations" text NOT NULL,
	CONSTRAINT "model_providers_type_check" CHECK ("model_providers"."provider_type" in ('catastrophe_model', 'property_risk_model', 'insurer_model', 'programme_model', 'other')),
	CONSTRAINT "model_providers_status_check" CHECK ("model_providers"."status" in ('active', 'suspended', 'inactive')),
	CONSTRAINT "model_providers_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "recognition_organizations" (
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
	"legal_name" text NOT NULL,
	"organization_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"limitations" text NOT NULL,
	CONSTRAINT "recognition_organizations_type_check" CHECK ("recognition_organizations"."organization_type" in ('insurer', 'mga', 'reinsurer', 'lender', 'public_programme', 'philanthropic_funder', 'property_operator')),
	CONSTRAINT "recognition_organizations_status_check" CHECK ("recognition_organizations"."status" in ('active', 'suspended', 'inactive')),
	CONSTRAINT "recognition_organizations_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "governed_source_dependencies" DROP CONSTRAINT "governed_source_dependencies_consumer_check";--> statement-breakpoint
ALTER TABLE "external_model_version_publications" ADD CONSTRAINT "external_model_version_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_model_version_publications" ADD CONSTRAINT "external_model_version_publications_model_version_id_external_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."external_model_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_model_version_reviews" ADD CONSTRAINT "external_model_version_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_model_version_reviews" ADD CONSTRAINT "external_model_version_reviews_model_version_id_external_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."external_model_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_model_versions" ADD CONSTRAINT "external_model_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_model_versions" ADD CONSTRAINT "external_model_versions_model_id_external_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."external_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_model_versions" ADD CONSTRAINT "external_model_versions_source_version_id_governed_source_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_model_versions" ADD CONSTRAINT "external_model_versions_supersedes_version_id_external_model_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."external_model_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_models" ADD CONSTRAINT "external_models_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_models" ADD CONSTRAINT "external_models_provider_id_model_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."model_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_publications" ADD CONSTRAINT "market_commitment_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_publications" ADD CONSTRAINT "market_commitment_publications_commitment_version_id_market_commitment_versions_id_fk" FOREIGN KEY ("commitment_version_id") REFERENCES "public"."market_commitment_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_reviews" ADD CONSTRAINT "market_commitment_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_reviews" ADD CONSTRAINT "market_commitment_reviews_commitment_version_id_market_commitment_versions_id_fk" FOREIGN KEY ("commitment_version_id") REFERENCES "public"."market_commitment_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_versions" ADD CONSTRAINT "market_commitment_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_versions" ADD CONSTRAINT "market_commitment_versions_commitment_id_market_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."market_commitments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_versions" ADD CONSTRAINT "market_commitment_versions_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_versions" ADD CONSTRAINT "market_commitment_versions_model_version_id_external_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."external_model_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_versions" ADD CONSTRAINT "market_commitment_versions_source_version_id_governed_source_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitment_versions" ADD CONSTRAINT "market_commitment_versions_supersedes_version_id_market_commitment_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."market_commitment_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitments" ADD CONSTRAINT "market_commitments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_commitments" ADD CONSTRAINT "market_commitments_committing_organization_id_recognition_organizations_id_fk" FOREIGN KEY ("committing_organization_id") REFERENCES "public"."recognition_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_definitions" ADD CONSTRAINT "model_input_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_definitions" ADD CONSTRAINT "model_input_definitions_model_version_id_external_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."external_model_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mapping_events" ADD CONSTRAINT "model_input_mapping_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mapping_events" ADD CONSTRAINT "model_input_mapping_events_mapping_id_model_input_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."model_input_mappings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mapping_events" ADD CONSTRAINT "model_input_mapping_events_supersedes_event_id_model_input_mapping_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."model_input_mapping_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mapping_evidence_links" ADD CONSTRAINT "model_input_mapping_evidence_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mapping_evidence_links" ADD CONSTRAINT "model_input_mapping_evidence_links_mapping_id_model_input_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."model_input_mappings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mapping_evidence_links" ADD CONSTRAINT "model_input_mapping_evidence_links_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mapping_reviews" ADD CONSTRAINT "model_input_mapping_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mapping_reviews" ADD CONSTRAINT "model_input_mapping_reviews_mapping_id_model_input_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."model_input_mappings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mappings" ADD CONSTRAINT "model_input_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mappings" ADD CONSTRAINT "model_input_mappings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mappings" ADD CONSTRAINT "model_input_mappings_project_intervention_id_project_interventions_id_fk" FOREIGN KEY ("project_intervention_id") REFERENCES "public"."project_interventions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mappings" ADD CONSTRAINT "model_input_mappings_verification_finding_id_verification_findings_id_fk" FOREIGN KEY ("verification_finding_id") REFERENCES "public"."verification_findings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mappings" ADD CONSTRAINT "model_input_mappings_verification_certificate_id_verification_certificates_id_fk" FOREIGN KEY ("verification_certificate_id") REFERENCES "public"."verification_certificates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mappings" ADD CONSTRAINT "model_input_mappings_model_version_id_external_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."external_model_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_input_mappings" ADD CONSTRAINT "model_input_mappings_input_definition_id_model_input_definitions_id_fk" FOREIGN KEY ("input_definition_id") REFERENCES "public"."model_input_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_output_definitions" ADD CONSTRAINT "model_output_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_output_definitions" ADD CONSTRAINT "model_output_definitions_model_version_id_external_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."external_model_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_output_records" ADD CONSTRAINT "model_output_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_output_records" ADD CONSTRAINT "model_output_records_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_output_records" ADD CONSTRAINT "model_output_records_model_version_id_external_model_versions_id_fk" FOREIGN KEY ("model_version_id") REFERENCES "public"."external_model_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_output_records" ADD CONSTRAINT "model_output_records_output_definition_id_model_output_definitions_id_fk" FOREIGN KEY ("output_definition_id") REFERENCES "public"."model_output_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_output_records" ADD CONSTRAINT "model_output_records_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_providers" ADD CONSTRAINT "model_providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_organizations" ADD CONSTRAINT "recognition_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_model_publications_org_version_unique" ON "external_model_version_publications" USING btree ("organization_id","model_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_model_reviews_org_version_unique" ON "external_model_version_reviews" USING btree ("organization_id","model_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_model_versions_org_model_number_unique" ON "external_model_versions" USING btree ("organization_id","model_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "external_models_org_key_unique" ON "external_models" USING btree ("organization_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "market_commitment_publications_org_version_unique" ON "market_commitment_publications" USING btree ("organization_id","commitment_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "market_commitment_reviews_org_version_unique" ON "market_commitment_reviews" USING btree ("organization_id","commitment_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "market_commitment_versions_org_commitment_number_unique" ON "market_commitment_versions" USING btree ("organization_id","commitment_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "market_commitments_org_key_unique" ON "market_commitments" USING btree ("organization_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "model_inputs_org_version_key_unique" ON "model_input_definitions" USING btree ("organization_id","model_version_id","input_key");--> statement-breakpoint
CREATE UNIQUE INDEX "model_mapping_evidence_org_pair_unique" ON "model_input_mapping_evidence_links" USING btree ("organization_id","mapping_id","evidence_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "model_mapping_reviews_org_mapping_unique" ON "model_input_mapping_reviews" USING btree ("organization_id","mapping_id");--> statement-breakpoint
CREATE INDEX "model_input_mappings_org_property_idx" ON "model_input_mappings" USING btree ("organization_id","property_id","proposed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "model_outputs_org_version_key_unique" ON "model_output_definitions" USING btree ("organization_id","model_version_id","output_key");--> statement-breakpoint
CREATE INDEX "model_output_records_org_property_idx" ON "model_output_records" USING btree ("organization_id","property_id","as_of_date");--> statement-breakpoint
CREATE UNIQUE INDEX "model_providers_org_key_unique" ON "model_providers" USING btree ("organization_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "recognition_organizations_org_key_unique" ON "recognition_organizations" USING btree ("organization_id","canonical_key");--> statement-breakpoint
ALTER TABLE "governed_source_dependencies" ADD CONSTRAINT "governed_source_dependencies_consumer_check" CHECK ("governed_source_dependencies"."consumer_type" in ('playbook_version', 'renewal_case', 'target_profile_version', 'external_model_version', 'market_commitment_version'));
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "external_models_provider_tenant_guard" AFTER INSERT OR UPDATE ON "external_models" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('provider_id', 'model_providers');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "external_model_versions_model_tenant_guard" AFTER INSERT OR UPDATE ON "external_model_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('model_id', 'external_models');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "external_model_versions_source_tenant_guard" AFTER INSERT OR UPDATE ON "external_model_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "external_model_versions_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "external_model_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'external_model_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "external_model_reviews_version_tenant_guard" AFTER INSERT OR UPDATE ON "external_model_version_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('model_version_id', 'external_model_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "external_model_publications_version_tenant_guard" AFTER INSERT OR UPDATE ON "external_model_version_publications" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('model_version_id', 'external_model_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_inputs_version_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_definitions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('model_version_id', 'external_model_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_outputs_version_tenant_guard" AFTER INSERT OR UPDATE ON "model_output_definitions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('model_version_id', 'external_model_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_output_records_property_tenant_guard" AFTER INSERT OR UPDATE ON "model_output_records" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_output_records_version_tenant_guard" AFTER INSERT OR UPDATE ON "model_output_records" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('model_version_id', 'external_model_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_output_records_definition_tenant_guard" AFTER INSERT OR UPDATE ON "model_output_records" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('output_definition_id', 'model_output_definitions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_output_records_evidence_tenant_guard" AFTER INSERT OR UPDATE ON "model_output_records" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."evidence_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mappings_property_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mappings_intervention_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_intervention_id', 'project_interventions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mappings_finding_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('verification_finding_id', 'verification_findings');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mappings_certificate_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."verification_certificate_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('verification_certificate_id', 'verification_certificates');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mappings_version_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('model_version_id', 'external_model_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mappings_input_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('input_definition_id', 'model_input_definitions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mapping_evidence_mapping_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mapping_evidence_links" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('mapping_id', 'model_input_mappings');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mapping_evidence_version_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mapping_evidence_links" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mapping_reviews_mapping_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mapping_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('mapping_id', 'model_input_mappings');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mapping_events_mapping_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mapping_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('mapping_id', 'model_input_mappings');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mapping_events_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "model_input_mapping_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_event_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_event_id', 'model_input_mapping_events');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "market_commitments_organization_tenant_guard" AFTER INSERT OR UPDATE ON "market_commitments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('committing_organization_id', 'recognition_organizations');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "market_commitment_versions_commitment_tenant_guard" AFTER INSERT OR UPDATE ON "market_commitment_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('commitment_id', 'market_commitments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "market_commitment_versions_profile_tenant_guard" AFTER INSERT OR UPDATE ON "market_commitment_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "market_commitment_versions_model_tenant_guard" AFTER INSERT OR UPDATE ON "market_commitment_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."model_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('model_version_id', 'external_model_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "market_commitment_versions_source_tenant_guard" AFTER INSERT OR UPDATE ON "market_commitment_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "market_commitment_versions_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "market_commitment_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'market_commitment_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "market_commitment_reviews_version_tenant_guard" AFTER INSERT OR UPDATE ON "market_commitment_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('commitment_version_id', 'market_commitment_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "market_commitment_publications_version_tenant_guard" AFTER INSERT OR UPDATE ON "market_commitment_publications" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('commitment_version_id', 'market_commitment_versions');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_governed_source_dependency_guard() RETURNS trigger AS $$
DECLARE target_organization text; published boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM governed_source_publications WHERE source_version_id = NEW.source_version_id AND organization_id = NEW.organization_id AND decision = 'published') INTO published;
  IF published IS NOT TRUE THEN RAISE EXCEPTION 'only a published source version may be relied on'; END IF;
  IF NEW.consumer_type = 'playbook_version' THEN SELECT organization_id INTO target_organization FROM playbook_versions WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'renewal_case' THEN SELECT organization_id INTO target_organization FROM renewal_cases WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'target_profile_version' THEN SELECT organization_id INTO target_organization FROM target_profile_versions WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'external_model_version' THEN SELECT organization_id INTO target_organization FROM external_model_versions WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'market_commitment_version' THEN SELECT organization_id INTO target_organization FROM market_commitment_versions WHERE id = NEW.consumer_id;
  END IF;
  IF target_organization IS NULL OR target_organization <> NEW.organization_id THEN RAISE EXCEPTION 'source dependency consumer is unavailable in this organization'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_model_version_integrity_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM governed_source_versions v JOIN governed_source_publications p ON p.source_version_id = v.id AND p.organization_id = v.organization_id WHERE v.id = NEW.source_version_id AND v.organization_id = NEW.organization_id AND v.verify_current_status = 'verified_current' AND v.rights_status <> 'pending' AND p.decision = 'published') THEN RAISE EXCEPTION 'model version requires a published current rights-reviewed source'; END IF;
  IF NEW.supersedes_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM external_model_versions p WHERE p.id = NEW.supersedes_version_id AND p.model_id = NEW.model_id AND p.organization_id = NEW.organization_id AND p.version_number = NEW.version_number - 1) THEN RAISE EXCEPTION 'model successor must preserve model and immediate version lineage'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "external_model_versions_integrity_guard" AFTER INSERT OR UPDATE ON "external_model_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_model_version_integrity_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_model_review_guard() RETURNS trigger AS $$
DECLARE author text;
BEGIN
  SELECT author_subject INTO author FROM external_model_versions WHERE id = NEW.model_version_id AND organization_id = NEW.organization_id;
  IF author IS NULL OR author = NEW.reviewer_subject THEN RAISE EXCEPTION 'model review requires a distinct in-tenant author and reviewer'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "external_model_reviews_separation_guard" BEFORE INSERT ON "external_model_version_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_model_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_model_publication_guard() RETURNS trigger AS $$
DECLARE author text; reviewer text;
BEGIN
  SELECT v.author_subject, r.reviewer_subject INTO author, reviewer FROM external_model_versions v LEFT JOIN external_model_version_reviews r ON r.model_version_id = v.id AND r.organization_id = v.organization_id AND r.decision = 'approved' WHERE v.id = NEW.model_version_id AND v.organization_id = NEW.organization_id;
  IF reviewer IS NULL OR NEW.human_confirmed IS NOT TRUE OR NEW.publisher_subject IN (author, reviewer) THEN RAISE EXCEPTION 'model publication requires approved review, human confirmation, and a third actor'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "external_model_publications_separation_guard" BEFORE INSERT ON "external_model_version_publications" FOR EACH ROW EXECUTE FUNCTION fortify_model_publication_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_model_output_integrity_guard() RETURNS trigger AS $$
DECLARE output_version text; evidence_property text;
BEGIN
  SELECT model_version_id INTO output_version FROM model_output_definitions WHERE id = NEW.output_definition_id AND organization_id = NEW.organization_id;
  IF output_version IS NULL OR output_version <> NEW.model_version_id THEN RAISE EXCEPTION 'model output definition must belong to exact model version'; END IF;
  IF NEW.evidence_version_id IS NOT NULL THEN SELECT e.property_id INTO evidence_property FROM evidence_versions v JOIN evidence_items e ON e.id = v.evidence_item_id AND e.organization_id = v.organization_id WHERE v.id = NEW.evidence_version_id AND v.organization_id = NEW.organization_id; IF evidence_property IS NULL OR evidence_property <> NEW.property_id THEN RAISE EXCEPTION 'model output evidence must belong to property'; END IF; END IF;
  IF NEW.human_confirmed IS NOT TRUE THEN RAISE EXCEPTION 'model output record requires human confirmation'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_output_records_integrity_guard" AFTER INSERT OR UPDATE ON "model_output_records" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_model_output_integrity_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_model_mapping_integrity_guard() RETURNS trigger AS $$
DECLARE intervention_property text; finding_intervention text; finding_conclusion text; finding_assignment text; input_version text; certificate_assignment text;
BEGIN
  SELECT p.property_id INTO intervention_property FROM project_interventions i JOIN resilience_projects p ON p.id = i.project_id AND p.organization_id = i.organization_id WHERE i.id = NEW.project_intervention_id AND i.organization_id = NEW.organization_id;
  SELECT project_intervention_id, conclusion, assignment_id INTO finding_intervention, finding_conclusion, finding_assignment FROM verification_findings WHERE id = NEW.verification_finding_id AND organization_id = NEW.organization_id;
  SELECT model_version_id INTO input_version FROM model_input_definitions WHERE id = NEW.input_definition_id AND organization_id = NEW.organization_id;
  IF intervention_property IS NULL OR intervention_property <> NEW.property_id OR finding_intervention <> NEW.project_intervention_id OR finding_conclusion <> 'conforming' OR input_version <> NEW.model_version_id THEN RAISE EXCEPTION 'mapping must preserve property, intervention, approved finding, model version, and input lineage'; END IF;
  IF NOT EXISTS(SELECT 1 FROM verification_finding_reviews WHERE finding_id = NEW.verification_finding_id AND organization_id = NEW.organization_id AND decision = 'approved') THEN RAISE EXCEPTION 'mapping requires an approved verification finding'; END IF;
  IF NEW.verification_certificate_id IS NOT NULL THEN SELECT assignment_id INTO certificate_assignment FROM verification_certificates WHERE id = NEW.verification_certificate_id AND organization_id = NEW.organization_id; IF certificate_assignment IS NULL OR certificate_assignment <> finding_assignment THEN RAISE EXCEPTION 'mapping certificate must cover the finding assignment'; END IF; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_input_mappings_integrity_guard" AFTER INSERT OR UPDATE ON "model_input_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_model_mapping_integrity_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_model_mapping_evidence_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM model_input_mappings m JOIN evidence_versions v ON v.id = NEW.evidence_version_id AND v.organization_id = m.organization_id JOIN evidence_items e ON e.id = v.evidence_item_id AND e.organization_id = v.organization_id JOIN verification_finding_evidence_links f ON f.finding_id = m.verification_finding_id AND f.evidence_version_id = v.id AND f.organization_id = m.organization_id WHERE m.id = NEW.mapping_id AND m.organization_id = NEW.organization_id AND e.property_id = m.property_id) THEN RAISE EXCEPTION 'mapping evidence must be exact finding-linked property evidence'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_mapping_evidence_integrity_guard" AFTER INSERT OR UPDATE ON "model_input_mapping_evidence_links" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_model_mapping_evidence_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_model_mapping_review_guard() RETURNS trigger AS $$
DECLARE author text; support text;
BEGIN
  SELECT m.author_subject, d.support_status INTO author, support FROM model_input_mappings m JOIN model_input_definitions d ON d.id = m.input_definition_id AND d.organization_id = m.organization_id WHERE m.id = NEW.mapping_id AND m.organization_id = NEW.organization_id;
  IF author IS NULL OR author = NEW.reviewer_subject THEN RAISE EXCEPTION 'mapping review requires a distinct author and reviewer'; END IF;
  IF NEW.decision = 'approved_for_submission' AND (support <> 'supported' OR NEW.model_documentation_checked IS NOT TRUE OR NEW.verification_checked IS NOT TRUE) THEN RAISE EXCEPTION 'unsupported or unchecked mapping cannot be approved'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "model_mapping_reviews_separation_guard" BEFORE INSERT ON "model_input_mapping_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_model_mapping_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_model_mapping_event_guard() RETURNS trigger AS $$
DECLARE proposed jsonb; review_decision text; latest record;
BEGIN
  SELECT proposed_post_intervention_value INTO proposed FROM model_input_mappings WHERE id = NEW.mapping_id AND organization_id = NEW.organization_id;
  SELECT decision INTO review_decision FROM model_input_mapping_reviews WHERE mapping_id = NEW.mapping_id AND organization_id = NEW.organization_id;
  SELECT id, event_type INTO latest FROM model_input_mapping_events WHERE mapping_id = NEW.mapping_id AND organization_id = NEW.organization_id ORDER BY occurred_at DESC LIMIT 1;
  IF NEW.human_confirmed IS NOT TRUE THEN RAISE EXCEPTION 'mapping event requires human confirmation'; END IF;
  IF (latest.id IS NULL AND NEW.supersedes_event_id IS NOT NULL) OR (latest.id IS NOT NULL AND NEW.supersedes_event_id IS DISTINCT FROM latest.id) THEN RAISE EXCEPTION 'mapping event must supersede latest state'; END IF;
  IF NEW.event_type = 'submitted' AND (review_decision <> 'approved_for_submission' OR latest.id IS NOT NULL) THEN RAISE EXCEPTION 'only approved mapping may be submitted once'; END IF;
  IF NEW.event_type IN ('accepted_by_model_market', 'accepted_with_modification', 'rejected') AND latest.event_type <> 'submitted' THEN RAISE EXCEPTION 'external mapping response requires submission'; END IF;
  IF NEW.event_type = 'unsupported' AND review_decision <> 'unsupported' THEN RAISE EXCEPTION 'unsupported event requires unsupported review'; END IF;
  IF NEW.event_type = 'accepted_by_model_market' AND NEW.accepted_value IS DISTINCT FROM proposed THEN RAISE EXCEPTION 'unmodified acceptance must equal proposed value'; END IF;
  IF NEW.event_type = 'accepted_with_modification' AND NEW.accepted_value IS NOT DISTINCT FROM proposed THEN RAISE EXCEPTION 'modified acceptance must differ from proposed value'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "model_mapping_events_transition_guard" BEFORE INSERT ON "model_input_mapping_events" FOR EACH ROW EXECUTE FUNCTION fortify_model_mapping_event_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_market_commitment_version_guard() RETURNS trigger AS $$
DECLARE ctype text;
BEGIN
  SELECT commitment_type INTO ctype FROM market_commitments WHERE id = NEW.commitment_id AND organization_id = NEW.organization_id;
  IF ctype IS NULL THEN RAISE EXCEPTION 'commitment version requires in-tenant commitment'; END IF;
  IF ctype IN ('evidence_review_commitment', 'response_service_level', 'quote_review', 'reinsurance_portfolio_review') AND NEW.authority_scope <> 'review_only' THEN RAISE EXCEPTION 'review commitment cannot imply insurance or financial authority'; END IF;
  IF NOT EXISTS(SELECT 1 FROM target_profile_publications WHERE profile_version_id = NEW.profile_version_id AND organization_id = NEW.organization_id AND decision = 'published') THEN RAISE EXCEPTION 'commitment requires published target profile'; END IF;
  IF NEW.model_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM external_model_versions WHERE id = NEW.model_version_id AND organization_id = NEW.organization_id AND status = 'active') THEN RAISE EXCEPTION 'commitment model version must be active'; END IF;
  IF NOT EXISTS(SELECT 1 FROM governed_source_versions v JOIN governed_source_publications p ON p.source_version_id = v.id AND p.organization_id = v.organization_id WHERE v.id = NEW.source_version_id AND v.organization_id = NEW.organization_id AND v.verify_current_status = 'verified_current' AND v.rights_status <> 'pending' AND p.decision = 'published') THEN RAISE EXCEPTION 'commitment requires published current rights-reviewed source'; END IF;
  IF NEW.supersedes_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM market_commitment_versions p WHERE p.id = NEW.supersedes_version_id AND p.commitment_id = NEW.commitment_id AND p.organization_id = NEW.organization_id AND p.version_number = NEW.version_number - 1) THEN RAISE EXCEPTION 'commitment successor must preserve immediate lineage'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "market_commitment_versions_integrity_guard" AFTER INSERT OR UPDATE ON "market_commitment_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_market_commitment_version_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_market_commitment_review_guard() RETURNS trigger AS $$
DECLARE author text;
BEGIN
  SELECT author_subject INTO author FROM market_commitment_versions WHERE id = NEW.commitment_version_id AND organization_id = NEW.organization_id;
  IF author IS NULL OR author = NEW.reviewer_subject THEN RAISE EXCEPTION 'commitment review requires a distinct author and reviewer'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "market_commitment_reviews_separation_guard" BEFORE INSERT ON "market_commitment_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_market_commitment_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_market_commitment_publication_guard() RETURNS trigger AS $$
DECLARE author text; reviewer text;
BEGIN
  SELECT v.author_subject, r.reviewer_subject INTO author, reviewer FROM market_commitment_versions v LEFT JOIN market_commitment_reviews r ON r.commitment_version_id = v.id AND r.organization_id = v.organization_id AND r.decision = 'approved' WHERE v.id = NEW.commitment_version_id AND v.organization_id = NEW.organization_id;
  IF reviewer IS NULL OR NEW.human_confirmed IS NOT TRUE OR NEW.publisher_subject IN (author, reviewer) THEN RAISE EXCEPTION 'commitment publication requires approved review, human confirmation, and a third actor'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "market_commitment_publications_separation_guard" BEFORE INSERT ON "market_commitment_publications" FOR EACH ROW EXECUTE FUNCTION fortify_market_commitment_publication_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_restrict_model_version_update() RETURNS trigger AS $$
BEGIN
  IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id OR OLD.model_id <> NEW.model_id OR OLD.version_number <> NEW.version_number OR OLD.version_label <> NEW.version_label OR OLD.geography <> NEW.geography OR OLD.property_classes <> NEW.property_classes OR OLD.effective_from <> NEW.effective_from OR OLD.effective_to IS DISTINCT FROM NEW.effective_to OR OLD.source_version_id <> NEW.source_version_id OR OLD.methodology_summary <> NEW.methodology_summary OR OLD.usage_rights <> NEW.usage_rights OR OLD.redistribution_restrictions <> NEW.redistribution_restrictions OR OLD.limitations <> NEW.limitations OR OLD.author_subject <> NEW.author_subject OR OLD.supersedes_version_id IS DISTINCT FROM NEW.supersedes_version_id THEN RAISE EXCEPTION 'model version authored fields are immutable'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "external_model_versions_restricted_update" BEFORE UPDATE ON "external_model_versions" FOR EACH ROW EXECUTE FUNCTION fortify_restrict_model_version_update();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_restrict_commitment_version_update() RETURNS trigger AS $$
BEGIN
  IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id OR OLD.commitment_id <> NEW.commitment_id OR OLD.version_number <> NEW.version_number OR OLD.profile_version_id <> NEW.profile_version_id OR OLD.model_version_id IS DISTINCT FROM NEW.model_version_id OR OLD.geography <> NEW.geography OR OLD.property_classes <> NEW.property_classes OR OLD.evidence_required <> NEW.evidence_required OR OLD.exclusions <> NEW.exclusions OR OLD.response_or_financial_action <> NEW.response_or_financial_action OR OLD.authority_scope <> NEW.authority_scope OR OLD.effective_from <> NEW.effective_from OR OLD.effective_to IS DISTINCT FROM NEW.effective_to OR OLD.source_version_id <> NEW.source_version_id OR OLD.limitations <> NEW.limitations OR OLD.author_subject <> NEW.author_subject OR OLD.supersedes_version_id IS DISTINCT FROM NEW.supersedes_version_id THEN RAISE EXCEPTION 'commitment version authored fields are immutable'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "market_commitment_versions_restricted_update" BEFORE UPDATE ON "market_commitment_versions" FOR EACH ROW EXECUTE FUNCTION fortify_restrict_commitment_version_update();
--> statement-breakpoint
CREATE TRIGGER "external_model_versions_immutable_delete" BEFORE DELETE ON "external_model_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "external_model_reviews_immutable_update" BEFORE UPDATE ON "external_model_version_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "external_model_reviews_immutable_delete" BEFORE DELETE ON "external_model_version_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "external_model_publications_immutable_update" BEFORE UPDATE ON "external_model_version_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "external_model_publications_immutable_delete" BEFORE DELETE ON "external_model_version_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_inputs_immutable_update" BEFORE UPDATE ON "model_input_definitions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_inputs_immutable_delete" BEFORE DELETE ON "model_input_definitions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_outputs_immutable_update" BEFORE UPDATE ON "model_output_definitions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_outputs_immutable_delete" BEFORE DELETE ON "model_output_definitions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_output_records_immutable_update" BEFORE UPDATE ON "model_output_records" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_output_records_immutable_delete" BEFORE DELETE ON "model_output_records" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_input_mappings_immutable_update" BEFORE UPDATE ON "model_input_mappings" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_input_mappings_immutable_delete" BEFORE DELETE ON "model_input_mappings" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_mapping_evidence_immutable_update" BEFORE UPDATE ON "model_input_mapping_evidence_links" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_mapping_evidence_immutable_delete" BEFORE DELETE ON "model_input_mapping_evidence_links" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_mapping_reviews_immutable_update" BEFORE UPDATE ON "model_input_mapping_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_mapping_reviews_immutable_delete" BEFORE DELETE ON "model_input_mapping_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_mapping_events_immutable_update" BEFORE UPDATE ON "model_input_mapping_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_mapping_events_immutable_delete" BEFORE DELETE ON "model_input_mapping_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "market_commitment_versions_immutable_delete" BEFORE DELETE ON "market_commitment_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "market_commitment_reviews_immutable_update" BEFORE UPDATE ON "market_commitment_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "market_commitment_reviews_immutable_delete" BEFORE DELETE ON "market_commitment_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "market_commitment_publications_immutable_update" BEFORE UPDATE ON "market_commitment_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "market_commitment_publications_immutable_delete" BEFORE DELETE ON "market_commitment_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
