CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_subject" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"detail" jsonb NOT NULL,
	"previous_hash" text,
	"event_hash" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"external_system" text,
	"external_id" text,
	CONSTRAINT "books_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "buildings" (
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
	"label" text NOT NULL,
	"construction_year" integer,
	CONSTRAINT "buildings_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"book_id" text,
	"name" text NOT NULL,
	"external_system" text,
	"external_id" text,
	CONSTRAINT "clients_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"client_id" text,
	"name" text NOT NULL,
	"property_class" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"external_system" text,
	"external_id" text,
	CONSTRAINT "communities_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "contradictions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"case_id" text NOT NULL,
	"left_evidence_version_id" text NOT NULL,
	"right_evidence_version_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "contradictions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
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
	"evidence_type" text NOT NULL,
	"current_version_id" text,
	CONSTRAINT "evidence_items_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "evidence_requirement_links" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"case_id" text NOT NULL,
	"evidence_version_id" text NOT NULL,
	"requirement_version_id" text NOT NULL,
	"scope_status" text NOT NULL,
	"freshness_status" text NOT NULL,
	"review_status" text NOT NULL,
	"disposition" text NOT NULL,
	CONSTRAINT "evidence_requirement_links_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "evidence_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"evidence_item_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"storage_key" text NOT NULL,
	"source_type" text NOT NULL,
	"source_organization" text,
	"capture_date" date,
	"received_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"scope_type" text NOT NULL,
	"scope_reference" text,
	"confidence" numeric(5, 4),
	"review_status" text NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"supersedes_id" text,
	CONSTRAINT "evidence_versions_size_check" CHECK ("evidence_versions"."size_bytes" > 0),
	CONSTRAINT "evidence_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_json" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "idempotency_keys_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "locations" (
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
	"address_line_1" text NOT NULL,
	"city" text,
	"region" text NOT NULL,
	"postal_code" text,
	"county" text,
	"country_code" text DEFAULT 'US' NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"normalization_status" text DEFAULT 'unreviewed' NOT NULL,
	CONSTRAINT "locations_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "maintenance_events" (
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
	"title" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"recurrence_rule" text,
	"status" text NOT NULL,
	CONSTRAINT "maintenance_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "market_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"submission_version_id" text NOT NULL,
	"response_type" text NOT NULL,
	"original_language" text NOT NULL,
	"normalized_reason" text,
	"received_at" timestamp with time zone NOT NULL,
	"supersedes_id" text,
	CONSTRAINT "market_responses_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"market_type" text NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL,
	CONSTRAINT "markets_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"identity_subject" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "memberships_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"environment" text NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL,
	"cross_customer_analytics_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_environment_check" CHECK ("organizations"."environment" in ('production', 'sandbox')),
	CONSTRAINT "organizations_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold')),
	CONSTRAINT "organizations_sandbox_synthetic_check" CHECK ("organizations"."environment" <> 'sandbox' or "organizations"."synthetic" = true)
);
--> statement-breakpoint
CREATE TABLE "policies" (
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
	"market_id" text,
	"program_id" text,
	"policy_number" text NOT NULL,
	"effective_date" date,
	"expiration_date" date NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"premium_minor" integer,
	"source_authority" text DEFAULT 'broker' NOT NULL,
	CONSTRAINT "policies_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"market_id" text NOT NULL,
	"name" text NOT NULL,
	"peril" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"property_class" text NOT NULL,
	CONSTRAINT "programs_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"community_id" text,
	"name" text NOT NULL,
	"property_class" text NOT NULL,
	"unit_count" integer,
	"building_count" integer,
	CONSTRAINT "properties_unit_count_check" CHECK ("properties"."unit_count" is null or "properties"."unit_count" >= 0),
	CONSTRAINT "properties_building_count_check" CHECK ("properties"."building_count" is null or "properties"."building_count" >= 0),
	CONSTRAINT "properties_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "property_identifiers" (
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
	"source" text NOT NULL,
	"identifier_type" text NOT NULL,
	"value" text NOT NULL,
	"review_status" text DEFAULT 'confirmed' NOT NULL,
	CONSTRAINT "property_identifiers_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "renewal_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"policy_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"case_type" text DEFAULT 'renewal' NOT NULL,
	"peril" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"property_class" text NOT NULL,
	"renewal_date" date NOT NULL,
	"appeal_deadline" date,
	"owner_subject" text,
	CONSTRAINT "renewal_cases_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "renewal_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"case_id" text NOT NULL,
	"status" text NOT NULL,
	"original_language" text NOT NULL,
	"normalized_reason" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL,
	"supersedes_id" text,
	CONSTRAINT "renewal_outcomes_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "requirement_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"market_id" text,
	"program_id" text,
	"name" text NOT NULL,
	"peril" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"property_class" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text NOT NULL,
	"verify_current" boolean DEFAULT true NOT NULL,
	CONSTRAINT "requirement_sets_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "requirement_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"requirement_id" text NOT NULL,
	"version" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"summary" text NOT NULL,
	"source_url" text NOT NULL,
	"content_hash" text NOT NULL,
	"supersedes_id" text,
	CONSTRAINT "requirement_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"requirement_set_id" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"scope_type" text NOT NULL,
	"importance" text DEFAULT 'required' NOT NULL,
	"blocking" boolean DEFAULT false NOT NULL,
	CONSTRAINT "requirements_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"case_id" text,
	"document_type" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text,
	"sha256" text,
	"source_system" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"processing_status" text NOT NULL,
	"synthetic" boolean DEFAULT false NOT NULL,
	CONSTRAINT "source_documents_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "source_passages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_document_id" text NOT NULL,
	"page_number" integer,
	"segment" text,
	"text_content" text NOT NULL,
	"extractor_version" text NOT NULL,
	"confidence" numeric(5, 4),
	"confirmation_status" text DEFAULT 'unreviewed' NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "source_passages_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "submission_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"submission_version_id" text NOT NULL,
	"evidence_version_id" text NOT NULL,
	"exhibit_label" text NOT NULL,
	CONSTRAINT "submission_items_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "submission_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"submission_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"caveats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp with time zone,
	"manifest_hash" text,
	CONSTRAINT "submission_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"case_id" text NOT NULL,
	"market_id" text,
	"purpose" text NOT NULL,
	"status" text NOT NULL,
	"current_version_id" text,
	CONSTRAINT "submissions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"case_id" text NOT NULL,
	"requirement_id" text,
	"title" text NOT NULL,
	"owner_subject" text,
	"due_at" timestamp with time zone,
	"status" text NOT NULL,
	CONSTRAINT "tasks_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	CONSTRAINT "teams_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contradictions" ADD CONSTRAINT "contradictions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contradictions" ADD CONSTRAINT "contradictions_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contradictions" ADD CONSTRAINT "contradictions_left_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("left_evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contradictions" ADD CONSTRAINT "contradictions_right_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("right_evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requirement_links" ADD CONSTRAINT "evidence_requirement_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requirement_links" ADD CONSTRAINT "evidence_requirement_links_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requirement_links" ADD CONSTRAINT "evidence_requirement_links_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requirement_links" ADD CONSTRAINT "evidence_requirement_links_requirement_version_id_requirement_versions_id_fk" FOREIGN KEY ("requirement_version_id") REFERENCES "public"."requirement_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_versions" ADD CONSTRAINT "evidence_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_versions" ADD CONSTRAINT "evidence_versions_evidence_item_id_evidence_items_id_fk" FOREIGN KEY ("evidence_item_id") REFERENCES "public"."evidence_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_events" ADD CONSTRAINT "maintenance_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_events" ADD CONSTRAINT "maintenance_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_responses" ADD CONSTRAINT "market_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_responses" ADD CONSTRAINT "market_responses_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_identifiers" ADD CONSTRAINT "property_identifiers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_identifiers" ADD CONSTRAINT "property_identifiers_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_cases" ADD CONSTRAINT "renewal_cases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_cases" ADD CONSTRAINT "renewal_cases_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_outcomes" ADD CONSTRAINT "renewal_outcomes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renewal_outcomes" ADD CONSTRAINT "renewal_outcomes_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_sets" ADD CONSTRAINT "requirement_sets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_sets" ADD CONSTRAINT "requirement_sets_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_sets" ADD CONSTRAINT "requirement_sets_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_versions" ADD CONSTRAINT "requirement_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_versions" ADD CONSTRAINT "requirement_versions_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_requirement_set_id_requirement_sets_id_fk" FOREIGN KEY ("requirement_set_id") REFERENCES "public"."requirement_sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_passages" ADD CONSTRAINT "source_passages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_passages" ADD CONSTRAINT "source_passages_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_items" ADD CONSTRAINT "submission_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_items" ADD CONSTRAINT "submission_items_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_items" ADD CONSTRAINT "submission_items_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_org_hash_unique" ON "audit_events" USING btree ("organization_id","event_hash");--> statement-breakpoint
CREATE INDEX "audit_events_org_resource_idx" ON "audit_events" USING btree ("organization_id","resource_type","resource_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "books_org_external_unique" ON "books" USING btree ("organization_id","external_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "buildings_org_property_label_unique" ON "buildings" USING btree ("organization_id","property_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_org_external_unique" ON "clients" USING btree ("organization_id","external_system","external_id");--> statement-breakpoint
CREATE INDEX "clients_org_book_idx" ON "clients" USING btree ("organization_id","book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "communities_org_external_unique" ON "communities" USING btree ("organization_id","external_system","external_id");--> statement-breakpoint
CREATE INDEX "communities_org_client_idx" ON "communities" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contradictions_org_pair_unique" ON "contradictions" USING btree ("organization_id","left_evidence_version_id","right_evidence_version_id");--> statement-breakpoint
CREATE INDEX "evidence_items_org_property_idx" ON "evidence_items" USING btree ("organization_id","property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_requirement_links_unique" ON "evidence_requirement_links" USING btree ("organization_id","case_id","evidence_version_id","requirement_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_versions_org_item_version_unique" ON "evidence_versions" USING btree ("organization_id","evidence_item_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_versions_org_hash_unique" ON "evidence_versions" USING btree ("organization_id","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_org_scope_key_unique" ON "idempotency_keys" USING btree ("organization_id","scope","key");--> statement-breakpoint
CREATE INDEX "locations_org_property_idx" ON "locations" USING btree ("organization_id","property_id");--> statement-breakpoint
CREATE INDEX "maintenance_events_org_property_idx" ON "maintenance_events" USING btree ("organization_id","property_id");--> statement-breakpoint
CREATE INDEX "market_responses_org_submission_idx" ON "market_responses" USING btree ("organization_id","submission_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "markets_org_name_unique" ON "markets" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_subject_unique" ON "memberships" USING btree ("organization_id","identity_subject");--> statement-breakpoint
CREATE INDEX "memberships_org_status_idx" ON "memberships" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "policies_org_number_expiry_unique" ON "policies" USING btree ("organization_id","policy_number","expiration_date");--> statement-breakpoint
CREATE UNIQUE INDEX "programs_org_market_name_unique" ON "programs" USING btree ("organization_id","market_id","name");--> statement-breakpoint
CREATE INDEX "properties_org_community_idx" ON "properties" USING btree ("organization_id","community_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_identifiers_org_source_value_unique" ON "property_identifiers" USING btree ("organization_id","source","identifier_type","value");--> statement-breakpoint
CREATE INDEX "renewal_cases_org_status_idx" ON "renewal_cases" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "renewal_outcomes_org_case_idx" ON "renewal_outcomes" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE INDEX "requirement_sets_org_scope_idx" ON "requirement_sets" USING btree ("organization_id","peril","jurisdiction","property_class");--> statement-breakpoint
CREATE UNIQUE INDEX "requirement_versions_org_requirement_version_unique" ON "requirement_versions" USING btree ("organization_id","requirement_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "requirements_org_set_code_unique" ON "requirements" USING btree ("organization_id","requirement_set_id","code");--> statement-breakpoint
CREATE INDEX "source_documents_org_case_idx" ON "source_documents" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_documents_org_hash_unique" ON "source_documents" USING btree ("organization_id","sha256");--> statement-breakpoint
CREATE INDEX "source_passages_org_document_idx" ON "source_passages" USING btree ("organization_id","source_document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_items_org_version_evidence_unique" ON "submission_items" USING btree ("organization_id","submission_version_id","evidence_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_versions_org_submission_version_unique" ON "submission_versions" USING btree ("organization_id","submission_id","version_number");--> statement-breakpoint
CREATE INDEX "submissions_org_case_idx" ON "submissions" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE INDEX "tasks_org_case_status_idx" ON "tasks" USING btree ("organization_id","case_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_org_name_unique" ON "teams" USING btree ("organization_id","name");--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_reject_immutable_change()
RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION '% records are immutable; create a superseding record', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER audit_events_no_update
BEFORE UPDATE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();--> statement-breakpoint
CREATE TRIGGER audit_events_no_delete
BEFORE DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();--> statement-breakpoint
CREATE TRIGGER requirement_versions_no_update
BEFORE UPDATE ON "requirement_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();--> statement-breakpoint
CREATE TRIGGER requirement_versions_no_delete
BEFORE DELETE ON "requirement_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();--> statement-breakpoint
CREATE TRIGGER evidence_versions_no_update
BEFORE UPDATE ON "evidence_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();--> statement-breakpoint
CREATE TRIGGER evidence_versions_no_delete
BEFORE DELETE ON "evidence_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();--> statement-breakpoint
CREATE TRIGGER submission_versions_no_update
BEFORE UPDATE ON "submission_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();--> statement-breakpoint
CREATE TRIGGER submission_versions_no_delete
BEFORE DELETE ON "submission_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_require_same_organization()
RETURNS trigger AS $$
DECLARE
	reference_id text;
	reference_organization_id text;
BEGIN
	EXECUTE format('SELECT ($1).%I::text', TG_ARGV[0])
		INTO reference_id
		USING NEW;
	IF reference_id IS NULL THEN
		RETURN NEW;
	END IF;
	EXECUTE format(
		'SELECT organization_id FROM %I.%I WHERE id = $1',
		'public',
		TG_ARGV[1]
	)
		INTO reference_organization_id
		USING reference_id;
	IF reference_organization_id IS DISTINCT FROM NEW.organization_id THEN
		RAISE EXCEPTION 'cross-tenant reference rejected on %.%', TG_TABLE_NAME, TG_ARGV[0];
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER tenant_guard_clients_book
BEFORE INSERT OR UPDATE ON "clients" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('book_id', 'books');--> statement-breakpoint
CREATE TRIGGER tenant_guard_communities_client
BEFORE INSERT OR UPDATE ON "communities" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('client_id', 'clients');--> statement-breakpoint
CREATE TRIGGER tenant_guard_properties_community
BEFORE INSERT OR UPDATE ON "properties" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('community_id', 'communities');--> statement-breakpoint
CREATE TRIGGER tenant_guard_property_identifiers_property
BEFORE INSERT OR UPDATE ON "property_identifiers" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');--> statement-breakpoint
CREATE TRIGGER tenant_guard_locations_property
BEFORE INSERT OR UPDATE ON "locations" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');--> statement-breakpoint
CREATE TRIGGER tenant_guard_buildings_property
BEFORE INSERT OR UPDATE ON "buildings" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');--> statement-breakpoint
CREATE TRIGGER tenant_guard_programs_market
BEFORE INSERT OR UPDATE ON "programs" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('market_id', 'markets');--> statement-breakpoint
CREATE TRIGGER tenant_guard_policies_property
BEFORE INSERT OR UPDATE ON "policies" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');--> statement-breakpoint
CREATE TRIGGER tenant_guard_policies_market
BEFORE INSERT OR UPDATE ON "policies" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('market_id', 'markets');--> statement-breakpoint
CREATE TRIGGER tenant_guard_policies_program
BEFORE INSERT OR UPDATE ON "policies" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('program_id', 'programs');--> statement-breakpoint
CREATE TRIGGER tenant_guard_renewal_cases_policy
BEFORE INSERT OR UPDATE ON "renewal_cases" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('policy_id', 'policies');--> statement-breakpoint
CREATE TRIGGER tenant_guard_source_documents_case
BEFORE INSERT OR UPDATE ON "source_documents" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');--> statement-breakpoint
CREATE TRIGGER tenant_guard_source_passages_document
BEFORE INSERT OR UPDATE ON "source_passages" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('source_document_id', 'source_documents');--> statement-breakpoint
CREATE TRIGGER tenant_guard_requirement_sets_market
BEFORE INSERT OR UPDATE ON "requirement_sets" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('market_id', 'markets');--> statement-breakpoint
CREATE TRIGGER tenant_guard_requirement_sets_program
BEFORE INSERT OR UPDATE ON "requirement_sets" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('program_id', 'programs');--> statement-breakpoint
CREATE TRIGGER tenant_guard_requirements_set
BEFORE INSERT OR UPDATE ON "requirements" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('requirement_set_id', 'requirement_sets');--> statement-breakpoint
CREATE TRIGGER tenant_guard_requirement_versions_requirement
BEFORE INSERT OR UPDATE ON "requirement_versions" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('requirement_id', 'requirements');--> statement-breakpoint
CREATE TRIGGER tenant_guard_evidence_items_property
BEFORE INSERT OR UPDATE ON "evidence_items" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');--> statement-breakpoint
CREATE TRIGGER tenant_guard_evidence_versions_item
BEFORE INSERT OR UPDATE ON "evidence_versions" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('evidence_item_id', 'evidence_items');--> statement-breakpoint
CREATE TRIGGER tenant_guard_evidence_links_case
BEFORE INSERT OR UPDATE ON "evidence_requirement_links" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');--> statement-breakpoint
CREATE TRIGGER tenant_guard_evidence_links_evidence
BEFORE INSERT OR UPDATE ON "evidence_requirement_links" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');--> statement-breakpoint
CREATE TRIGGER tenant_guard_evidence_links_requirement
BEFORE INSERT OR UPDATE ON "evidence_requirement_links" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('requirement_version_id', 'requirement_versions');--> statement-breakpoint
CREATE TRIGGER tenant_guard_contradictions_case
BEFORE INSERT OR UPDATE ON "contradictions" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');--> statement-breakpoint
CREATE TRIGGER tenant_guard_contradictions_left
BEFORE INSERT OR UPDATE ON "contradictions" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('left_evidence_version_id', 'evidence_versions');--> statement-breakpoint
CREATE TRIGGER tenant_guard_contradictions_right
BEFORE INSERT OR UPDATE ON "contradictions" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('right_evidence_version_id', 'evidence_versions');--> statement-breakpoint
CREATE TRIGGER tenant_guard_tasks_case
BEFORE INSERT OR UPDATE ON "tasks" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');--> statement-breakpoint
CREATE TRIGGER tenant_guard_tasks_requirement
BEFORE INSERT OR UPDATE ON "tasks" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('requirement_id', 'requirements');--> statement-breakpoint
CREATE TRIGGER tenant_guard_submissions_case
BEFORE INSERT OR UPDATE ON "submissions" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');--> statement-breakpoint
CREATE TRIGGER tenant_guard_submissions_market
BEFORE INSERT OR UPDATE ON "submissions" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('market_id', 'markets');--> statement-breakpoint
CREATE TRIGGER tenant_guard_submission_versions_submission
BEFORE INSERT OR UPDATE ON "submission_versions" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('submission_id', 'submissions');--> statement-breakpoint
CREATE TRIGGER tenant_guard_submission_items_version
BEFORE INSERT OR UPDATE ON "submission_items" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');--> statement-breakpoint
CREATE TRIGGER tenant_guard_submission_items_evidence
BEFORE INSERT OR UPDATE ON "submission_items" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');--> statement-breakpoint
CREATE TRIGGER tenant_guard_market_responses_submission
BEFORE INSERT OR UPDATE ON "market_responses" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');--> statement-breakpoint
CREATE TRIGGER tenant_guard_renewal_outcomes_case
BEFORE INSERT OR UPDATE ON "renewal_outcomes" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');--> statement-breakpoint
CREATE TRIGGER tenant_guard_maintenance_events_property
BEFORE INSERT OR UPDATE ON "maintenance_events" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
