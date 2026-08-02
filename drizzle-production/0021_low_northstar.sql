CREATE TABLE "delivery_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"delivery_id" text NOT NULL,
	"storage_object_id" text NOT NULL,
	"receipt_type" text NOT NULL,
	"receipt_hash" text NOT NULL,
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "delivery_receipts_type_check" CHECK ("delivery_receipts"."receipt_type" in ('provider_acknowledgement', 'review_link_created', 'manual_custody', 'recipient_acknowledgement')),
	CONSTRAINT "delivery_receipts_hash_check" CHECK (char_length("delivery_receipts"."receipt_hash") = 64),
	CONSTRAINT "delivery_receipts_confirmed_check" CHECK ("delivery_receipts"."human_confirmed" = true),
	CONSTRAINT "delivery_receipts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "evidence_acceptance_events" (
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
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"original_language" text NOT NULL,
	"normalized_reason" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"evidence_version_id" text NOT NULL,
	"disposition" text NOT NULL,
	"supersedes_event_id" text,
	CONSTRAINT "evidence_acceptance_events_disposition_check" CHECK ("evidence_acceptance_events"."disposition" in ('accepted', 'partially_accepted', 'clarification_required', 'rejected', 'stale', 'wrong_scope', 'unsupported_source', 'unverifiable', 'not_applicable')),
	CONSTRAINT "evidence_acceptance_events_confirmed_check" CHECK ("evidence_acceptance_events"."human_confirmed" = true),
	CONSTRAINT "evidence_acceptance_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "funding_response_events" (
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
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"original_language" text NOT NULL,
	"normalized_reason" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"disposition" text NOT NULL,
	"supersedes_event_id" text,
	CONSTRAINT "funding_response_events_disposition_check" CHECK ("funding_response_events"."disposition" in ('approved', 'conditionally_approved', 'milestone_approved', 'milestone_rejected', 'disbursement_exported', 'programme_ineligible')),
	CONSTRAINT "funding_response_events_confirmed_check" CHECK ("funding_response_events"."human_confirmed" = true),
	CONSTRAINT "funding_response_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "maintenance_roll_forwards" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_case_id" text NOT NULL,
	"target_case_id" text NOT NULL,
	"maintenance_obligation_id" text NOT NULL,
	"evidence_version_id" text,
	"status" text NOT NULL,
	"basis" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"reviewed_by" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "maintenance_roll_forwards_distinct_cases_check" CHECK ("maintenance_roll_forwards"."source_case_id" <> "maintenance_roll_forwards"."target_case_id"),
	CONSTRAINT "maintenance_roll_forwards_status_check" CHECK ("maintenance_roll_forwards"."status" in ('carried_forward', 'expired', 'review_required', 'not_applicable')),
	CONSTRAINT "maintenance_roll_forwards_confirmed_check" CHECK ("maintenance_roll_forwards"."human_confirmed" = true),
	CONSTRAINT "maintenance_roll_forwards_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "model_response_events" (
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
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"original_language" text NOT NULL,
	"normalized_reason" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"mapping_id" text NOT NULL,
	"disposition" text NOT NULL,
	"accepted_value" jsonb,
	"supersedes_event_id" text,
	CONSTRAINT "model_response_events_disposition_check" CHECK ("model_response_events"."disposition" in ('input_accepted', 'input_modified', 'mapping_rejected', 'model_does_not_represent_intervention', 'model_version_changed', 'no_response')),
	CONSTRAINT "model_response_events_value_check" CHECK (("model_response_events"."disposition" in ('input_accepted', 'input_modified') and "model_response_events"."accepted_value" is not null) or ("model_response_events"."disposition" not in ('input_accepted', 'input_modified') and "model_response_events"."accepted_value" is null)),
	CONSTRAINT "model_response_events_confirmed_check" CHECK ("model_response_events"."human_confirmed" = true),
	CONSTRAINT "model_response_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "placement_response_events" (
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
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"original_language" text NOT NULL,
	"normalized_reason" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"disposition" text NOT NULL,
	"term_snapshot" jsonb,
	"supersedes_event_id" text,
	CONSTRAINT "placement_response_events_disposition_check" CHECK ("placement_response_events"."disposition" in ('quote', 'revised_quote', 'bind', 'renewal', 'no_quote', 'withdrawn', 'fair_plan_transition', 'voluntary_market_transition', 'lost_to_another_option')),
	CONSTRAINT "placement_response_events_confirmed_check" CHECK ("placement_response_events"."human_confirmed" = true),
	CONSTRAINT "placement_response_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "rating_treatment_events" (
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
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"original_language" text NOT NULL,
	"normalized_reason" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"disposition" text NOT NULL,
	"governed_source_version_id" text,
	"supersedes_event_id" text,
	CONSTRAINT "rating_treatment_events_disposition_check" CHECK ("rating_treatment_events"."disposition" in ('filed_discount_applied', 'factor_changed', 'discount_not_applicable', 'filing_does_not_recognise_intervention', 'insufficient_evidence', 'unknown')),
	CONSTRAINT "rating_treatment_events_source_check" CHECK ("rating_treatment_events"."disposition" not in ('filed_discount_applied', 'factor_changed') or "rating_treatment_events"."governed_source_version_id" is not null),
	CONSTRAINT "rating_treatment_events_confirmed_check" CHECK ("rating_treatment_events"."human_confirmed" = true),
	CONSTRAINT "rating_treatment_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "recognition_case_closure_events" (
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
	"submission_version_id" text NOT NULL,
	"closure_status" text NOT NULL,
	"unresolved_caveats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"decided_by" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"supersedes_event_id" text,
	CONSTRAINT "recognition_case_closure_events_status_check" CHECK ("recognition_case_closure_events"."closure_status" in ('closed', 'closed_outcome_pending', 'reopened', 'corrected')),
	CONSTRAINT "recognition_case_closure_events_confirmed_check" CHECK ("recognition_case_closure_events"."human_confirmed" = true),
	CONSTRAINT "recognition_case_closure_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "recognition_submission_bindings" (
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
	"playbook_version_id" text NOT NULL,
	"profile_version_id" text NOT NULL,
	"commitment_version_id" text,
	"requested_action" text NOT NULL,
	"destination_label" text NOT NULL,
	"delivery_method" text NOT NULL,
	"readiness_status" text NOT NULL,
	"blocker_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"caveat_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prepared_by" text NOT NULL,
	"prepared_at" timestamp with time zone NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "recognition_submission_bindings_delivery_check" CHECK ("recognition_submission_bindings"."delivery_method" in ('secure_review_link', 'encrypted_email', 'manual_export', 'provider_api')),
	CONSTRAINT "recognition_submission_bindings_readiness_check" CHECK ("recognition_submission_bindings"."readiness_status" in ('ready_for_human_confirmation', 'ready_with_caveats', 'blocked')),
	CONSTRAINT "recognition_submission_bindings_confirmed_check" CHECK ("recognition_submission_bindings"."human_confirmed" = true),
	CONSTRAINT "recognition_submission_bindings_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "recognition_submission_mappings" (
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
	"mapping_id" text NOT NULL,
	"state_at_submission" text NOT NULL,
	"accepted_value_snapshot" jsonb,
	CONSTRAINT "recognition_submission_mappings_state_check" CHECK ("recognition_submission_mappings"."state_at_submission" in ('submitted', 'accepted_by_model_market', 'accepted_with_modification', 'rejected', 'unsupported', 'expired')),
	CONSTRAINT "recognition_submission_mappings_value_check" CHECK (("recognition_submission_mappings"."state_at_submission" in ('accepted_by_model_market', 'accepted_with_modification') and "recognition_submission_mappings"."accepted_value_snapshot" is not null) or ("recognition_submission_mappings"."state_at_submission" not in ('accepted_by_model_market', 'accepted_with_modification') and "recognition_submission_mappings"."accepted_value_snapshot" is null)),
	CONSTRAINT "recognition_submission_mappings_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "reviewer_request_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"reviewer_request_id" text NOT NULL,
	"original_language" text NOT NULL,
	"evidence_version_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"responded_by" text NOT NULL,
	"responded_at" timestamp with time zone NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "reviewer_request_responses_confirmed_check" CHECK ("reviewer_request_responses"."human_confirmed" = true),
	CONSTRAINT "reviewer_request_responses_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "reviewer_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"reviewer_session_id" text NOT NULL,
	"submission_version_id" text NOT NULL,
	"request_type" text NOT NULL,
	"original_language" text NOT NULL,
	"normalized_reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"requested_by" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"supersedes_request_id" text,
	CONSTRAINT "reviewer_requests_type_check" CHECK ("reviewer_requests"."request_type" in ('clarification', 'additional_evidence', 'correction')),
	CONSTRAINT "reviewer_requests_reason_check" CHECK ("reviewer_requests"."normalized_reason" in ('scope_clarification', 'freshness_clarification', 'source_clarification', 'verifier_clarification', 'model_mapping_clarification', 'missing_evidence', 'record_correction')),
	CONSTRAINT "reviewer_requests_status_check" CHECK ("reviewer_requests"."status" in ('open', 'responded', 'closed', 'superseded')),
	CONSTRAINT "reviewer_requests_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "reviewer_sessions" (
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
	"external_principal_id" text NOT NULL,
	"external_access_grant_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"allowed_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"download_allowed" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"opened_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	CONSTRAINT "reviewer_sessions_hash_check" CHECK (char_length("reviewer_sessions"."token_hash") = 64),
	CONSTRAINT "reviewer_sessions_status_check" CHECK ("reviewer_sessions"."status" in ('active', 'completed', 'revoked', 'expired')),
	CONSTRAINT "reviewer_sessions_revocation_check" CHECK (("reviewer_sessions"."status" = 'revoked' and "reviewer_sessions"."revoked_at" is not null and "reviewer_sessions"."revocation_reason" is not null) or "reviewer_sessions"."status" <> 'revoked'),
	CONSTRAINT "reviewer_sessions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "submission_deliveries" (
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
	"attempt_number" integer NOT NULL,
	"delivery_method" text NOT NULL,
	"destination" text NOT NULL,
	"provider_key" text NOT NULL,
	"status" text NOT NULL,
	"provider_reference" text,
	"failure_code" text,
	"delivered_by" text NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	"delivered_at" timestamp with time zone,
	"request_hash" text NOT NULL,
	"supersedes_delivery_id" text,
	CONSTRAINT "submission_deliveries_attempt_check" CHECK ("submission_deliveries"."attempt_number" >= 1),
	CONSTRAINT "submission_deliveries_method_check" CHECK ("submission_deliveries"."delivery_method" in ('secure_review_link', 'encrypted_email', 'manual_export', 'provider_api')),
	CONSTRAINT "submission_deliveries_status_check" CHECK ("submission_deliveries"."status" in ('delivered', 'failed')),
	CONSTRAINT "submission_deliveries_hash_check" CHECK (char_length("submission_deliveries"."request_hash") = 64),
	CONSTRAINT "submission_deliveries_result_check" CHECK (("submission_deliveries"."status" = 'delivered' and "submission_deliveries"."provider_reference" is not null and "submission_deliveries"."delivered_at" is not null and "submission_deliveries"."failure_code" is null) or ("submission_deliveries"."status" = 'failed' and "submission_deliveries"."failure_code" is not null and "submission_deliveries"."delivered_at" is null)),
	CONSTRAINT "submission_deliveries_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "underwriting_treatment_events" (
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
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"original_language" text NOT NULL,
	"normalized_reason" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"disposition" text NOT NULL,
	"supersedes_event_id" text,
	CONSTRAINT "underwriting_treatment_events_disposition_check" CHECK ("underwriting_treatment_events"."disposition" in ('classification_changed', 'reconsideration_opened', 'terms_changed', 'capacity_offered', 'referred', 'no_change', 'declined', 'nonrenewed', 'quote_review_initiated')),
	CONSTRAINT "underwriting_treatment_events_confirmed_check" CHECK ("underwriting_treatment_events"."human_confirmed" = true),
	CONSTRAINT "underwriting_treatment_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "delivery_receipts" ADD CONSTRAINT "delivery_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_receipts" ADD CONSTRAINT "delivery_receipts_delivery_id_submission_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."submission_deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_receipts" ADD CONSTRAINT "delivery_receipts_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_acceptance_events" ADD CONSTRAINT "evidence_acceptance_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_acceptance_events" ADD CONSTRAINT "evidence_acceptance_events_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_acceptance_events" ADD CONSTRAINT "evidence_acceptance_events_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_acceptance_events" ADD CONSTRAINT "evidence_acceptance_events_supersedes_event_id_evidence_acceptance_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."evidence_acceptance_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_response_events" ADD CONSTRAINT "funding_response_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_response_events" ADD CONSTRAINT "funding_response_events_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_response_events" ADD CONSTRAINT "funding_response_events_supersedes_event_id_funding_response_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."funding_response_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_roll_forwards" ADD CONSTRAINT "maintenance_roll_forwards_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_roll_forwards" ADD CONSTRAINT "maintenance_roll_forwards_source_case_id_renewal_cases_id_fk" FOREIGN KEY ("source_case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_roll_forwards" ADD CONSTRAINT "maintenance_roll_forwards_target_case_id_renewal_cases_id_fk" FOREIGN KEY ("target_case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_roll_forwards" ADD CONSTRAINT "maintenance_roll_forwards_maintenance_obligation_id_maintenance_obligations_id_fk" FOREIGN KEY ("maintenance_obligation_id") REFERENCES "public"."maintenance_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_roll_forwards" ADD CONSTRAINT "maintenance_roll_forwards_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_response_events" ADD CONSTRAINT "model_response_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_response_events" ADD CONSTRAINT "model_response_events_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_response_events" ADD CONSTRAINT "model_response_events_mapping_id_model_input_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."model_input_mappings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_response_events" ADD CONSTRAINT "model_response_events_supersedes_event_id_model_response_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."model_response_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_response_events" ADD CONSTRAINT "placement_response_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_response_events" ADD CONSTRAINT "placement_response_events_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_response_events" ADD CONSTRAINT "placement_response_events_supersedes_event_id_placement_response_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."placement_response_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_treatment_events" ADD CONSTRAINT "rating_treatment_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_treatment_events" ADD CONSTRAINT "rating_treatment_events_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_treatment_events" ADD CONSTRAINT "rating_treatment_events_governed_source_version_id_governed_source_versions_id_fk" FOREIGN KEY ("governed_source_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_treatment_events" ADD CONSTRAINT "rating_treatment_events_supersedes_event_id_rating_treatment_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."rating_treatment_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_case_closure_events" ADD CONSTRAINT "recognition_case_closure_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_case_closure_events" ADD CONSTRAINT "recognition_case_closure_events_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_case_closure_events" ADD CONSTRAINT "recognition_case_closure_events_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_case_closure_events" ADD CONSTRAINT "recognition_case_closure_events_supersedes_event_id_recognition_case_closure_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."recognition_case_closure_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_submission_bindings" ADD CONSTRAINT "recognition_submission_bindings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_submission_bindings" ADD CONSTRAINT "recognition_submission_bindings_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_submission_bindings" ADD CONSTRAINT "recognition_submission_bindings_playbook_version_id_playbook_versions_id_fk" FOREIGN KEY ("playbook_version_id") REFERENCES "public"."playbook_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_submission_bindings" ADD CONSTRAINT "recognition_submission_bindings_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_submission_bindings" ADD CONSTRAINT "recognition_submission_bindings_commitment_version_id_market_commitment_versions_id_fk" FOREIGN KEY ("commitment_version_id") REFERENCES "public"."market_commitment_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_submission_mappings" ADD CONSTRAINT "recognition_submission_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_submission_mappings" ADD CONSTRAINT "recognition_submission_mappings_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_submission_mappings" ADD CONSTRAINT "recognition_submission_mappings_mapping_id_model_input_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."model_input_mappings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_request_responses" ADD CONSTRAINT "reviewer_request_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_request_responses" ADD CONSTRAINT "reviewer_request_responses_reviewer_request_id_reviewer_requests_id_fk" FOREIGN KEY ("reviewer_request_id") REFERENCES "public"."reviewer_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_requests" ADD CONSTRAINT "reviewer_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_requests" ADD CONSTRAINT "reviewer_requests_reviewer_session_id_reviewer_sessions_id_fk" FOREIGN KEY ("reviewer_session_id") REFERENCES "public"."reviewer_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_requests" ADD CONSTRAINT "reviewer_requests_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_requests" ADD CONSTRAINT "reviewer_requests_supersedes_request_id_reviewer_requests_id_fk" FOREIGN KEY ("supersedes_request_id") REFERENCES "public"."reviewer_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_sessions" ADD CONSTRAINT "reviewer_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_sessions" ADD CONSTRAINT "reviewer_sessions_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_sessions" ADD CONSTRAINT "reviewer_sessions_external_principal_id_external_principals_id_fk" FOREIGN KEY ("external_principal_id") REFERENCES "public"."external_principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_sessions" ADD CONSTRAINT "reviewer_sessions_external_access_grant_id_external_access_grants_id_fk" FOREIGN KEY ("external_access_grant_id") REFERENCES "public"."external_access_grants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_deliveries" ADD CONSTRAINT "submission_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_deliveries" ADD CONSTRAINT "submission_deliveries_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_deliveries" ADD CONSTRAINT "submission_deliveries_supersedes_delivery_id_submission_deliveries_id_fk" FOREIGN KEY ("supersedes_delivery_id") REFERENCES "public"."submission_deliveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_treatment_events" ADD CONSTRAINT "underwriting_treatment_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_treatment_events" ADD CONSTRAINT "underwriting_treatment_events_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "underwriting_treatment_events" ADD CONSTRAINT "underwriting_treatment_events_supersedes_event_id_underwriting_treatment_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."underwriting_treatment_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_receipts_org_delivery_hash_unique" ON "delivery_receipts" USING btree ("organization_id","delivery_id","receipt_hash");--> statement-breakpoint
CREATE INDEX "evidence_acceptance_events_org_submission_idx" ON "evidence_acceptance_events" USING btree ("organization_id","submission_version_id","recorded_at");--> statement-breakpoint
CREATE INDEX "funding_response_events_org_submission_idx" ON "funding_response_events" USING btree ("organization_id","submission_version_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_roll_forwards_org_target_obligation_unique" ON "maintenance_roll_forwards" USING btree ("organization_id","target_case_id","maintenance_obligation_id");--> statement-breakpoint
CREATE INDEX "model_response_events_org_submission_idx" ON "model_response_events" USING btree ("organization_id","submission_version_id","recorded_at");--> statement-breakpoint
CREATE INDEX "placement_response_events_org_submission_idx" ON "placement_response_events" USING btree ("organization_id","submission_version_id","recorded_at");--> statement-breakpoint
CREATE INDEX "rating_treatment_events_org_submission_idx" ON "rating_treatment_events" USING btree ("organization_id","submission_version_id","recorded_at");--> statement-breakpoint
CREATE INDEX "recognition_case_closure_events_org_case_idx" ON "recognition_case_closure_events" USING btree ("organization_id","case_id","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recognition_submission_bindings_org_version_unique" ON "recognition_submission_bindings" USING btree ("organization_id","submission_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recognition_submission_mappings_org_pair_unique" ON "recognition_submission_mappings" USING btree ("organization_id","submission_version_id","mapping_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviewer_request_responses_org_request_unique" ON "reviewer_request_responses" USING btree ("organization_id","reviewer_request_id");--> statement-breakpoint
CREATE INDEX "reviewer_requests_org_session_idx" ON "reviewer_requests" USING btree ("organization_id","reviewer_session_id","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviewer_sessions_token_unique" ON "reviewer_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "reviewer_sessions_org_submission_idx" ON "reviewer_sessions" USING btree ("organization_id","submission_version_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_deliveries_org_version_attempt_unique" ON "submission_deliveries" USING btree ("organization_id","submission_version_id","attempt_number");--> statement-breakpoint
CREATE INDEX "underwriting_treatment_events_org_submission_idx" ON "underwriting_treatment_events" USING btree ("organization_id","submission_version_id","recorded_at");
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_bindings_submission_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_submission_bindings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_bindings_playbook_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_submission_bindings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('playbook_version_id', 'playbook_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_bindings_profile_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_submission_bindings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_bindings_commitment_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_submission_bindings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."commitment_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('commitment_version_id', 'market_commitment_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_mappings_submission_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_submission_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_mappings_mapping_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_submission_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('mapping_id', 'model_input_mappings');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "submission_deliveries_version_tenant_guard" AFTER INSERT OR UPDATE ON "submission_deliveries" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "submission_deliveries_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "submission_deliveries" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_delivery_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_delivery_id', 'submission_deliveries');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "delivery_receipts_delivery_tenant_guard" AFTER INSERT OR UPDATE ON "delivery_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('delivery_id', 'submission_deliveries');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "delivery_receipts_storage_tenant_guard" AFTER INSERT OR UPDATE ON "delivery_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_sessions_version_tenant_guard" AFTER INSERT OR UPDATE ON "reviewer_sessions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_sessions_principal_tenant_guard" AFTER INSERT OR UPDATE ON "reviewer_sessions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('external_principal_id', 'external_principals');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_sessions_grant_tenant_guard" AFTER INSERT OR UPDATE ON "reviewer_sessions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('external_access_grant_id', 'external_access_grants');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_requests_session_tenant_guard" AFTER INSERT OR UPDATE ON "reviewer_requests" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('reviewer_session_id', 'reviewer_sessions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_requests_version_tenant_guard" AFTER INSERT OR UPDATE ON "reviewer_requests" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_requests_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "reviewer_requests" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_request_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_request_id', 'reviewer_requests');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_responses_request_tenant_guard" AFTER INSERT OR UPDATE ON "reviewer_request_responses" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('reviewer_request_id', 'reviewer_requests');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "evidence_acceptance_submission_tenant_guard" AFTER INSERT OR UPDATE ON "evidence_acceptance_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "evidence_acceptance_evidence_tenant_guard" AFTER INSERT OR UPDATE ON "evidence_acceptance_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "evidence_acceptance_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "evidence_acceptance_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_event_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_event_id', 'evidence_acceptance_events');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_responses_submission_tenant_guard" AFTER INSERT OR UPDATE ON "model_response_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_responses_mapping_tenant_guard" AFTER INSERT OR UPDATE ON "model_response_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('mapping_id', 'model_input_mappings');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_responses_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "model_response_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_event_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_event_id', 'model_response_events');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "rating_responses_submission_tenant_guard" AFTER INSERT OR UPDATE ON "rating_treatment_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "rating_responses_source_tenant_guard" AFTER INSERT OR UPDATE ON "rating_treatment_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."governed_source_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('governed_source_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "underwriting_responses_submission_tenant_guard" AFTER INSERT OR UPDATE ON "underwriting_treatment_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "placement_responses_submission_tenant_guard" AFTER INSERT OR UPDATE ON "placement_response_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_responses_submission_tenant_guard" AFTER INSERT OR UPDATE ON "funding_response_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_closures_case_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_case_closure_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_closures_version_tenant_guard" AFTER INSERT OR UPDATE ON "recognition_case_closure_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "maintenance_roll_forward_source_tenant_guard" AFTER INSERT OR UPDATE ON "maintenance_roll_forwards" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_case_id', 'renewal_cases');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "maintenance_roll_forward_target_tenant_guard" AFTER INSERT OR UPDATE ON "maintenance_roll_forwards" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('target_case_id', 'renewal_cases');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "maintenance_roll_forward_obligation_tenant_guard" AFTER INSERT OR UPDATE ON "maintenance_roll_forwards" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('maintenance_obligation_id', 'maintenance_obligations');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "maintenance_roll_forward_evidence_tenant_guard" AFTER INSERT OR UPDATE ON "maintenance_roll_forwards" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."evidence_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_recognition_binding_guard() RETURNS trigger AS $$
DECLARE submission_case text; submission_market text; submission_status text; profile_status text;
BEGIN
  SELECT s.case_id, s.market_id, v.status INTO submission_case, submission_market, submission_status FROM submission_versions v JOIN submissions s ON s.id = v.submission_id AND s.organization_id = v.organization_id WHERE v.id = NEW.submission_version_id AND v.organization_id = NEW.organization_id;
  SELECT status INTO profile_status FROM target_profile_versions WHERE id = NEW.profile_version_id AND organization_id = NEW.organization_id;
  IF submission_status <> 'confirmed' OR jsonb_array_length(NEW.blocker_snapshot) <> 0 THEN RAISE EXCEPTION 'recognition binding requires confirmed unblocked submission'; END IF;
  IF profile_status <> 'published' THEN RAISE EXCEPTION 'recognition binding requires published profile'; END IF;
  IF NOT EXISTS(SELECT 1 FROM case_playbook_links l JOIN playbook_versions p ON p.id = l.playbook_version_id AND p.organization_id = l.organization_id WHERE l.case_id = submission_case AND l.playbook_version_id = NEW.playbook_version_id AND l.destination_market_id = submission_market AND l.organization_id = NEW.organization_id AND p.verify_current IS TRUE) THEN RAISE EXCEPTION 'recognition binding requires current case-linked destination playbook'; END IF;
  IF NEW.commitment_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM market_commitment_versions c WHERE c.id = NEW.commitment_version_id AND c.organization_id = NEW.organization_id AND c.profile_version_id = NEW.profile_version_id AND c.status = 'published') THEN RAISE EXCEPTION 'recognition commitment must be published for exact profile'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_bindings_integrity_guard" AFTER INSERT OR UPDATE ON "recognition_submission_bindings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_binding_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_recognition_mapping_guard() RETURNS trigger AS $$
DECLARE latest record;
BEGIN
  SELECT id, event_type, accepted_value INTO latest FROM model_input_mapping_events WHERE mapping_id = NEW.mapping_id AND organization_id = NEW.organization_id ORDER BY occurred_at DESC, id DESC LIMIT 1;
  IF latest.id IS NULL OR latest.event_type <> NEW.state_at_submission OR latest.accepted_value IS DISTINCT FROM NEW.accepted_value_snapshot THEN RAISE EXCEPTION 'submitted mapping snapshot must match latest immutable mapping state'; END IF;
  IF latest.event_type NOT IN ('submitted', 'accepted_by_model_market', 'accepted_with_modification') THEN RAISE EXCEPTION 'rejected unsupported or expired mapping cannot enter submission'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_mappings_integrity_guard" AFTER INSERT OR UPDATE ON "recognition_submission_mappings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_mapping_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_submission_delivery_guard() RETURNS trigger AS $$
DECLARE prior record;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM recognition_submission_bindings WHERE submission_version_id = NEW.submission_version_id AND organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'delivery requires confirmed recognition binding'; END IF;
  SELECT id, attempt_number, submission_version_id INTO prior FROM submission_deliveries WHERE submission_version_id = NEW.submission_version_id AND organization_id = NEW.organization_id ORDER BY attempt_number DESC LIMIT 1;
  IF (prior.id IS NULL AND (NEW.attempt_number <> 1 OR NEW.supersedes_delivery_id IS NOT NULL)) OR (prior.id IS NOT NULL AND (NEW.attempt_number <> prior.attempt_number + 1 OR NEW.supersedes_delivery_id IS DISTINCT FROM prior.id)) THEN RAISE EXCEPTION 'delivery attempt must preserve immediate retry lineage'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "submission_deliveries_lineage_guard" BEFORE INSERT ON "submission_deliveries" FOR EACH ROW EXECUTE FUNCTION fortify_submission_delivery_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_delivery_receipt_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM submission_deliveries d JOIN storage_objects s ON s.id = NEW.storage_object_id AND s.organization_id = d.organization_id WHERE d.id = NEW.delivery_id AND d.organization_id = NEW.organization_id AND d.status = 'delivered' AND s.sha256 = NEW.receipt_hash AND s.state = 'clean') THEN RAISE EXCEPTION 'receipt requires delivered attempt and exact clean stored bytes'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "delivery_receipts_integrity_guard" AFTER INSERT OR UPDATE ON "delivery_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_delivery_receipt_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_reviewer_session_guard() RETURNS trigger AS $$
DECLARE submission_case text;
BEGIN
  SELECT s.case_id INTO submission_case FROM submission_versions v JOIN submissions s ON s.id = v.submission_id AND s.organization_id = v.organization_id WHERE v.id = NEW.submission_version_id AND v.organization_id = NEW.organization_id;
  IF NOT EXISTS(SELECT 1 FROM submission_deliveries WHERE submission_version_id = NEW.submission_version_id AND organization_id = NEW.organization_id AND status = 'delivered') THEN RAISE EXCEPTION 'reviewer session requires delivered exact submission'; END IF;
  IF NOT EXISTS(SELECT 1 FROM external_principals p JOIN external_access_grants g ON g.external_principal_id = p.id AND g.organization_id = p.organization_id WHERE p.id = NEW.external_principal_id AND g.id = NEW.external_access_grant_id AND p.organization_id = NEW.organization_id AND p.principal_type = 'external_reviewer' AND g.case_id = submission_case AND g.token_hash = NEW.token_hash) THEN RAISE EXCEPTION 'reviewer session principal grant token and case must align'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_sessions_integrity_guard" AFTER INSERT OR UPDATE ON "reviewer_sessions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_reviewer_session_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_reviewer_request_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM reviewer_sessions s WHERE s.id = NEW.reviewer_session_id AND s.organization_id = NEW.organization_id AND s.submission_version_id = NEW.submission_version_id AND s.status = 'active' AND s.expires_at > NEW.requested_at) THEN RAISE EXCEPTION 'reviewer request requires active session pinned to exact submission'; END IF;
  IF NEW.supersedes_request_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM reviewer_requests r WHERE r.id = NEW.supersedes_request_id AND r.organization_id = NEW.organization_id AND r.reviewer_session_id = NEW.reviewer_session_id) THEN RAISE EXCEPTION 'corrected request must preserve reviewer session lineage'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_requests_integrity_guard" AFTER INSERT OR UPDATE ON "reviewer_requests" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_reviewer_request_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_reviewer_response_guard() RETURNS trigger AS $$
DECLARE evidence_id text; submitted_version text;
BEGIN
  SELECT submission_version_id INTO submitted_version FROM reviewer_requests WHERE id = NEW.reviewer_request_id AND organization_id = NEW.organization_id;
  FOR evidence_id IN SELECT jsonb_array_elements_text(NEW.evidence_version_ids) LOOP
    IF NOT EXISTS(SELECT 1 FROM submission_items WHERE submission_version_id = submitted_version AND evidence_version_id = evidence_id AND organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'clarification response evidence must be pinned to exact submission'; END IF;
  END LOOP;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "reviewer_responses_integrity_guard" AFTER INSERT OR UPDATE ON "reviewer_request_responses" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_reviewer_response_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_recognition_response_guard() RETURNS trigger AS $$
DECLARE prior_version text; prior_key text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM submission_deliveries WHERE submission_version_id = NEW.submission_version_id AND organization_id = NEW.organization_id AND status = 'delivered') THEN RAISE EXCEPTION 'market response requires documented delivery'; END IF;
  IF TG_TABLE_NAME = 'evidence_acceptance_events' AND NOT EXISTS(SELECT 1 FROM submission_items WHERE submission_version_id = NEW.submission_version_id AND evidence_version_id = to_jsonb(NEW)->>'evidence_version_id' AND organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'evidence disposition must reference exact submitted evidence'; END IF;
  IF TG_TABLE_NAME = 'model_response_events' AND NOT EXISTS(SELECT 1 FROM recognition_submission_mappings WHERE submission_version_id = NEW.submission_version_id AND mapping_id = to_jsonb(NEW)->>'mapping_id' AND organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'model response must reference exact submitted mapping'; END IF;
  IF NEW.supersedes_event_id IS NOT NULL THEN EXECUTE format('SELECT submission_version_id FROM %I WHERE id = $1 AND organization_id = $2', TG_TABLE_NAME) INTO prior_version USING NEW.supersedes_event_id, NEW.organization_id; IF prior_version IS DISTINCT FROM NEW.submission_version_id THEN RAISE EXCEPTION 'correcting response must preserve submission lineage'; END IF; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "evidence_acceptance_integrity_guard" AFTER INSERT OR UPDATE ON "evidence_acceptance_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_response_guard();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "model_responses_integrity_guard" AFTER INSERT OR UPDATE ON "model_response_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_response_guard();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "rating_responses_integrity_guard" AFTER INSERT OR UPDATE ON "rating_treatment_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_response_guard();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "underwriting_responses_integrity_guard" AFTER INSERT OR UPDATE ON "underwriting_treatment_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_response_guard();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "placement_responses_integrity_guard" AFTER INSERT OR UPDATE ON "placement_response_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_response_guard();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "funding_responses_integrity_guard" AFTER INSERT OR UPDATE ON "funding_response_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_response_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_recognition_closure_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM submission_versions v JOIN submissions s ON s.id = v.submission_id AND s.organization_id = v.organization_id WHERE v.id = NEW.submission_version_id AND v.organization_id = NEW.organization_id AND s.case_id = NEW.case_id) THEN RAISE EXCEPTION 'recognition closure must preserve case submission lineage'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "recognition_closures_integrity_guard" AFTER INSERT OR UPDATE ON "recognition_case_closure_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_recognition_closure_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_maintenance_roll_forward_guard() RETURNS trigger AS $$
DECLARE source_property text; target_property text; source_date date; target_date date;
BEGIN
  SELECT p.property_id, c.renewal_date INTO source_property, source_date FROM renewal_cases c JOIN policies p ON p.id = c.policy_id AND p.organization_id = c.organization_id WHERE c.id = NEW.source_case_id AND c.organization_id = NEW.organization_id;
  SELECT p.property_id, c.renewal_date INTO target_property, target_date FROM renewal_cases c JOIN policies p ON p.id = c.policy_id AND p.organization_id = c.organization_id WHERE c.id = NEW.target_case_id AND c.organization_id = NEW.organization_id;
  IF source_property IS NULL OR source_property <> target_property OR target_date <= source_date THEN RAISE EXCEPTION 'maintenance may roll only to a later renewal case for the same property'; END IF;
  IF NOT EXISTS(SELECT 1 FROM recognition_case_closure_events WHERE case_id = NEW.source_case_id AND organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'maintenance roll-forward requires source recognition closure'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "maintenance_roll_forward_integrity_guard" AFTER INSERT OR UPDATE ON "maintenance_roll_forwards" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_maintenance_roll_forward_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_restrict_reviewer_session_update() RETURNS trigger AS $$
BEGIN
  IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id OR OLD.submission_version_id <> NEW.submission_version_id OR OLD.external_principal_id <> NEW.external_principal_id OR OLD.external_access_grant_id <> NEW.external_access_grant_id OR OLD.token_hash <> NEW.token_hash OR OLD.allowed_actions <> NEW.allowed_actions OR OLD.download_allowed <> NEW.download_allowed OR OLD.expires_at <> NEW.expires_at THEN RAISE EXCEPTION 'reviewer session identity scope and exact submission are immutable'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "reviewer_sessions_restricted_update" BEFORE UPDATE ON "reviewer_sessions" FOR EACH ROW EXECUTE FUNCTION fortify_restrict_reviewer_session_update();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_restrict_reviewer_request_update() RETURNS trigger AS $$
BEGIN
  IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id OR OLD.reviewer_session_id <> NEW.reviewer_session_id OR OLD.submission_version_id <> NEW.submission_version_id OR OLD.request_type <> NEW.request_type OR OLD.original_language <> NEW.original_language OR OLD.normalized_reason <> NEW.normalized_reason OR OLD.requested_by <> NEW.requested_by OR OLD.requested_at <> NEW.requested_at OR OLD.supersedes_request_id IS DISTINCT FROM NEW.supersedes_request_id THEN RAISE EXCEPTION 'reviewer request authored correspondence is immutable'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "reviewer_requests_restricted_update" BEFORE UPDATE ON "reviewer_requests" FOR EACH ROW EXECUTE FUNCTION fortify_restrict_reviewer_request_update();
--> statement-breakpoint
CREATE TRIGGER "recognition_bindings_immutable_update" BEFORE UPDATE ON "recognition_submission_bindings" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "recognition_bindings_immutable_delete" BEFORE DELETE ON "recognition_submission_bindings" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "recognition_mappings_immutable_update" BEFORE UPDATE ON "recognition_submission_mappings" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "recognition_mappings_immutable_delete" BEFORE DELETE ON "recognition_submission_mappings" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "submission_deliveries_immutable_update" BEFORE UPDATE ON "submission_deliveries" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "submission_deliveries_immutable_delete" BEFORE DELETE ON "submission_deliveries" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "delivery_receipts_immutable_update" BEFORE UPDATE ON "delivery_receipts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "delivery_receipts_immutable_delete" BEFORE DELETE ON "delivery_receipts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "reviewer_sessions_immutable_delete" BEFORE DELETE ON "reviewer_sessions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "reviewer_requests_immutable_delete" BEFORE DELETE ON "reviewer_requests" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "reviewer_responses_immutable_update" BEFORE UPDATE ON "reviewer_request_responses" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "reviewer_responses_immutable_delete" BEFORE DELETE ON "reviewer_request_responses" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "evidence_acceptance_immutable_update" BEFORE UPDATE ON "evidence_acceptance_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "evidence_acceptance_immutable_delete" BEFORE DELETE ON "evidence_acceptance_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_responses_immutable_update" BEFORE UPDATE ON "model_response_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "model_responses_immutable_delete" BEFORE DELETE ON "model_response_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "rating_responses_immutable_update" BEFORE UPDATE ON "rating_treatment_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "rating_responses_immutable_delete" BEFORE DELETE ON "rating_treatment_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "underwriting_responses_immutable_update" BEFORE UPDATE ON "underwriting_treatment_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "underwriting_responses_immutable_delete" BEFORE DELETE ON "underwriting_treatment_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "placement_responses_immutable_update" BEFORE UPDATE ON "placement_response_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "placement_responses_immutable_delete" BEFORE DELETE ON "placement_response_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_responses_immutable_update" BEFORE UPDATE ON "funding_response_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "funding_responses_immutable_delete" BEFORE DELETE ON "funding_response_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "recognition_closures_immutable_update" BEFORE UPDATE ON "recognition_case_closure_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "recognition_closures_immutable_delete" BEFORE DELETE ON "recognition_case_closure_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "maintenance_roll_forward_immutable_update" BEFORE UPDATE ON "maintenance_roll_forwards" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "maintenance_roll_forward_immutable_delete" BEFORE DELETE ON "maintenance_roll_forwards" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
