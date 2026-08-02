CREATE TABLE "maintenance_obligation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"obligation_id" text NOT NULL,
	"event_type" text NOT NULL,
	"evidence_version_id" text,
	"note" text NOT NULL,
	"recorded_by" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "maintenance_obligation_events_type_check" CHECK ("maintenance_obligation_events"."event_type" in ('scheduled', 'evidence_refreshed', 'satisfied', 'expired', 'waived')),
	CONSTRAINT "maintenance_obligation_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "maintenance_obligations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"certificate_id" text NOT NULL,
	"intervention_version_id" text NOT NULL,
	"title" text NOT NULL,
	"requirement" text NOT NULL,
	"recurrence_rule" text NOT NULL,
	"evidence_requirement" text NOT NULL,
	"next_due_at" timestamp with time zone NOT NULL,
	CONSTRAINT "maintenance_obligations_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "property_condition_events" (
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
	"project_id" text,
	"certificate_id" text,
	"event_type" text NOT NULL,
	"condition_state" text NOT NULL,
	"evidence_version_id" text,
	"observed_by" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"note" text NOT NULL,
	CONSTRAINT "property_condition_events_state_check" CHECK ("property_condition_events"."condition_state" in ('observed_conforming', 'observed_degraded', 'insufficient_evidence', 'not_observed')),
	CONSTRAINT "property_condition_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_assignments" (
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
	"profile_version_id" text NOT NULL,
	"verifier_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"purpose" text NOT NULL,
	"scope" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"token_hash" text NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL,
	"due_on" date,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"reinspection_of_assignment_id" text,
	CONSTRAINT "verification_assignments_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_certificate_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"certificate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"rationale" text NOT NULL,
	"decided_by" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"supersedes_event_id" text,
	CONSTRAINT "verification_certificate_events_type_check" CHECK ("verification_certificate_events"."event_type" in ('issued', 'expired', 'revoked', 'reinstated')),
	CONSTRAINT "verification_certificate_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"assignment_id" text NOT NULL,
	"certificate_number" text NOT NULL,
	"conclusion_hash" text NOT NULL,
	"issued_by" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"limitations" text NOT NULL,
	CONSTRAINT "verification_certificates_hash_check" CHECK (char_length("verification_certificates"."conclusion_hash") = 64),
	CONSTRAINT "verification_certificates_dates_check" CHECK ("verification_certificates"."expires_at" > "verification_certificates"."issued_at"),
	CONSTRAINT "verification_certificates_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_conflict_declarations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"assignment_id" text NOT NULL,
	"declaration" text NOT NULL,
	"conflict_state" text NOT NULL,
	"disclosed_relationships" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signed_by" text NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_conflicts_state_check" CHECK ("verification_conflict_declarations"."conflict_state" in ('no_conflict_declared', 'conflict_disclosed', 'unable_to_determine')),
	CONSTRAINT "verification_conflicts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_corrective_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"exception_id" text NOT NULL,
	"action_type" text NOT NULL,
	"description" text NOT NULL,
	"state" text NOT NULL,
	"responsible_subject" text NOT NULL,
	"due_on" date,
	"evidence_version_id" text,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"supersedes_action_id" text,
	CONSTRAINT "verification_corrective_actions_state_check" CHECK ("verification_corrective_actions"."state" in ('required', 'submitted', 'accepted', 'rejected', 'cancelled')),
	CONSTRAINT "verification_corrective_actions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"assignment_id" text NOT NULL,
	"finding_id" text,
	"exception_type" text NOT NULL,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"opened_by" text NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_exceptions_severity_check" CHECK ("verification_exceptions"."severity" in ('low', 'medium', 'high', 'critical')),
	CONSTRAINT "verification_exceptions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_finding_evidence_links" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"finding_id" text NOT NULL,
	"evidence_version_id" text NOT NULL,
	"relationship" text NOT NULL,
	CONSTRAINT "verification_finding_evidence_relationship_check" CHECK ("verification_finding_evidence_links"."relationship" in ('supports', 'contradicts', 'context_only')),
	CONSTRAINT "verification_finding_evidence_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_finding_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"finding_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"evidence_and_method_checked" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_finding_reviews_decision_check" CHECK ("verification_finding_reviews"."decision" in ('approved', 'rejected', 'changes_requested')),
	CONSTRAINT "verification_finding_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_findings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"assignment_id" text NOT NULL,
	"method_id" text NOT NULL,
	"project_intervention_id" text NOT NULL,
	"criterion_id" text NOT NULL,
	"conclusion" text NOT NULL,
	"evidence_level" text NOT NULL,
	"statement" text NOT NULL,
	"limitations" text NOT NULL,
	"verifier_subject" text NOT NULL,
	"concluded_at" timestamp with time zone NOT NULL,
	"signature_hash" text NOT NULL,
	CONSTRAINT "verification_findings_conclusion_check" CHECK ("verification_findings"."conclusion" in ('conforming', 'nonconforming', 'insufficient_evidence', 'not_observed')),
	CONSTRAINT "verification_findings_evidence_level_check" CHECK ("verification_findings"."evidence_level" in ('physical_specification', 'verified_installation', 'modelled_vulnerability_reduction', 'modelled_expected_loss_reduction', 'filed_rating_treatment', 'underwriting_treatment', 'financing_or_programme_treatment', 'observed_event_performance', 'claims_evidence')),
	CONSTRAINT "verification_findings_signature_check" CHECK (char_length("verification_findings"."signature_hash") = 64),
	CONSTRAINT "verification_findings_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"assignment_id" text NOT NULL,
	"method_type" text NOT NULL,
	"method_version" text NOT NULL,
	"performed_by" text NOT NULL,
	"performed_at" timestamp with time zone NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"measurement_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"limitations" text NOT NULL,
	CONSTRAINT "verification_methods_type_check" CHECK ("verification_methods"."method_type" in ('desktop_review', 'site_visit', 'photographic_review', 'geolocation_check', 'timestamp_check', 'measurement')),
	CONSTRAINT "verification_methods_location_check" CHECK (("verification_methods"."latitude" is null and "verification_methods"."longitude" is null) or ("verification_methods"."latitude" between -90 and 90 and "verification_methods"."longitude" between -180 and 180)),
	CONSTRAINT "verification_methods_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verification_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"legal_name" text NOT NULL,
	"organization_type" text NOT NULL,
	"website" text,
	"status" text DEFAULT 'active' NOT NULL,
	"limitations" text NOT NULL,
	CONSTRAINT "verification_organizations_status_check" CHECK ("verification_organizations"."status" in ('active', 'suspended', 'inactive')),
	CONSTRAINT "verification_organizations_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verifier_credential_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"credential_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"source_checked" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "verifier_credential_reviews_decision_check" CHECK ("verifier_credential_reviews"."decision" in ('approved', 'rejected', 'changes_requested')),
	CONSTRAINT "verifier_credential_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verifier_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"verifier_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"credential_type" text NOT NULL,
	"issuer" text NOT NULL,
	"credential_reference" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"scope" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"issued_on" date NOT NULL,
	"expires_on" date NOT NULL,
	"source_version" text NOT NULL,
	"source_url" text,
	"verify_current_status" text DEFAULT 'unreviewed' NOT NULL,
	"supersedes_credential_id" text,
	"author_subject" text NOT NULL,
	CONSTRAINT "verifier_credentials_version_check" CHECK ("verifier_credentials"."version_number" >= 1),
	CONSTRAINT "verifier_credentials_dates_check" CHECK ("verifier_credentials"."expires_on" >= "verifier_credentials"."issued_on"),
	CONSTRAINT "verifier_credentials_status_check" CHECK ("verifier_credentials"."verify_current_status" in ('unreviewed', 'verified_current', 'expired', 'revoked', 'unable_to_verify')),
	CONSTRAINT "verifier_credentials_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "verifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"verification_organization_id" text NOT NULL,
	"external_principal_id" text,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "verifiers_status_check" CHECK ("verifiers"."status" in ('active', 'suspended', 'inactive')),
	CONSTRAINT "verifiers_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "maintenance_obligation_events" ADD CONSTRAINT "maintenance_obligation_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_obligation_events" ADD CONSTRAINT "maintenance_obligation_events_obligation_id_maintenance_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."maintenance_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_obligation_events" ADD CONSTRAINT "maintenance_obligation_events_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_obligations" ADD CONSTRAINT "maintenance_obligations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_obligations" ADD CONSTRAINT "maintenance_obligations_certificate_id_verification_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."verification_certificates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_obligations" ADD CONSTRAINT "maintenance_obligations_intervention_version_id_intervention_versions_id_fk" FOREIGN KEY ("intervention_version_id") REFERENCES "public"."intervention_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_condition_events" ADD CONSTRAINT "property_condition_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_condition_events" ADD CONSTRAINT "property_condition_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_condition_events" ADD CONSTRAINT "property_condition_events_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_condition_events" ADD CONSTRAINT "property_condition_events_certificate_id_verification_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."verification_certificates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_condition_events" ADD CONSTRAINT "property_condition_events_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_assignments" ADD CONSTRAINT "verification_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_assignments" ADD CONSTRAINT "verification_assignments_project_id_resilience_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."resilience_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_assignments" ADD CONSTRAINT "verification_assignments_profile_version_id_target_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."target_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_assignments" ADD CONSTRAINT "verification_assignments_verifier_id_verifiers_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "public"."verifiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_assignments" ADD CONSTRAINT "verification_assignments_credential_id_verifier_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."verifier_credentials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_assignments" ADD CONSTRAINT "verification_assignments_reinspection_of_assignment_id_verification_assignments_id_fk" FOREIGN KEY ("reinspection_of_assignment_id") REFERENCES "public"."verification_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_certificate_events" ADD CONSTRAINT "verification_certificate_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_certificate_events" ADD CONSTRAINT "verification_certificate_events_certificate_id_verification_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."verification_certificates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_certificate_events" ADD CONSTRAINT "verification_certificate_events_supersedes_event_id_verification_certificate_events_id_fk" FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."verification_certificate_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_certificates" ADD CONSTRAINT "verification_certificates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_certificates" ADD CONSTRAINT "verification_certificates_assignment_id_verification_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."verification_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_conflict_declarations" ADD CONSTRAINT "verification_conflict_declarations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_conflict_declarations" ADD CONSTRAINT "verification_conflict_declarations_assignment_id_verification_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."verification_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_corrective_actions" ADD CONSTRAINT "verification_corrective_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_corrective_actions" ADD CONSTRAINT "verification_corrective_actions_exception_id_verification_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."verification_exceptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_corrective_actions" ADD CONSTRAINT "verification_corrective_actions_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_corrective_actions" ADD CONSTRAINT "verification_corrective_actions_supersedes_action_id_verification_corrective_actions_id_fk" FOREIGN KEY ("supersedes_action_id") REFERENCES "public"."verification_corrective_actions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_exceptions" ADD CONSTRAINT "verification_exceptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_exceptions" ADD CONSTRAINT "verification_exceptions_assignment_id_verification_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."verification_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_exceptions" ADD CONSTRAINT "verification_exceptions_finding_id_verification_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."verification_findings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_finding_evidence_links" ADD CONSTRAINT "verification_finding_evidence_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_finding_evidence_links" ADD CONSTRAINT "verification_finding_evidence_links_finding_id_verification_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."verification_findings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_finding_evidence_links" ADD CONSTRAINT "verification_finding_evidence_links_evidence_version_id_evidence_versions_id_fk" FOREIGN KEY ("evidence_version_id") REFERENCES "public"."evidence_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_finding_reviews" ADD CONSTRAINT "verification_finding_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_finding_reviews" ADD CONSTRAINT "verification_finding_reviews_finding_id_verification_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."verification_findings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_findings" ADD CONSTRAINT "verification_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_findings" ADD CONSTRAINT "verification_findings_assignment_id_verification_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."verification_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_findings" ADD CONSTRAINT "verification_findings_method_id_verification_methods_id_fk" FOREIGN KEY ("method_id") REFERENCES "public"."verification_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_findings" ADD CONSTRAINT "verification_findings_project_intervention_id_project_interventions_id_fk" FOREIGN KEY ("project_intervention_id") REFERENCES "public"."project_interventions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_findings" ADD CONSTRAINT "verification_findings_criterion_id_target_profile_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."target_profile_criteria"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_methods" ADD CONSTRAINT "verification_methods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_methods" ADD CONSTRAINT "verification_methods_assignment_id_verification_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."verification_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_organizations" ADD CONSTRAINT "verification_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier_credential_reviews" ADD CONSTRAINT "verifier_credential_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier_credential_reviews" ADD CONSTRAINT "verifier_credential_reviews_credential_id_verifier_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."verifier_credentials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier_credentials" ADD CONSTRAINT "verifier_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier_credentials" ADD CONSTRAINT "verifier_credentials_verifier_id_verifiers_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "public"."verifiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier_credentials" ADD CONSTRAINT "verifier_credentials_supersedes_credential_id_verifier_credentials_id_fk" FOREIGN KEY ("supersedes_credential_id") REFERENCES "public"."verifier_credentials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifiers" ADD CONSTRAINT "verifiers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifiers" ADD CONSTRAINT "verifiers_verification_organization_id_verification_organizations_id_fk" FOREIGN KEY ("verification_organization_id") REFERENCES "public"."verification_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifiers" ADD CONSTRAINT "verifiers_external_principal_id_external_principals_id_fk" FOREIGN KEY ("external_principal_id") REFERENCES "public"."external_principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenance_obligations_org_due_idx" ON "maintenance_obligations" USING btree ("organization_id","next_due_at");--> statement-breakpoint
CREATE INDEX "property_condition_events_org_property_idx" ON "property_condition_events" USING btree ("organization_id","property_id","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_assignments_token_unique" ON "verification_assignments" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "verification_assignments_org_project_idx" ON "verification_assignments" USING btree ("organization_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_certificates_org_number_unique" ON "verification_certificates" USING btree ("organization_id","certificate_number");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_conflicts_org_assignment_unique" ON "verification_conflict_declarations" USING btree ("organization_id","assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_finding_evidence_unique" ON "verification_finding_evidence_links" USING btree ("organization_id","finding_id","evidence_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_finding_reviews_org_finding_unique" ON "verification_finding_reviews" USING btree ("organization_id","finding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_organizations_org_name_unique" ON "verification_organizations" USING btree ("organization_id","legal_name");--> statement-breakpoint
CREATE UNIQUE INDEX "verifier_credential_reviews_org_credential_unique" ON "verifier_credential_reviews" USING btree ("organization_id","credential_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verifier_credentials_org_verifier_version_unique" ON "verifier_credentials" USING btree ("organization_id","verifier_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "verifiers_org_email_unique" ON "verifiers" USING btree ("organization_id","email");
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verifiers_organization_tenant_guard" AFTER INSERT OR UPDATE ON "verifiers" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('verification_organization_id', 'verification_organizations');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verifiers_principal_tenant_guard" AFTER INSERT OR UPDATE ON "verifiers" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."external_principal_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('external_principal_id', 'external_principals');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verifier_credentials_verifier_tenant_guard" AFTER INSERT OR UPDATE ON "verifier_credentials" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('verifier_id', 'verifiers');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verifier_credentials_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "verifier_credentials" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_credential_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_credential_id', 'verifier_credentials');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verifier_credential_reviews_credential_tenant_guard" AFTER INSERT OR UPDATE ON "verifier_credential_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('credential_id', 'verifier_credentials');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_assignments_project_tenant_guard" AFTER INSERT OR UPDATE ON "verification_assignments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_assignments_profile_tenant_guard" AFTER INSERT OR UPDATE ON "verification_assignments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('profile_version_id', 'target_profile_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_assignments_verifier_tenant_guard" AFTER INSERT OR UPDATE ON "verification_assignments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('verifier_id', 'verifiers');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_assignments_credential_tenant_guard" AFTER INSERT OR UPDATE ON "verification_assignments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('credential_id', 'verifier_credentials');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_assignments_reinspection_tenant_guard" AFTER INSERT OR UPDATE ON "verification_assignments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."reinspection_of_assignment_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('reinspection_of_assignment_id', 'verification_assignments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_conflicts_assignment_tenant_guard" AFTER INSERT OR UPDATE ON "verification_conflict_declarations" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('assignment_id', 'verification_assignments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_methods_assignment_tenant_guard" AFTER INSERT OR UPDATE ON "verification_methods" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('assignment_id', 'verification_assignments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_findings_assignment_tenant_guard" AFTER INSERT OR UPDATE ON "verification_findings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('assignment_id', 'verification_assignments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_findings_method_tenant_guard" AFTER INSERT OR UPDATE ON "verification_findings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('method_id', 'verification_methods');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_findings_intervention_tenant_guard" AFTER INSERT OR UPDATE ON "verification_findings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('project_intervention_id', 'project_interventions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_findings_criterion_tenant_guard" AFTER INSERT OR UPDATE ON "verification_findings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('criterion_id', 'target_profile_criteria');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_finding_evidence_finding_tenant_guard" AFTER INSERT OR UPDATE ON "verification_finding_evidence_links" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('finding_id', 'verification_findings');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_finding_evidence_version_tenant_guard" AFTER INSERT OR UPDATE ON "verification_finding_evidence_links" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_finding_reviews_finding_tenant_guard" AFTER INSERT OR UPDATE ON "verification_finding_reviews" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('finding_id', 'verification_findings');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_exceptions_assignment_tenant_guard" AFTER INSERT OR UPDATE ON "verification_exceptions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('assignment_id', 'verification_assignments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_exceptions_finding_tenant_guard" AFTER INSERT OR UPDATE ON "verification_exceptions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."finding_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('finding_id', 'verification_findings');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_actions_exception_tenant_guard" AFTER INSERT OR UPDATE ON "verification_corrective_actions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('exception_id', 'verification_exceptions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_actions_evidence_tenant_guard" AFTER INSERT OR UPDATE ON "verification_corrective_actions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."evidence_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_actions_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "verification_corrective_actions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_action_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_action_id', 'verification_corrective_actions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_certificates_assignment_tenant_guard" AFTER INSERT OR UPDATE ON "verification_certificates" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('assignment_id', 'verification_assignments');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_certificate_events_certificate_tenant_guard" AFTER INSERT OR UPDATE ON "verification_certificate_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('certificate_id', 'verification_certificates');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_certificate_events_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "verification_certificate_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_event_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_event_id', 'verification_certificate_events');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "maintenance_obligations_certificate_tenant_guard" AFTER INSERT OR UPDATE ON "maintenance_obligations" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('certificate_id', 'verification_certificates');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "maintenance_obligations_intervention_tenant_guard" AFTER INSERT OR UPDATE ON "maintenance_obligations" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('intervention_version_id', 'intervention_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "maintenance_obligation_events_obligation_tenant_guard" AFTER INSERT OR UPDATE ON "maintenance_obligation_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('obligation_id', 'maintenance_obligations');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "maintenance_obligation_events_evidence_tenant_guard" AFTER INSERT OR UPDATE ON "maintenance_obligation_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."evidence_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "property_condition_events_property_tenant_guard" AFTER INSERT OR UPDATE ON "property_condition_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "property_condition_events_project_tenant_guard" AFTER INSERT OR UPDATE ON "property_condition_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."project_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('project_id', 'resilience_projects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "property_condition_events_certificate_tenant_guard" AFTER INSERT OR UPDATE ON "property_condition_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."certificate_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('certificate_id', 'verification_certificates');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "property_condition_events_evidence_tenant_guard" AFTER INSERT OR UPDATE ON "property_condition_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."evidence_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('evidence_version_id', 'evidence_versions');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_require_verification_assignment_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM verifier_credentials c WHERE c.id = NEW.credential_id AND c.verifier_id = NEW.verifier_id AND c.organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'verification assignment credential must belong to verifier and tenant';
  END IF;
  IF NEW.reinspection_of_assignment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM verification_assignments a WHERE a.id = NEW.reinspection_of_assignment_id AND a.project_id = NEW.project_id AND a.organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'reinspection must preserve project and tenant';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_assignments_integrity_guard" AFTER INSERT OR UPDATE ON "verification_assignments" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_verification_assignment_integrity();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_require_verification_finding_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a_project text; a_profile text;
BEGIN
  SELECT project_id, profile_version_id INTO a_project, a_profile FROM verification_assignments WHERE id = NEW.assignment_id AND organization_id = NEW.organization_id;
  IF NOT EXISTS (SELECT 1 FROM verification_methods m WHERE m.id = NEW.method_id AND m.assignment_id = NEW.assignment_id AND m.organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'finding method must belong to assignment'; END IF;
  IF NOT EXISTS (SELECT 1 FROM project_interventions p WHERE p.id = NEW.project_intervention_id AND p.project_id = a_project AND p.organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'finding intervention must belong to assignment project'; END IF;
  IF NOT EXISTS (SELECT 1 FROM target_profile_criteria c WHERE c.id = NEW.criterion_id AND c.profile_version_id = a_profile AND c.organization_id = NEW.organization_id) THEN RAISE EXCEPTION 'finding criterion must belong to assignment profile'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "verification_findings_integrity_guard" AFTER INSERT OR UPDATE ON "verification_findings" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_verification_finding_integrity();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_restrict_verification_assignment_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.project_id <> NEW.project_id OR OLD.profile_version_id <> NEW.profile_version_id OR OLD.verifier_id <> NEW.verifier_id OR OLD.credential_id <> NEW.credential_id OR OLD.purpose <> NEW.purpose OR OLD.scope <> NEW.scope OR OLD.token_hash <> NEW.token_hash OR OLD.assigned_by <> NEW.assigned_by OR OLD.assigned_at <> NEW.assigned_at OR OLD.due_on IS DISTINCT FROM NEW.due_on OR OLD.expires_at <> NEW.expires_at OR OLD.reinspection_of_assignment_id IS DISTINCT FROM NEW.reinspection_of_assignment_id OR OLD.organization_id <> NEW.organization_id THEN RAISE EXCEPTION 'verification assignment scope is immutable'; END IF;
  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN RAISE EXCEPTION 'verification assignment revocation is immutable'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER "verification_assignments_restricted_update" BEFORE UPDATE ON "verification_assignments" FOR EACH ROW EXECUTE FUNCTION fortify_restrict_verification_assignment_update();
--> statement-breakpoint
CREATE TRIGGER "verification_assignments_immutable_delete" BEFORE DELETE ON "verification_assignments" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_conflicts_immutable_update" BEFORE UPDATE ON "verification_conflict_declarations" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_conflicts_immutable_delete" BEFORE DELETE ON "verification_conflict_declarations" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_methods_immutable_update" BEFORE UPDATE ON "verification_methods" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_methods_immutable_delete" BEFORE DELETE ON "verification_methods" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_findings_immutable_update" BEFORE UPDATE ON "verification_findings" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_findings_immutable_delete" BEFORE DELETE ON "verification_findings" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_finding_evidence_immutable_update" BEFORE UPDATE ON "verification_finding_evidence_links" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_finding_evidence_immutable_delete" BEFORE DELETE ON "verification_finding_evidence_links" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_finding_reviews_immutable_update" BEFORE UPDATE ON "verification_finding_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_finding_reviews_immutable_delete" BEFORE DELETE ON "verification_finding_reviews" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_exceptions_immutable_update" BEFORE UPDATE ON "verification_exceptions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_exceptions_immutable_delete" BEFORE DELETE ON "verification_exceptions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_actions_immutable_update" BEFORE UPDATE ON "verification_corrective_actions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_actions_immutable_delete" BEFORE DELETE ON "verification_corrective_actions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_certificates_immutable_update" BEFORE UPDATE ON "verification_certificates" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_certificates_immutable_delete" BEFORE DELETE ON "verification_certificates" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_certificate_events_immutable_update" BEFORE UPDATE ON "verification_certificate_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "verification_certificate_events_immutable_delete" BEFORE DELETE ON "verification_certificate_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "maintenance_obligation_events_immutable_update" BEFORE UPDATE ON "maintenance_obligation_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "maintenance_obligation_events_immutable_delete" BEFORE DELETE ON "maintenance_obligation_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "property_condition_events_immutable_update" BEFORE UPDATE ON "property_condition_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "property_condition_events_immutable_delete" BEFORE DELETE ON "property_condition_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
