CREATE TABLE "document_extraction_runs" (
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
	"job_id" text NOT NULL,
	"provider_key" text NOT NULL,
	"provider_version" text NOT NULL,
	"extractor_key" text NOT NULL,
	"extractor_version" text NOT NULL,
	"input_sha256" text NOT NULL,
	"model_derived" boolean DEFAULT false NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "document_extraction_runs_status_check" CHECK ("document_extraction_runs"."status" in ('running', 'succeeded', 'failed')),
	CONSTRAINT "document_extraction_runs_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "document_facts" (
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
	"extracted_field_id" text NOT NULL,
	"review_id" text NOT NULL,
	"source_passage_id" text,
	"fact_key" text NOT NULL,
	"value" text NOT NULL,
	"version_number" integer NOT NULL,
	"supersedes_fact_id" text,
	"confirmed_by" text NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	"correction_reason" text,
	CONSTRAINT "document_facts_version_check" CHECK ("document_facts"."version_number" >= 1),
	CONSTRAINT "document_facts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "document_processing_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"job_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"worker_id" text NOT NULL,
	"status" text NOT NULL,
	"provider_key" text,
	"provider_version" text,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "document_processing_attempts_status_check" CHECK ("document_processing_attempts"."status" in ('running', 'succeeded', 'failed_retryable', 'failed_terminal')),
	CONSTRAINT "document_processing_attempts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "document_processing_jobs" (
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
	"pipeline_version" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"completed_at" timestamp with time zone,
	"dead_lettered_at" timestamp with time zone,
	CONSTRAINT "document_processing_jobs_status_check" CHECK ("document_processing_jobs"."status" in ('queued', 'running', 'retry_scheduled', 'succeeded', 'dead_letter')),
	CONSTRAINT "document_processing_jobs_attempts_check" CHECK ("document_processing_jobs"."attempt_count" >= 0 and "document_processing_jobs"."max_attempts" between 1 and 10 and "document_processing_jobs"."attempt_count" <= "document_processing_jobs"."max_attempts"),
	CONSTRAINT "document_processing_jobs_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "extracted_field_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"extracted_field_id" text NOT NULL,
	"action" text NOT NULL,
	"reviewed_value" text,
	"reviewer_subject" text NOT NULL,
	"reviewer_principal_type" text NOT NULL,
	"note" text,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "extracted_field_reviews_action_check" CHECK ("extracted_field_reviews"."action" in ('confirmed', 'corrected', 'rejected')),
	CONSTRAINT "extracted_field_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "extracted_fields" (
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
	"extraction_run_id" text NOT NULL,
	"source_passage_id" text,
	"field_key" text NOT NULL,
	"field_label" text NOT NULL,
	"candidate_ordinal" integer DEFAULT 1 NOT NULL,
	"value" text NOT NULL,
	"value_type" text DEFAULT 'text' NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"model_derived" boolean DEFAULT false NOT NULL,
	CONSTRAINT "extracted_fields_confidence_check" CHECK ("extracted_fields"."confidence" >= 0 and "extracted_fields"."confidence" <= 1),
	CONSTRAINT "extracted_fields_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "storage_object_id" text;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "supersedes_source_document_id" text;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "version_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "classification_confidence" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "classifier_key" text;--> statement-breakpoint
ALTER TABLE "source_documents" ADD COLUMN "classifier_version" text;--> statement-breakpoint
ALTER TABLE "source_passages" ADD COLUMN "extraction_run_id" text;--> statement-breakpoint
ALTER TABLE "source_passages" ADD COLUMN "region" jsonb;--> statement-breakpoint
ALTER TABLE "source_passages" ADD COLUMN "passage_kind" text DEFAULT 'paragraph' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_extraction_runs" ADD CONSTRAINT "document_extraction_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extraction_runs" ADD CONSTRAINT "document_extraction_runs_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_extraction_runs" ADD CONSTRAINT "document_extraction_runs_job_id_document_processing_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."document_processing_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_facts" ADD CONSTRAINT "document_facts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_facts" ADD CONSTRAINT "document_facts_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_facts" ADD CONSTRAINT "document_facts_extracted_field_id_extracted_fields_id_fk" FOREIGN KEY ("extracted_field_id") REFERENCES "public"."extracted_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_facts" ADD CONSTRAINT "document_facts_review_id_extracted_field_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."extracted_field_reviews"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_facts" ADD CONSTRAINT "document_facts_source_passage_id_source_passages_id_fk" FOREIGN KEY ("source_passage_id") REFERENCES "public"."source_passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_facts" ADD CONSTRAINT "document_facts_supersedes_fact_id_document_facts_id_fk" FOREIGN KEY ("supersedes_fact_id") REFERENCES "public"."document_facts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_attempts" ADD CONSTRAINT "document_processing_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_attempts" ADD CONSTRAINT "document_processing_attempts_job_id_document_processing_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."document_processing_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_jobs" ADD CONSTRAINT "document_processing_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_jobs" ADD CONSTRAINT "document_processing_jobs_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_field_reviews" ADD CONSTRAINT "extracted_field_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_field_reviews" ADD CONSTRAINT "extracted_field_reviews_extracted_field_id_extracted_fields_id_fk" FOREIGN KEY ("extracted_field_id") REFERENCES "public"."extracted_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_extraction_run_id_document_extraction_runs_id_fk" FOREIGN KEY ("extraction_run_id") REFERENCES "public"."document_extraction_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_fields" ADD CONSTRAINT "extracted_fields_source_passage_id_source_passages_id_fk" FOREIGN KEY ("source_passage_id") REFERENCES "public"."source_passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_extraction_runs_job_extractor_unique" ON "document_extraction_runs" USING btree ("organization_id","job_id","extractor_key","extractor_version");--> statement-breakpoint
CREATE UNIQUE INDEX "document_facts_org_document_key_version_unique" ON "document_facts" USING btree ("organization_id","source_document_id","fact_key","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "document_processing_attempts_job_number_unique" ON "document_processing_attempts" USING btree ("organization_id","job_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "document_processing_jobs_org_document_pipeline_unique" ON "document_processing_jobs" USING btree ("organization_id","source_document_id","pipeline_version");--> statement-breakpoint
CREATE INDEX "document_processing_jobs_org_queue_idx" ON "document_processing_jobs" USING btree ("organization_id","status","available_at");--> statement-breakpoint
CREATE INDEX "extracted_field_reviews_org_field_idx" ON "extracted_field_reviews" USING btree ("organization_id","extracted_field_id","reviewed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "extracted_fields_run_key_ordinal_unique" ON "extracted_fields" USING btree ("organization_id","extraction_run_id","field_key","candidate_ordinal");--> statement-breakpoint
CREATE INDEX "extracted_fields_org_document_idx" ON "extracted_fields" USING btree ("organization_id","source_document_id");--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_supersedes_source_document_id_source_documents_id_fk" FOREIGN KEY ("supersedes_source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_passages" ADD CONSTRAINT "source_passages_extraction_run_id_document_extraction_runs_id_fk" FOREIGN KEY ("extraction_run_id") REFERENCES "public"."document_extraction_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_documents_org_storage_idx" ON "source_documents" USING btree ("organization_id","storage_object_id");--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_version_check" CHECK ("source_documents"."version_number" >= 1);
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "source_documents_storage_tenant_guard"
AFTER INSERT OR UPDATE ON "source_documents" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."storage_object_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "source_documents_supersedes_tenant_guard"
AFTER INSERT OR UPDATE ON "source_documents" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."supersedes_source_document_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('supersedes_source_document_id', 'source_documents');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "document_processing_jobs_document_tenant_guard"
AFTER INSERT OR UPDATE ON "document_processing_jobs" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_document_id', 'source_documents');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "document_processing_attempts_job_tenant_guard"
AFTER INSERT OR UPDATE ON "document_processing_attempts" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('job_id', 'document_processing_jobs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "document_extraction_runs_document_tenant_guard"
AFTER INSERT OR UPDATE ON "document_extraction_runs" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_document_id', 'source_documents');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "document_extraction_runs_job_tenant_guard"
AFTER INSERT OR UPDATE ON "document_extraction_runs" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('job_id', 'document_processing_jobs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "source_passages_extraction_tenant_guard"
AFTER INSERT OR UPDATE ON "source_passages" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."extraction_run_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('extraction_run_id', 'document_extraction_runs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "extracted_fields_document_tenant_guard"
AFTER INSERT OR UPDATE ON "extracted_fields" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_document_id', 'source_documents');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "extracted_fields_run_tenant_guard"
AFTER INSERT OR UPDATE ON "extracted_fields" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('extraction_run_id', 'document_extraction_runs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "extracted_fields_passage_tenant_guard"
AFTER INSERT OR UPDATE ON "extracted_fields" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."source_passage_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('source_passage_id', 'source_passages');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "extracted_field_reviews_field_tenant_guard"
AFTER INSERT OR UPDATE ON "extracted_field_reviews" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('extracted_field_id', 'extracted_fields');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "document_facts_document_tenant_guard"
AFTER INSERT OR UPDATE ON "document_facts" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_document_id', 'source_documents');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "document_facts_field_tenant_guard"
AFTER INSERT OR UPDATE ON "document_facts" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('extracted_field_id', 'extracted_fields');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "document_facts_review_tenant_guard"
AFTER INSERT OR UPDATE ON "document_facts" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('review_id', 'extracted_field_reviews');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "document_facts_passage_tenant_guard"
AFTER INSERT OR UPDATE ON "document_facts" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."source_passage_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('source_passage_id', 'source_passages');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "document_facts_supersedes_tenant_guard"
AFTER INSERT OR UPDATE ON "document_facts" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."supersedes_fact_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('supersedes_fact_id', 'document_facts');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_document_attempt_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'running' THEN
    RAISE EXCEPTION 'document processing attempts are immutable after completion';
  END IF;
  IF NEW.id <> OLD.id
    OR NEW.organization_id <> OLD.organization_id
    OR NEW.job_id <> OLD.job_id
    OR NEW.attempt_number <> OLD.attempt_number
    OR NEW.worker_id <> OLD.worker_id
    OR NEW.started_at <> OLD.started_at THEN
    RAISE EXCEPTION 'document processing attempt identity and provenance are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "document_processing_attempts_transition_guard"
BEFORE UPDATE ON "document_processing_attempts"
FOR EACH ROW EXECUTE FUNCTION fortify_document_attempt_transition();
--> statement-breakpoint
CREATE TRIGGER "document_processing_attempts_immutable_delete"
BEFORE DELETE ON "document_processing_attempts"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "document_extraction_runs_immutable_update"
BEFORE UPDATE ON "document_extraction_runs"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "document_extraction_runs_immutable_delete"
BEFORE DELETE ON "document_extraction_runs"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "source_passages_immutable_update"
BEFORE UPDATE ON "source_passages"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "source_passages_immutable_delete"
BEFORE DELETE ON "source_passages"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "extracted_fields_immutable_update"
BEFORE UPDATE ON "extracted_fields"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "extracted_fields_immutable_delete"
BEFORE DELETE ON "extracted_fields"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "extracted_field_reviews_immutable_update"
BEFORE UPDATE ON "extracted_field_reviews"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "extracted_field_reviews_immutable_delete"
BEFORE DELETE ON "extracted_field_reviews"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "document_facts_immutable_update"
BEFORE UPDATE ON "document_facts"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "document_facts_immutable_delete"
BEFORE DELETE ON "document_facts"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
