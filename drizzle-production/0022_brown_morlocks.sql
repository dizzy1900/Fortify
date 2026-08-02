CREATE TABLE "analytics_policy_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"policy_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"publisher_subject" text NOT NULL,
	"note" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	CONSTRAINT "analytics_policy_publications_decision_check" CHECK ("analytics_policy_publications"."decision" in ('published', 'rejected')),
	CONSTRAINT "analytics_policy_publications_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "analytics_policy_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"policy_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"rights_checked" boolean DEFAULT false NOT NULL,
	"privacy_checked" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "analytics_policy_reviews_decision_check" CHECK ("analytics_policy_reviews"."decision" in ('approved', 'rejected', 'changes_requested')),
	CONSTRAINT "analytics_policy_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "analytics_policy_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"version_number" integer NOT NULL,
	"mode" text NOT NULL,
	"contract_reference" text,
	"minimum_cohort_size" integer DEFAULT 10 NOT NULL,
	"deidentification_method" text NOT NULL,
	"suppression_threshold" integer DEFAULT 10 NOT NULL,
	"allowed_metric_families" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retention_days" integer NOT NULL,
	"deletion_treatment" text NOT NULL,
	"opt_in_confirmed" boolean DEFAULT false NOT NULL,
	"author_subject" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"supersedes_version_id" text,
	CONSTRAINT "analytics_policy_versions_number_check" CHECK ("analytics_policy_versions"."version_number" >= 1),
	CONSTRAINT "analytics_policy_versions_mode_check" CHECK ("analytics_policy_versions"."mode" in ('tenant_only', 'cross_customer_opt_in')),
	CONSTRAINT "analytics_policy_versions_status_check" CHECK ("analytics_policy_versions"."status" in ('draft', 'reviewed', 'published', 'superseded', 'withdrawn')),
	CONSTRAINT "analytics_policy_versions_threshold_check" CHECK ("analytics_policy_versions"."minimum_cohort_size" >= 10 and "analytics_policy_versions"."suppression_threshold" >= 10 and "analytics_policy_versions"."retention_days" > 0),
	CONSTRAINT "analytics_policy_versions_rights_check" CHECK ("analytics_policy_versions"."mode" = 'tenant_only' or ("analytics_policy_versions"."contract_reference" is not null and "analytics_policy_versions"."opt_in_confirmed" = true)),
	CONSTRAINT "analytics_policy_versions_period_check" CHECK ("analytics_policy_versions"."effective_to" is null or "analytics_policy_versions"."effective_to" >= "analytics_policy_versions"."effective_from"),
	CONSTRAINT "analytics_policy_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "analytics_query_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"policy_version_id" text NOT NULL,
	"metric_snapshot_id" text NOT NULL,
	"query_purpose" text NOT NULL,
	"requested_scope" text NOT NULL,
	"distinct_tenant_count" integer NOT NULL,
	"distinct_property_count" integer NOT NULL,
	"suppression_applied" boolean DEFAULT false NOT NULL,
	"suppressed_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"executed_by" text NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "analytics_query_receipts_scope_check" CHECK ("analytics_query_receipts"."requested_scope" in ('tenant_only', 'cross_customer_opt_in')),
	CONSTRAINT "analytics_query_receipts_counts_check" CHECK ("analytics_query_receipts"."distinct_tenant_count" >= 1 and "analytics_query_receipts"."distinct_property_count" >= 0),
	CONSTRAINT "analytics_query_receipts_hash_check" CHECK (char_length("analytics_query_receipts"."payload_hash") = 64),
	CONSTRAINT "analytics_query_receipts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "analytics_report_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"report_id" text NOT NULL,
	"storage_object_id" text NOT NULL,
	"format" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "analytics_report_artifacts_format_check" CHECK ("analytics_report_artifacts"."format" in ('json', 'csv')),
	CONSTRAINT "analytics_report_artifacts_size_check" CHECK ("analytics_report_artifacts"."size_bytes" > 0 and char_length("analytics_report_artifacts"."sha256") = 64),
	CONSTRAINT "analytics_report_artifacts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "analytics_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"metric_snapshot_id" text NOT NULL,
	"baseline_id" text,
	"report_type" text NOT NULL,
	"title" text NOT NULL,
	"methodology_version" text NOT NULL,
	"metric_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"caveats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interpretation_boundary" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"generated_by" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "analytics_reports_type_check" CHECK ("analytics_reports"."report_type" in ('brokerage_roi', 'programme_outcome')),
	CONSTRAINT "analytics_reports_confirmed_check" CHECK ("analytics_reports"."human_confirmed" = true),
	CONSTRAINT "analytics_reports_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "programme_cohort_membership_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"cohort_version_id" text NOT NULL,
	"property_id" text NOT NULL,
	"case_id" text,
	"project_id" text,
	"event_type" text NOT NULL,
	"reason" text NOT NULL,
	"source" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"decided_by" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"supersedes_event_id" text,
	CONSTRAINT "programme_cohort_membership_type_check" CHECK ("programme_cohort_membership_events"."event_type" in ('applicant', 'qualified', 'ineligible', 'insufficient_evidence', 'project_started', 'project_completed', 'removed', 'corrected')),
	CONSTRAINT "programme_cohort_membership_confirmed_check" CHECK ("programme_cohort_membership_events"."human_confirmed" = true),
	CONSTRAINT "programme_cohort_membership_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "programme_cohort_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"cohort_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"programme_version_id" text NOT NULL,
	"profile_version_id" text NOT NULL,
	"geography" text NOT NULL,
	"property_class" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"state" text DEFAULT 'draft' NOT NULL,
	"methodology_version" text NOT NULL,
	"limitations" text NOT NULL,
	"author_subject" text NOT NULL,
	"activated_by" text,
	"activated_at" timestamp with time zone,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"supersedes_version_id" text,
	CONSTRAINT "programme_cohort_versions_number_check" CHECK ("programme_cohort_versions"."version_number" >= 1),
	CONSTRAINT "programme_cohort_versions_state_check" CHECK ("programme_cohort_versions"."state" in ('draft', 'active', 'superseded', 'closed', 'withdrawn')),
	CONSTRAINT "programme_cohort_versions_period_check" CHECK ("programme_cohort_versions"."effective_to" is null or "programme_cohort_versions"."effective_to" >= "programme_cohort_versions"."effective_from"),
	CONSTRAINT "programme_cohort_versions_activation_check" CHECK ("programme_cohort_versions"."state" <> 'active' or ("programme_cohort_versions"."human_confirmed" = true and "programme_cohort_versions"."activated_by" is not null and "programme_cohort_versions"."activated_at" is not null)),
	CONSTRAINT "programme_cohort_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "programme_cohorts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"funding_programme_id" text NOT NULL,
	"canonical_key" text NOT NULL,
	"name" text NOT NULL,
	"sponsor_name" text NOT NULL,
	"description" text NOT NULL,
	"owner_subject" text NOT NULL,
	CONSTRAINT "programme_cohorts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "programme_metric_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"cohort_version_id" text NOT NULL,
	"policy_version_id" text NOT NULL,
	"analytics_scope" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"methodology_version" text NOT NULL,
	"source_data_through" timestamp with time zone NOT NULL,
	"input_hash" text NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"denominators" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"suppressed_metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"caveats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_by" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "programme_metric_snapshots_scope_check" CHECK ("programme_metric_snapshots"."analytics_scope" in ('tenant_only', 'cross_customer_opt_in')),
	CONSTRAINT "programme_metric_snapshots_window_check" CHECK ("programme_metric_snapshots"."window_end" >= "programme_metric_snapshots"."window_start" and "programme_metric_snapshots"."source_data_through" <= "programme_metric_snapshots"."generated_at"),
	CONSTRAINT "programme_metric_snapshots_hash_check" CHECK (char_length("programme_metric_snapshots"."input_hash") = 64),
	CONSTRAINT "programme_metric_snapshots_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "recognition_graph_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_audit_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"relationship" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text NOT NULL,
	"property_id" text,
	"case_id" text,
	"project_id" text,
	"programme_version_id" text,
	"submission_version_id" text,
	"evidence_level" text,
	"data_right_class" text DEFAULT 'deidentified_derived_event' NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_hash" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "recognition_graph_events_hash_check" CHECK (char_length("recognition_graph_events"."event_hash") = 64),
	CONSTRAINT "recognition_graph_events_right_check" CHECK ("recognition_graph_events"."data_right_class" in ('software_telemetry', 'deidentified_derived_event', 'property_specific_data', 'customer_specific_playbook', 'carrier_confidential_material', 'model_provider_restricted')),
	CONSTRAINT "recognition_graph_events_evidence_check" CHECK ("recognition_graph_events"."evidence_level" is null or "recognition_graph_events"."evidence_level" in ('physical_specification', 'verified_installation', 'modelled_vulnerability_reduction', 'modelled_expected_loss_reduction', 'filed_rating_treatment', 'underwriting_treatment', 'financing_or_programme_treatment', 'observed_event_performance', 'claims_evidence')),
	CONSTRAINT "recognition_graph_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "workflow_baselines" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"cohort_version_id" text,
	"baseline_type" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"case_count" integer NOT NULL,
	"manual_minutes_per_case" integer NOT NULL,
	"manual_touches_per_case" integer NOT NULL,
	"external_cost_cents_per_case" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"source" text NOT NULL,
	"source_version" text NOT NULL,
	"limitations" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_by" text NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workflow_baselines_type_check" CHECK ("workflow_baselines"."baseline_type" in ('brokerage_workflow', 'programme_operations')),
	CONSTRAINT "workflow_baselines_value_check" CHECK ("workflow_baselines"."case_count" > 0 and "workflow_baselines"."manual_minutes_per_case" >= 0 and "workflow_baselines"."manual_touches_per_case" >= 0 and "workflow_baselines"."external_cost_cents_per_case" >= 0),
	CONSTRAINT "workflow_baselines_period_check" CHECK ("workflow_baselines"."period_end" >= "workflow_baselines"."period_start"),
	CONSTRAINT "workflow_baselines_confirmed_check" CHECK ("workflow_baselines"."human_confirmed" = true),
	CONSTRAINT "workflow_baselines_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "analytics_policy_publications" ADD CONSTRAINT "analytics_policy_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_policy_publications" ADD CONSTRAINT "analytics_policy_publications_policy_version_id_analytics_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."analytics_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_policy_reviews" ADD CONSTRAINT "analytics_policy_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_policy_reviews" ADD CONSTRAINT "analytics_policy_reviews_policy_version_id_analytics_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."analytics_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_policy_versions" ADD CONSTRAINT "analytics_policy_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_policy_versions" ADD CONSTRAINT "analytics_policy_versions_supersedes_version_id_analytics_policy_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."analytics_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_query_receipts" ADD CONSTRAINT "analytics_query_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_query_receipts" ADD CONSTRAINT "analytics_query_receipts_policy_version_id_analytics_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."analytics_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_query_receipts" ADD CONSTRAINT "analytics_query_receipts_metric_snapshot_id_programme_metric_snapshots_id_fk" FOREIGN KEY ("metric_snapshot_id") REFERENCES "public"."programme_metric_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_report_artifacts" ADD CONSTRAINT "analytics_report_artifacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_report_artifacts" ADD CONSTRAINT "analytics_report_artifacts_report_id_analytics_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."analytics_reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_report_artifacts" ADD CONSTRAINT "analytics_report_artifacts_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_reports" ADD CONSTRAINT "analytics_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_reports" ADD CONSTRAINT "analytics_reports_metric_snapshot_id_programme_metric_snapshots_id_fk" FOREIGN KEY ("metric_snapshot_id") REFERENCES "public"."programme_metric_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_reports" ADD CONSTRAINT "analytics_reports_baseline_id_workflow_baselines_id_fk" FOREIGN KEY ("baseline_id") REFERENCES "public"."workflow_baselines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_membership_events" ADD CONSTRAINT "programme_cohort_membership_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_membership_events" ADD CONSTRAINT "programme_cohort_membership_events_cohort_version_id_programme_cohort_versions_id_fk" FOREIGN KEY ("cohort_version_id") REFERENCES "public"."programme_cohort_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_membership_events" ADD CONSTRAINT "programme_cohort_membership_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_membership_events" ADD CONSTRAINT "programme_cohort_membership_events_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_membership_events" ADD CONSTRAINT "programme_cohort_membership_events_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_membership_events" ADD CONSTRAINT "programme_cohort_membership_events_supersedes_event_id_programme_cohort_membership_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."programme_cohort_membership_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_versions" ADD CONSTRAINT "programme_cohort_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_versions" ADD CONSTRAINT "programme_cohort_versions_cohort_id_programme_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."programme_cohorts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_versions" ADD CONSTRAINT "programme_cohort_versions_programme_version_id_funding_programme_versions_id_fk" FOREIGN KEY ("programme_version_id") REFERENCES "public"."funding_programme_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_versions" ADD CONSTRAINT "programme_cohort_versions_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohort_versions" ADD CONSTRAINT "programme_cohort_versions_supersedes_version_id_programme_cohort_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."programme_cohort_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohorts" ADD CONSTRAINT "programme_cohorts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_cohorts" ADD CONSTRAINT "programme_cohorts_funding_programme_id_funding_programmes_id_fk" FOREIGN KEY ("funding_programme_id") REFERENCES "public"."funding_programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_metric_snapshots" ADD CONSTRAINT "programme_metric_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_metric_snapshots" ADD CONSTRAINT "programme_metric_snapshots_cohort_version_id_programme_cohort_versions_id_fk" FOREIGN KEY ("cohort_version_id") REFERENCES "public"."programme_cohort_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programme_metric_snapshots" ADD CONSTRAINT "programme_metric_snapshots_policy_version_id_analytics_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."analytics_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_graph_events" ADD CONSTRAINT "recognition_graph_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_graph_events" ADD CONSTRAINT "recognition_graph_events_source_audit_event_id_audit_events_id_fk" FOREIGN KEY ("source_audit_event_id") REFERENCES "public"."audit_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_graph_events" ADD CONSTRAINT "recognition_graph_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_graph_events" ADD CONSTRAINT "recognition_graph_events_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_graph_events" ADD CONSTRAINT "recognition_graph_events_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_graph_events" ADD CONSTRAINT "recognition_graph_events_programme_version_id_funding_programme_versions_id_fk" FOREIGN KEY ("programme_version_id") REFERENCES "public"."funding_programme_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_graph_events" ADD CONSTRAINT "recognition_graph_events_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_baselines" ADD CONSTRAINT "workflow_baselines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_baselines" ADD CONSTRAINT "workflow_baselines_cohort_version_id_programme_cohort_versions_id_fk" FOREIGN KEY ("cohort_version_id") REFERENCES "public"."programme_cohort_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_policy_publications_org_version_unique" ON "analytics_policy_publications" USING btree ("organization_id","policy_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_policy_reviews_org_version_unique" ON "analytics_policy_reviews" USING btree ("organization_id","policy_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_policy_versions_org_number_unique" ON "analytics_policy_versions" USING btree ("organization_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_report_artifacts_org_report_format_unique" ON "analytics_report_artifacts" USING btree ("organization_id","report_id","format");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_reports_org_snapshot_type_unique" ON "analytics_reports" USING btree ("organization_id","metric_snapshot_id","report_type");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_cohort_versions_org_number_unique" ON "programme_cohort_versions" USING btree ("organization_id","cohort_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_cohorts_org_key_unique" ON "programme_cohorts" USING btree ("organization_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "recognition_graph_events_org_hash_unique" ON "recognition_graph_events" USING btree ("organization_id","event_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "recognition_graph_events_org_source_relation_unique" ON "recognition_graph_events" USING btree ("organization_id","source_audit_event_id","relationship","object_type","object_id");--> statement-breakpoint
CREATE INDEX "recognition_graph_events_org_property_time_idx" ON "recognition_graph_events" USING btree ("organization_id","property_id","occurred_at");
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_cohorts_programme_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohorts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('funding_programme_id', 'funding_programmes');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_cohort_versions_cohort_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohort_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('cohort_id', 'programme_cohorts');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_cohort_versions_programme_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohort_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('programme_version_id', 'funding_programme_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_cohort_versions_profile_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohort_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_cohort_versions_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohort_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'programme_cohort_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_membership_cohort_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohort_membership_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('cohort_version_id', 'programme_cohort_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_membership_property_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohort_membership_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_membership_case_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohort_membership_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."case_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_membership_project_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohort_membership_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."project_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_membership_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "programme_cohort_membership_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_event_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_event_id', 'programme_cohort_membership_events');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_policy_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "analytics_policy_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'analytics_policy_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_policy_reviews_version_tenant_guard" AFTER INSERT OR UPDATE ON "analytics_policy_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('policy_version_id', 'analytics_policy_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_policy_publications_version_tenant_guard" AFTER INSERT OR UPDATE ON "analytics_policy_publications" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('policy_version_id', 'analytics_policy_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_graph_audit_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_graph_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_audit_event_id', 'audit_events');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_graph_property_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_graph_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."property_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_graph_case_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_graph_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."case_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_graph_project_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_graph_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."project_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_graph_programme_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_graph_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."programme_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('programme_version_id', 'funding_programme_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_graph_submission_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_graph_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."submission_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "workflow_baselines_cohort_tenant_guard" AFTER INSERT OR UPDATE ON "workflow_baselines" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."cohort_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('cohort_version_id', 'programme_cohort_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_snapshots_cohort_tenant_guard" AFTER INSERT OR UPDATE ON "programme_metric_snapshots" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('cohort_version_id', 'programme_cohort_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_snapshots_policy_tenant_guard" AFTER INSERT OR UPDATE ON "programme_metric_snapshots" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('policy_version_id', 'analytics_policy_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_reports_snapshot_tenant_guard" AFTER INSERT OR UPDATE ON "analytics_reports" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('metric_snapshot_id', 'programme_metric_snapshots');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_reports_baseline_tenant_guard" AFTER INSERT OR UPDATE ON "analytics_reports" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."baseline_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('baseline_id', 'workflow_baselines');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_artifacts_report_tenant_guard" AFTER INSERT OR UPDATE ON "analytics_report_artifacts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('report_id', 'analytics_reports');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_artifacts_storage_tenant_guard" AFTER INSERT OR UPDATE ON "analytics_report_artifacts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_receipts_policy_tenant_guard" AFTER INSERT OR UPDATE ON "analytics_query_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('policy_version_id', 'analytics_policy_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_receipts_snapshot_tenant_guard" AFTER INSERT OR UPDATE ON "analytics_query_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('metric_snapshot_id', 'programme_metric_snapshots');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_programme_cohort_version_guard() RETURNS trigger AS $$
DECLARE programme record;
BEGIN
  SELECT p.programme_id, p.target_profile_version_id, p.property_classes INTO programme FROM funding_programme_versions p JOIN programme_cohorts c ON c.id = NEW.cohort_id AND c.organization_id = p.organization_id WHERE p.id = NEW.programme_version_id AND p.organization_id = NEW.organization_id AND c.funding_programme_id = p.programme_id;
  IF programme.programme_id IS NULL THEN RAISE EXCEPTION 'cohort version must pin a programme version owned by its cohort programme'; END IF;
  IF programme.target_profile_version_id IS NOT NULL AND programme.target_profile_version_id <> NEW.profile_version_id THEN RAISE EXCEPTION 'cohort version must preserve the exact programme target-profile pin'; END IF;
  IF NOT (programme.property_classes ? NEW.property_class) THEN RAISE EXCEPTION 'cohort property class is outside the published programme scope'; END IF;
  IF NOT EXISTS(SELECT 1 FROM funding_programme_publications WHERE programme_version_id = NEW.programme_version_id AND organization_id = NEW.organization_id AND decision = 'published') OR NOT EXISTS(SELECT 1 FROM target_profile_publications WHERE profile_version_id = NEW.profile_version_id AND organization_id = NEW.organization_id AND decision = 'published') THEN RAISE EXCEPTION 'cohort activation requires exact published programme and profile versions'; END IF;
  IF NEW.version_number > 1 AND NOT EXISTS(SELECT 1 FROM programme_cohort_versions p WHERE p.id = NEW.supersedes_version_id AND p.organization_id = NEW.organization_id AND p.cohort_id = NEW.cohort_id AND p.version_number = NEW.version_number - 1) THEN RAISE EXCEPTION 'cohort successor must preserve immediate version lineage'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_cohort_versions_integrity_guard" AFTER INSERT OR UPDATE ON "programme_cohort_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_programme_cohort_version_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_programme_membership_guard() RETURNS trigger AS $$
DECLARE case_property text; project_property text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM programme_cohort_versions WHERE id = NEW.cohort_version_id AND organization_id = NEW.organization_id AND state = 'active') THEN RAISE EXCEPTION 'membership event requires an active cohort version'; END IF;
  IF NEW.case_id IS NOT NULL THEN SELECT p.property_id INTO case_property FROM renewal_cases c JOIN policies p ON p.id = c.policy_id AND p.organization_id = c.organization_id WHERE c.id = NEW.case_id AND c.organization_id = NEW.organization_id; IF case_property IS DISTINCT FROM NEW.property_id THEN RAISE EXCEPTION 'membership case and property must align'; END IF; END IF;
  IF NEW.project_id IS NOT NULL THEN SELECT property_id INTO project_property FROM resilience_projects WHERE id = NEW.project_id AND organization_id = NEW.organization_id; IF project_property IS DISTINCT FROM NEW.property_id THEN RAISE EXCEPTION 'membership project and property must align'; END IF; END IF;
  IF NEW.supersedes_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM programme_cohort_membership_events e WHERE e.id = NEW.supersedes_event_id AND e.organization_id = NEW.organization_id AND e.cohort_version_id = NEW.cohort_version_id AND e.property_id = NEW.property_id) THEN RAISE EXCEPTION 'corrected membership must preserve cohort and property lineage'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_membership_integrity_guard" AFTER INSERT OR UPDATE ON "programme_cohort_membership_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_programme_membership_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_analytics_policy_lineage_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.version_number = 1 AND NEW.supersedes_version_id IS NOT NULL THEN RAISE EXCEPTION 'first analytics policy version cannot supersede another version'; END IF;
  IF NEW.version_number > 1 AND NOT EXISTS(SELECT 1 FROM analytics_policy_versions p WHERE p.id = NEW.supersedes_version_id AND p.organization_id = NEW.organization_id AND p.version_number = NEW.version_number - 1) THEN RAISE EXCEPTION 'analytics policy successor must preserve immediate version lineage'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "analytics_policy_lineage_guard" BEFORE INSERT ON "analytics_policy_versions" FOR EACH ROW EXECUTE FUNCTION fortify_analytics_policy_lineage_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_analytics_policy_review_guard() RETURNS trigger AS $$
DECLARE author text;
BEGIN
  SELECT author_subject INTO author FROM analytics_policy_versions WHERE id = NEW.policy_version_id AND organization_id = NEW.organization_id;
  IF author IS NULL OR author = NEW.reviewer_subject THEN RAISE EXCEPTION 'analytics policy author and reviewer must be different humans'; END IF;
  IF NEW.decision = 'approved' AND (NEW.rights_checked IS NOT TRUE OR NEW.privacy_checked IS NOT TRUE) THEN RAISE EXCEPTION 'analytics policy approval requires rights and privacy checks'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_policy_reviews_integrity_guard" AFTER INSERT OR UPDATE ON "analytics_policy_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_analytics_policy_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_analytics_policy_publication_guard() RETURNS trigger AS $$
DECLARE version_author text; reviewer text;
BEGIN
  SELECT v.author_subject, r.reviewer_subject INTO version_author, reviewer FROM analytics_policy_versions v JOIN analytics_policy_reviews r ON r.policy_version_id = v.id AND r.organization_id = v.organization_id WHERE v.id = NEW.policy_version_id AND v.organization_id = NEW.organization_id AND r.decision = 'approved' AND r.rights_checked IS TRUE AND r.privacy_checked IS TRUE;
  IF reviewer IS NULL OR NEW.publisher_subject IN (version_author, reviewer) THEN RAISE EXCEPTION 'analytics publication requires approved review and three-way human separation'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_policy_publications_integrity_guard" AFTER INSERT OR UPDATE ON "analytics_policy_publications" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_analytics_policy_publication_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_recognition_graph_guard() RETURNS trigger AS $$
DECLARE audit record; case_property text; project_property text; submission_case text;
BEGIN
  SELECT resource_type, resource_id INTO audit FROM audit_events WHERE id = NEW.source_audit_event_id AND organization_id = NEW.organization_id;
  IF audit.resource_id IS NULL OR audit.resource_type <> NEW.subject_type OR audit.resource_id <> NEW.subject_id THEN RAISE EXCEPTION 'recognition graph subject must match its exact audit event'; END IF;
  IF NEW.case_id IS NOT NULL THEN SELECT p.property_id INTO case_property FROM renewal_cases c JOIN policies p ON p.id = c.policy_id AND p.organization_id = c.organization_id WHERE c.id = NEW.case_id AND c.organization_id = NEW.organization_id; IF NEW.property_id IS NOT NULL AND case_property IS DISTINCT FROM NEW.property_id THEN RAISE EXCEPTION 'recognition graph case and property must align'; END IF; END IF;
  IF NEW.project_id IS NOT NULL THEN SELECT property_id INTO project_property FROM resilience_projects WHERE id = NEW.project_id AND organization_id = NEW.organization_id; IF NEW.property_id IS NOT NULL AND project_property IS DISTINCT FROM NEW.property_id THEN RAISE EXCEPTION 'recognition graph project and property must align'; END IF; END IF;
  IF NEW.case_id IS NOT NULL AND NEW.project_id IS NOT NULL AND case_property IS DISTINCT FROM project_property THEN RAISE EXCEPTION 'recognition graph case and project must resolve to the same property'; END IF;
  IF NEW.submission_version_id IS NOT NULL AND NEW.case_id IS NOT NULL THEN SELECT s.case_id INTO submission_case FROM submission_versions v JOIN submissions s ON s.id = v.submission_id AND s.organization_id = v.organization_id WHERE v.id = NEW.submission_version_id AND v.organization_id = NEW.organization_id; IF submission_case IS DISTINCT FROM NEW.case_id THEN RAISE EXCEPTION 'recognition graph submission and case must align'; END IF; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_graph_integrity_guard" AFTER INSERT OR UPDATE ON "recognition_graph_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_graph_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_programme_snapshot_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.analytics_scope <> 'tenant_only' THEN RAISE EXCEPTION 'cross-customer analytics are disabled without separate execution authority'; END IF;
  IF NOT EXISTS(SELECT 1 FROM programme_cohort_versions WHERE id = NEW.cohort_version_id AND organization_id = NEW.organization_id AND state = 'active') THEN RAISE EXCEPTION 'metric snapshot requires active cohort version'; END IF;
  IF NOT EXISTS(SELECT 1 FROM analytics_policy_versions v JOIN analytics_policy_publications p ON p.policy_version_id = v.id AND p.organization_id = v.organization_id WHERE v.id = NEW.policy_version_id AND v.organization_id = NEW.organization_id AND v.status = 'published' AND v.mode = 'tenant_only' AND p.decision = 'published') THEN RAISE EXCEPTION 'metric snapshot requires published tenant-only analytics policy'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "programme_snapshots_integrity_guard" AFTER INSERT OR UPDATE ON "programme_metric_snapshots" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_programme_snapshot_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_analytics_report_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM programme_metric_snapshots WHERE id = NEW.metric_snapshot_id AND organization_id = NEW.organization_id AND analytics_scope = 'tenant_only') THEN RAISE EXCEPTION 'analytics report requires tenant-only metric snapshot'; END IF;
  IF NEW.report_type = 'brokerage_roi' AND (NEW.baseline_id IS NULL OR NOT EXISTS(SELECT 1 FROM workflow_baselines WHERE id = NEW.baseline_id AND organization_id = NEW.organization_id AND human_confirmed IS TRUE)) THEN RAISE EXCEPTION 'brokerage ROI report requires human-confirmed baseline'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_reports_integrity_guard" AFTER INSERT OR UPDATE ON "analytics_reports" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_analytics_report_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_analytics_artifact_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM storage_objects s WHERE s.id = NEW.storage_object_id AND s.organization_id = NEW.organization_id AND s.state = 'clean' AND s.scan_status = 'clean' AND s.sha256 = NEW.sha256 AND s.size_bytes = NEW.size_bytes AND s.mime_type = NEW.mime_type) THEN RAISE EXCEPTION 'analytics artifact must bind exact clean stored bytes'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_artifacts_integrity_guard" AFTER INSERT OR UPDATE ON "analytics_report_artifacts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_analytics_artifact_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_analytics_receipt_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.requested_scope <> 'tenant_only' OR NEW.distinct_tenant_count <> 1 THEN RAISE EXCEPTION 'analytics query receipt cannot claim unexecuted cross-customer authority'; END IF;
  IF NOT EXISTS(SELECT 1 FROM programme_metric_snapshots s WHERE s.id = NEW.metric_snapshot_id AND s.organization_id = NEW.organization_id AND s.policy_version_id = NEW.policy_version_id AND s.analytics_scope = NEW.requested_scope) THEN RAISE EXCEPTION 'analytics receipt must bind its exact policy and snapshot'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "analytics_receipts_integrity_guard" AFTER INSERT OR UPDATE ON "analytics_query_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_analytics_receipt_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_restrict_analytics_policy_update() RETURNS trigger AS $$
BEGIN
  IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id OR OLD.version_number <> NEW.version_number OR OLD.mode <> NEW.mode OR OLD.contract_reference IS DISTINCT FROM NEW.contract_reference OR OLD.minimum_cohort_size <> NEW.minimum_cohort_size OR OLD.deidentification_method <> NEW.deidentification_method OR OLD.suppression_threshold <> NEW.suppression_threshold OR OLD.allowed_metric_families <> NEW.allowed_metric_families OR OLD.retention_days <> NEW.retention_days OR OLD.deletion_treatment <> NEW.deletion_treatment OR OLD.opt_in_confirmed <> NEW.opt_in_confirmed OR OLD.author_subject <> NEW.author_subject OR OLD.effective_from <> NEW.effective_from OR OLD.effective_to IS DISTINCT FROM NEW.effective_to OR OLD.supersedes_version_id IS DISTINCT FROM NEW.supersedes_version_id THEN RAISE EXCEPTION 'analytics policy substance and version lineage are immutable'; END IF;
  IF NOT ((OLD.status = 'draft' AND NEW.status IN ('draft', 'reviewed')) OR (OLD.status = 'reviewed' AND NEW.status IN ('published', 'withdrawn')) OR OLD.status = NEW.status) THEN RAISE EXCEPTION 'invalid analytics policy lifecycle transition'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "analytics_policy_versions_restricted_update" BEFORE UPDATE ON "analytics_policy_versions" FOR EACH ROW EXECUTE FUNCTION fortify_restrict_analytics_policy_update();
--> statement-breakpoint
CREATE TRIGGER "analytics_policy_versions_immutable_delete" BEFORE DELETE ON "analytics_policy_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "programme_cohorts_immutable_update" BEFORE UPDATE ON "programme_cohorts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "programme_cohorts_immutable_delete" BEFORE DELETE ON "programme_cohorts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "programme_cohort_versions_immutable_update" BEFORE UPDATE ON "programme_cohort_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "programme_cohort_versions_immutable_delete" BEFORE DELETE ON "programme_cohort_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "programme_membership_immutable_update" BEFORE UPDATE ON "programme_cohort_membership_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "programme_membership_immutable_delete" BEFORE DELETE ON "programme_cohort_membership_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_policy_reviews_immutable_update" BEFORE UPDATE ON "analytics_policy_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_policy_reviews_immutable_delete" BEFORE DELETE ON "analytics_policy_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_policy_publications_immutable_update" BEFORE UPDATE ON "analytics_policy_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_policy_publications_immutable_delete" BEFORE DELETE ON "analytics_policy_publications" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "recognition_graph_immutable_update" BEFORE UPDATE ON "recognition_graph_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "recognition_graph_immutable_delete" BEFORE DELETE ON "recognition_graph_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "workflow_baselines_immutable_update" BEFORE UPDATE ON "workflow_baselines" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "workflow_baselines_immutable_delete" BEFORE DELETE ON "workflow_baselines" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "programme_snapshots_immutable_update" BEFORE UPDATE ON "programme_metric_snapshots" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "programme_snapshots_immutable_delete" BEFORE DELETE ON "programme_metric_snapshots" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_reports_immutable_update" BEFORE UPDATE ON "analytics_reports" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_reports_immutable_delete" BEFORE DELETE ON "analytics_reports" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_artifacts_immutable_update" BEFORE UPDATE ON "analytics_report_artifacts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_artifacts_immutable_delete" BEFORE DELETE ON "analytics_report_artifacts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_receipts_immutable_update" BEFORE UPDATE ON "analytics_query_receipts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "analytics_receipts_immutable_delete" BEFORE DELETE ON "analytics_query_receipts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
