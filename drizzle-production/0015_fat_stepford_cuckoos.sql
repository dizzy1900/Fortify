CREATE TABLE "evidence_request_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"evidence_request_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"purpose" text NOT NULL,
	"instructions" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"requested_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confirmed_by" text NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "evidence_request_versions_number_check" CHECK ("evidence_request_versions"."version_number" >= 1),
	CONSTRAINT "evidence_request_versions_purpose_check" CHECK (char_length(trim("evidence_request_versions"."purpose")) >= 8),
	CONSTRAINT "evidence_request_versions_instructions_check" CHECK (char_length(trim("evidence_request_versions"."instructions")) >= 12),
	CONSTRAINT "evidence_request_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "evidence_requests" (
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
	"external_principal_id" text,
	"recipient_type" text NOT NULL,
	"recipient_label" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_version_id" text,
	"issued_by" text,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	CONSTRAINT "evidence_requests_recipient_check" CHECK ("evidence_requests"."recipient_type" in ('property_manager', 'board_contributor', 'contractor_evidence_contributor', 'other_authorized_contributor')),
	CONSTRAINT "evidence_requests_status_check" CHECK ("evidence_requests"."status" in ('draft', 'issued', 'fulfilled', 'cancelled')),
	CONSTRAINT "evidence_requests_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "submission_artifacts" (
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
	"storage_object_id" text NOT NULL,
	"artifact_type" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"generation_recipe_version" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "submission_artifacts_type_check" CHECK ("submission_artifacts"."artifact_type" in ('pdf', 'zip', 'manifest', 'letter')),
	CONSTRAINT "submission_artifacts_size_check" CHECK ("submission_artifacts"."size_bytes" > 0),
	CONSTRAINT "submission_artifacts_hash_check" CHECK (char_length("submission_artifacts"."sha256") = 64),
	CONSTRAINT "submission_artifacts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "evidence_request_versions" ADD CONSTRAINT "evidence_request_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_request_versions" ADD CONSTRAINT "evidence_request_versions_evidence_request_id_evidence_requests_id_fk" FOREIGN KEY ("evidence_request_id") REFERENCES "public"."evidence_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requests" ADD CONSTRAINT "evidence_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requests" ADD CONSTRAINT "evidence_requests_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_requests" ADD CONSTRAINT "evidence_requests_external_principal_id_external_principals_id_fk" FOREIGN KEY ("external_principal_id") REFERENCES "public"."external_principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_artifacts" ADD CONSTRAINT "submission_artifacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_artifacts" ADD CONSTRAINT "submission_artifacts_submission_version_id_submission_versions_id_fk" FOREIGN KEY ("submission_version_id") REFERENCES "public"."submission_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_artifacts" ADD CONSTRAINT "submission_artifacts_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_request_versions_org_request_version_unique" ON "evidence_request_versions" USING btree ("organization_id","evidence_request_id","version_number");--> statement-breakpoint
CREATE INDEX "evidence_requests_org_case_status_idx" ON "evidence_requests" USING btree ("organization_id","case_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_artifacts_org_version_type_unique" ON "submission_artifacts" USING btree ("organization_id","submission_version_id","artifact_type");--> statement-breakpoint
CREATE INDEX "submission_artifacts_org_hash_type_idx" ON "submission_artifacts" USING btree ("organization_id","sha256","artifact_type");
--> statement-breakpoint
CREATE TRIGGER tenant_guard_evidence_requests_case
BEFORE INSERT OR UPDATE ON "evidence_requests" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');
--> statement-breakpoint
CREATE TRIGGER tenant_guard_evidence_requests_external_principal
BEFORE INSERT OR UPDATE ON "evidence_requests" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('external_principal_id', 'external_principals');
--> statement-breakpoint
CREATE TRIGGER tenant_guard_evidence_request_versions_request
BEFORE INSERT OR UPDATE ON "evidence_request_versions" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('evidence_request_id', 'evidence_requests');
--> statement-breakpoint
CREATE TRIGGER tenant_guard_submission_artifacts_version
BEFORE INSERT OR UPDATE ON "submission_artifacts" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('submission_version_id', 'submission_versions');
--> statement-breakpoint
CREATE TRIGGER tenant_guard_submission_artifacts_storage
BEFORE INSERT OR UPDATE ON "submission_artifacts" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_validate_evidence_request_current_version()
RETURNS trigger AS $$
BEGIN
  IF NEW.current_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM evidence_request_versions version
    WHERE version.id = NEW.current_version_id
      AND version.organization_id = NEW.organization_id
      AND version.evidence_request_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Evidence request current version must belong to the same tenant and request';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER evidence_requests_current_version_guard
AFTER INSERT OR UPDATE ON "evidence_requests"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fortify_validate_evidence_request_current_version();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_guard_evidence_request_transition()
RETURNS trigger AS $$
BEGIN
  IF to_jsonb(NEW) - ARRAY['updated_at', 'updated_by', 'revision', 'status', 'current_version_id', 'issued_by', 'issued_at', 'expires_at', 'fulfilled_at', 'cancelled_at', 'cancellation_reason']
       IS DISTINCT FROM
     to_jsonb(OLD) - ARRAY['updated_at', 'updated_by', 'revision', 'status', 'current_version_id', 'issued_by', 'issued_at', 'expires_at', 'fulfilled_at', 'cancelled_at', 'cancellation_reason'] THEN
    RAISE EXCEPTION 'Evidence requests retain immutable identity, case, and recipient scope';
  END IF;
  IF NEW.revision IS DISTINCT FROM OLD.revision + 1 THEN
    RAISE EXCEPTION 'Evidence request changes require one revision increment';
  END IF;
  IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'draft' AND NEW.status = 'issued'
     AND NEW.current_version_id IS NOT NULL
     AND NEW.issued_by IS NOT NULL
     AND NEW.issued_at IS NOT NULL
     AND NEW.expires_at IS NOT NULL
     AND NEW.expires_at > NEW.issued_at THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'issued' AND NEW.status = 'fulfilled'
     AND NEW.fulfilled_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.status IN ('draft', 'issued') AND NEW.status = 'cancelled'
     AND NEW.cancelled_at IS NOT NULL
     AND char_length(trim(coalesce(NEW.cancellation_reason, ''))) >= 4 THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invalid evidence request state transition';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER evidence_requests_transition_guard
BEFORE UPDATE ON "evidence_requests"
FOR EACH ROW EXECUTE FUNCTION fortify_guard_evidence_request_transition();
--> statement-breakpoint
CREATE TRIGGER evidence_request_versions_no_update
BEFORE UPDATE ON "evidence_request_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER evidence_request_versions_no_delete
BEFORE DELETE ON "evidence_request_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER submission_artifacts_no_update
BEFORE UPDATE ON "submission_artifacts"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER submission_artifacts_no_delete
BEFORE DELETE ON "submission_artifacts"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
