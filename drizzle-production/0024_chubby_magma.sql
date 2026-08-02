CREATE TABLE "integration_connection_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"connection_id" text NOT NULL,
	"event_type" text NOT NULL,
	"previous_status" text,
	"next_status" text NOT NULL,
	"reason" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"actor_subject" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "integration_events_type_check" CHECK ("integration_connection_events"."event_type" in ('configured', 'connected', 'degraded', 'disconnected', 'disabled', 'credential_rotated')),
	CONSTRAINT "integration_events_status_check" CHECK ("integration_connection_events"."next_status" in ('disconnected', 'configured', 'connected', 'degraded', 'disabled') and ("integration_connection_events"."previous_status" is null or "integration_connection_events"."previous_status" in ('disconnected', 'configured', 'connected', 'degraded', 'disabled'))),
	CONSTRAINT "integration_events_confirmed_check" CHECK ("integration_connection_events"."human_confirmed" = true),
	CONSTRAINT "integration_events_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
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
	"provider_key" text NOT NULL,
	"provider_version" text NOT NULL,
	"connection_mode" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"api_credential_id" text,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"page_size" integer DEFAULT 100 NOT NULL,
	"rate_limit_per_minute" integer DEFAULT 60 NOT NULL,
	"owner_subject" text NOT NULL,
	"last_health_at" timestamp with time zone,
	CONSTRAINT "integration_connections_provider_check" CHECK ("integration_connections"."provider_type" in ('microsoft_graph_email', 'gmail_email', 'google_drive', 'generic_ams', 'applied_epic', 'ams360', 'property_management', 'external_model', 'verifier')),
	CONSTRAINT "integration_connections_mode_check" CHECK ("integration_connections"."connection_mode" in ('deterministic_fixture', 'live')),
	CONSTRAINT "integration_connections_status_check" CHECK ("integration_connections"."status" in ('disconnected', 'configured', 'connected', 'degraded', 'disabled')),
	CONSTRAINT "integration_connections_credential_check" CHECK ("integration_connections"."connection_mode" = 'deterministic_fixture' or "integration_connections"."api_credential_id" is not null),
	CONSTRAINT "integration_connections_limits_check" CHECK ("integration_connections"."page_size" between 1 and 1000 and "integration_connections"."rate_limit_per_minute" between 1 and 10000),
	CONSTRAINT "integration_connections_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "integration_provider_health_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"connection_id" text NOT NULL,
	"status" text NOT NULL,
	"provider_key" text NOT NULL,
	"provider_version" text NOT NULL,
	"latency_ms" integer NOT NULL,
	"rate_limit_remaining" integer,
	"detail" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	CONSTRAINT "integration_health_status_check" CHECK ("integration_provider_health_checks"."status" in ('healthy', 'degraded', 'unavailable', 'misconfigured')),
	CONSTRAINT "integration_health_latency_check" CHECK ("integration_provider_health_checks"."latency_ms" >= 0),
	CONSTRAINT "integration_health_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "integration_schema_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"connection_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"schema_key" text NOT NULL,
	"direction" text NOT NULL,
	"resource_kinds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_schema_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"authored_by" text NOT NULL,
	"supersedes_version_id" text,
	CONSTRAINT "integration_schemas_number_check" CHECK ("integration_schema_versions"."version_number" >= 1),
	CONSTRAINT "integration_schemas_direction_check" CHECK ("integration_schema_versions"."direction" in ('pull', 'push', 'bidirectional')),
	CONSTRAINT "integration_schemas_status_check" CHECK ("integration_schema_versions"."status" in ('active', 'superseded', 'withdrawn')),
	CONSTRAINT "integration_schemas_hash_check" CHECK (char_length("integration_schema_versions"."source_schema_hash") = 64),
	CONSTRAINT "integration_schemas_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "integration_sync_attempts" (
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
	"status" text NOT NULL,
	"provider_key" text NOT NULL,
	"provider_version" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_hash" text,
	"cursor_before" text,
	"cursor_after" text,
	"records_read" integer DEFAULT 0 NOT NULL,
	"records_written" integer DEFAULT 0 NOT NULL,
	"records_rejected" integer DEFAULT 0 NOT NULL,
	"rate_limit_remaining" integer,
	"rate_limit_reset_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	CONSTRAINT "integration_attempts_number_check" CHECK ("integration_sync_attempts"."attempt_number" >= 1),
	CONSTRAINT "integration_attempts_status_check" CHECK ("integration_sync_attempts"."status" in ('succeeded', 'failed_retryable', 'failed_terminal')),
	CONSTRAINT "integration_attempts_counts_check" CHECK ("integration_sync_attempts"."records_read" >= 0 and "integration_sync_attempts"."records_written" >= 0 and "integration_sync_attempts"."records_rejected" >= 0),
	CONSTRAINT "integration_attempts_hash_check" CHECK (char_length("integration_sync_attempts"."request_hash") = 64 and ("integration_sync_attempts"."response_hash" is null or char_length("integration_sync_attempts"."response_hash") = 64)),
	CONSTRAINT "integration_attempts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "integration_sync_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"connection_id" text NOT NULL,
	"schema_version_id" text NOT NULL,
	"supersedes_job_id" text,
	"direction" text NOT NULL,
	"resource_kind" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"request_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cursor_before" text,
	"page_size" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"requested_by" text NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"dead_lettered_at" timestamp with time zone,
	CONSTRAINT "integration_jobs_direction_check" CHECK ("integration_sync_jobs"."direction" in ('pull', 'push')),
	CONSTRAINT "integration_jobs_status_check" CHECK ("integration_sync_jobs"."status" in ('queued', 'running', 'retry_scheduled', 'succeeded', 'dead_letter')),
	CONSTRAINT "integration_jobs_attempts_check" CHECK ("integration_sync_jobs"."attempt_count" >= 0 and "integration_sync_jobs"."max_attempts" between 1 and 10 and "integration_sync_jobs"."attempt_count" <= "integration_sync_jobs"."max_attempts"),
	CONSTRAINT "integration_jobs_page_check" CHECK ("integration_sync_jobs"."page_size" between 1 and 1000),
	CONSTRAINT "integration_jobs_hash_check" CHECK (char_length("integration_sync_jobs"."request_hash") = 64),
	CONSTRAINT "integration_jobs_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "integration_sync_receipts" (
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
	"attempt_id" text NOT NULL,
	"storage_object_id" text NOT NULL,
	"receipt_type" text NOT NULL,
	"schema_version" text NOT NULL,
	"cursor_before" text,
	"cursor_after" text,
	"page_count" integer DEFAULT 1 NOT NULL,
	"records_read" integer NOT NULL,
	"records_written" integer NOT NULL,
	"records_rejected" integer NOT NULL,
	"payload_hash" text NOT NULL,
	"source_authority" text NOT NULL,
	"source_reference" text NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "integration_receipts_type_check" CHECK ("integration_sync_receipts"."receipt_type" in ('pull_page', 'push_batch', 'webhook_intake')),
	CONSTRAINT "integration_receipts_counts_check" CHECK ("integration_sync_receipts"."page_count" >= 1 and "integration_sync_receipts"."records_read" >= 0 and "integration_sync_receipts"."records_written" >= 0 and "integration_sync_receipts"."records_rejected" >= 0),
	CONSTRAINT "integration_receipts_hash_check" CHECK (char_length("integration_sync_receipts"."payload_hash") = 64),
	CONSTRAINT "integration_receipts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "integration_webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"endpoint_id" text NOT NULL,
	"sync_job_id" text NOT NULL,
	"storage_object_id" text NOT NULL,
	"external_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"signature_timestamp" timestamp with time zone NOT NULL,
	"body_sha256" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "integration_deliveries_signature_check" CHECK ("integration_webhook_deliveries"."signature_valid" = true),
	CONSTRAINT "integration_deliveries_hash_check" CHECK (char_length("integration_webhook_deliveries"."body_sha256") = 64),
	CONSTRAINT "integration_deliveries_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "integration_webhook_endpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"connection_id" text NOT NULL,
	"api_credential_id" text NOT NULL,
	"endpoint_key" text NOT NULL,
	"event_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signature_algorithm" text NOT NULL,
	"tolerance_seconds" integer DEFAULT 300 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_rotated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "integration_webhooks_algorithm_check" CHECK ("integration_webhook_endpoints"."signature_algorithm" in ('hmac_sha256')),
	CONSTRAINT "integration_webhooks_status_check" CHECK ("integration_webhook_endpoints"."status" in ('active', 'disabled', 'rotating')),
	CONSTRAINT "integration_webhooks_tolerance_check" CHECK ("integration_webhook_endpoints"."tolerance_seconds" between 30 and 900),
	CONSTRAINT "integration_webhooks_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "integration_connection_events" ADD CONSTRAINT "integration_connection_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connection_events" ADD CONSTRAINT "integration_connection_events_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_api_credential_id_api_credentials_id_fk" FOREIGN KEY ("api_credential_id") REFERENCES "public"."api_credentials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_provider_health_checks" ADD CONSTRAINT "integration_provider_health_checks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_provider_health_checks" ADD CONSTRAINT "integration_provider_health_checks_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_schema_versions" ADD CONSTRAINT "integration_schema_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_schema_versions" ADD CONSTRAINT "integration_schema_versions_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_schema_versions" ADD CONSTRAINT "integration_schema_versions_supersedes_version_id_integration_schema_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."integration_schema_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_attempts" ADD CONSTRAINT "integration_sync_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_attempts" ADD CONSTRAINT "integration_sync_attempts_job_id_integration_sync_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."integration_sync_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_schema_version_id_integration_schema_versions_id_fk" FOREIGN KEY ("schema_version_id") REFERENCES "public"."integration_schema_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_supersedes_job_id_integration_sync_jobs_id_fk" FOREIGN KEY ("supersedes_job_id") REFERENCES "public"."integration_sync_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_receipts" ADD CONSTRAINT "integration_sync_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_receipts" ADD CONSTRAINT "integration_sync_receipts_job_id_integration_sync_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."integration_sync_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_receipts" ADD CONSTRAINT "integration_sync_receipts_attempt_id_integration_sync_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."integration_sync_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_receipts" ADD CONSTRAINT "integration_sync_receipts_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_endpoint_id_integration_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."integration_webhook_endpoints"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_sync_job_id_integration_sync_jobs_id_fk" FOREIGN KEY ("sync_job_id") REFERENCES "public"."integration_sync_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_endpoints" ADD CONSTRAINT "integration_webhook_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_endpoints" ADD CONSTRAINT "integration_webhook_endpoints_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_endpoints" ADD CONSTRAINT "integration_webhook_endpoints_api_credential_id_api_credentials_id_fk" FOREIGN KEY ("api_credential_id") REFERENCES "public"."api_credentials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_events_org_connection_idx" ON "integration_connection_events" USING btree ("organization_id","connection_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_org_key_unique" ON "integration_connections" USING btree ("organization_id","canonical_key");--> statement-breakpoint
CREATE INDEX "integration_connections_org_status_idx" ON "integration_connections" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "integration_health_org_connection_idx" ON "integration_provider_health_checks" USING btree ("organization_id","connection_id","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_schemas_org_number_unique" ON "integration_schema_versions" USING btree ("organization_id","connection_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_attempts_org_job_number_unique" ON "integration_sync_attempts" USING btree ("organization_id","job_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_jobs_org_idempotency_unique" ON "integration_sync_jobs" USING btree ("organization_id","connection_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "integration_jobs_org_queue_idx" ON "integration_sync_jobs" USING btree ("organization_id","status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_receipts_org_attempt_unique" ON "integration_sync_receipts" USING btree ("organization_id","attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_deliveries_org_event_unique" ON "integration_webhook_deliveries" USING btree ("organization_id","endpoint_id","external_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_webhooks_org_key_unique" ON "integration_webhook_endpoints" USING btree ("organization_id","endpoint_key");
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_connections_credential_tenant_guard" AFTER INSERT OR UPDATE ON "integration_connections" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."api_credential_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('api_credential_id', 'api_credentials');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_events_connection_tenant_guard" AFTER INSERT OR UPDATE ON "integration_connection_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('connection_id', 'integration_connections');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_schemas_connection_tenant_guard" AFTER INSERT OR UPDATE ON "integration_schema_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('connection_id', 'integration_connections');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_schemas_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "integration_schema_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'integration_schema_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_jobs_connection_tenant_guard" AFTER INSERT OR UPDATE ON "integration_sync_jobs" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('connection_id', 'integration_connections');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_jobs_schema_tenant_guard" AFTER INSERT OR UPDATE ON "integration_sync_jobs" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('schema_version_id', 'integration_schema_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_jobs_supersedes_tenant_guard" AFTER INSERT OR UPDATE ON "integration_sync_jobs" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW WHEN (NEW."supersedes_job_id" IS NOT NULL) EXECUTE FUNCTION fortify_require_same_organization('supersedes_job_id', 'integration_sync_jobs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_attempts_job_tenant_guard" AFTER INSERT OR UPDATE ON "integration_sync_attempts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('job_id', 'integration_sync_jobs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_receipts_job_tenant_guard" AFTER INSERT OR UPDATE ON "integration_sync_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('job_id', 'integration_sync_jobs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_receipts_attempt_tenant_guard" AFTER INSERT OR UPDATE ON "integration_sync_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('attempt_id', 'integration_sync_attempts');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_receipts_storage_tenant_guard" AFTER INSERT OR UPDATE ON "integration_sync_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_webhooks_connection_tenant_guard" AFTER INSERT OR UPDATE ON "integration_webhook_endpoints" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('connection_id', 'integration_connections');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_webhooks_credential_tenant_guard" AFTER INSERT OR UPDATE ON "integration_webhook_endpoints" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('api_credential_id', 'api_credentials');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_deliveries_endpoint_tenant_guard" AFTER INSERT OR UPDATE ON "integration_webhook_deliveries" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('endpoint_id', 'integration_webhook_endpoints');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_deliveries_job_tenant_guard" AFTER INSERT OR UPDATE ON "integration_webhook_deliveries" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('sync_job_id', 'integration_sync_jobs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_deliveries_storage_tenant_guard" AFTER INSERT OR UPDATE ON "integration_webhook_deliveries" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_health_connection_tenant_guard" AFTER INSERT OR UPDATE ON "integration_provider_health_checks" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('connection_id', 'integration_connections');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_integration_event_guard() RETURNS trigger AS $$
DECLARE connection_status text;
BEGIN
  SELECT status INTO connection_status FROM integration_connections WHERE id = NEW.connection_id AND organization_id = NEW.organization_id;
  IF connection_status IS NULL OR connection_status <> NEW.next_status THEN RAISE EXCEPTION 'integration event must match the connection current status'; END IF;
  IF NEW.event_type = 'configured' AND NEW.previous_status IS NOT NULL THEN RAISE EXCEPTION 'initial configured event cannot claim a previous status'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_events_integrity_guard" AFTER INSERT OR UPDATE ON "integration_connection_events" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_integration_event_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_integration_schema_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.version_number = 1 AND NEW.supersedes_version_id IS NOT NULL THEN RAISE EXCEPTION 'first integration schema version cannot supersede another version'; END IF;
  IF NEW.version_number > 1 AND NOT EXISTS(SELECT 1 FROM integration_schema_versions p WHERE p.id = NEW.supersedes_version_id AND p.organization_id = NEW.organization_id AND p.connection_id = NEW.connection_id AND p.version_number = NEW.version_number - 1) THEN RAISE EXCEPTION 'integration schema successor must preserve immediate connection lineage'; END IF;
  IF NOT EXISTS(SELECT 1 FROM integration_connections c WHERE c.id = NEW.connection_id AND c.organization_id = NEW.organization_id AND ((NEW.direction IN ('pull', 'push') AND c.capabilities ? NEW.direction) OR (NEW.direction = 'bidirectional' AND c.capabilities ? 'pull' AND c.capabilities ? 'push'))) THEN RAISE EXCEPTION 'integration schema direction exceeds connection capability'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_schemas_integrity_guard" AFTER INSERT OR UPDATE ON "integration_schema_versions" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_integration_schema_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_integration_job_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM integration_connections c JOIN integration_schema_versions s ON s.connection_id = c.id AND s.organization_id = c.organization_id WHERE c.id = NEW.connection_id AND c.organization_id = NEW.organization_id AND c.status IN ('connected', 'degraded') AND s.id = NEW.schema_version_id AND s.status = 'active' AND s.resource_kinds ? NEW.resource_kind AND (s.direction = 'bidirectional' OR s.direction = NEW.direction) AND c.capabilities ? NEW.direction AND NEW.page_size <= c.page_size) THEN RAISE EXCEPTION 'sync job exceeds its active connection or schema boundary'; END IF;
  IF NEW.supersedes_job_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM integration_sync_jobs p WHERE p.id = NEW.supersedes_job_id AND p.organization_id = NEW.organization_id AND p.connection_id = NEW.connection_id AND p.schema_version_id = NEW.schema_version_id AND p.request_hash = NEW.request_hash AND p.status = 'dead_letter') THEN RAISE EXCEPTION 'sync replay must preserve an exact dead-letter request lineage'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_jobs_integrity_guard" AFTER INSERT OR UPDATE ON "integration_sync_jobs" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_integration_job_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_integration_attempt_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM integration_sync_jobs j WHERE j.id = NEW.job_id AND j.organization_id = NEW.organization_id AND j.request_hash = NEW.request_hash AND j.attempt_count = NEW.attempt_number) THEN RAISE EXCEPTION 'sync attempt must bind the exact job request and current attempt number'; END IF;
  IF NEW.status = 'succeeded' AND (NEW.response_hash IS NULL OR NEW.error_code IS NOT NULL OR NEW.error_message IS NOT NULL) THEN RAISE EXCEPTION 'successful sync attempt requires a response hash and no error'; END IF;
  IF NEW.status <> 'succeeded' AND (NEW.response_hash IS NOT NULL OR NEW.error_code IS NULL OR NEW.error_message IS NULL) THEN RAISE EXCEPTION 'failed sync attempt requires an error and no response hash'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_attempts_integrity_guard" AFTER INSERT OR UPDATE ON "integration_sync_attempts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_integration_attempt_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_integration_receipt_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM integration_sync_attempts a WHERE a.id = NEW.attempt_id AND a.organization_id = NEW.organization_id AND a.job_id = NEW.job_id AND a.status = 'succeeded' AND a.response_hash = NEW.payload_hash) THEN RAISE EXCEPTION 'sync receipt must bind the successful exact attempt'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage_objects s WHERE s.id = NEW.storage_object_id AND s.organization_id = NEW.organization_id AND s.state = 'clean' AND s.scan_status = 'clean' AND s.mime_type = 'application/json' AND s.sha256 = NEW.payload_hash) THEN RAISE EXCEPTION 'sync receipt must bind exact clean stored JSON bytes'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_receipts_integrity_guard" AFTER INSERT OR UPDATE ON "integration_sync_receipts" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_integration_receipt_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_integration_webhook_endpoint_guard() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM integration_connections c WHERE c.id = NEW.connection_id AND c.organization_id = NEW.organization_id AND c.status = 'connected') THEN RAISE EXCEPTION 'webhook endpoint requires a connected integration'; END IF;
  IF NOT EXISTS(SELECT 1 FROM api_credentials a JOIN service_accounts s ON s.id = a.service_account_id AND s.organization_id = a.organization_id WHERE a.id = NEW.api_credential_id AND a.organization_id = NEW.organization_id AND a.revoked_at IS NULL AND s.revoked_at IS NULL AND s.status = 'active' AND a.scopes ? 'integration:webhook:receive') THEN RAISE EXCEPTION 'webhook endpoint requires an active scoped credential'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_webhooks_integrity_guard" AFTER INSERT OR UPDATE ON "integration_webhook_endpoints" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_integration_webhook_endpoint_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_integration_webhook_delivery_guard() RETURNS trigger AS $$
DECLARE endpoint_connection text; job_connection text;
BEGIN
  SELECT connection_id INTO endpoint_connection FROM integration_webhook_endpoints WHERE id = NEW.endpoint_id AND organization_id = NEW.organization_id AND status = 'active' AND event_types ? NEW.event_type;
  SELECT connection_id INTO job_connection FROM integration_sync_jobs WHERE id = NEW.sync_job_id AND organization_id = NEW.organization_id AND status = 'queued';
  IF endpoint_connection IS NULL OR endpoint_connection IS DISTINCT FROM job_connection THEN RAISE EXCEPTION 'webhook delivery endpoint and queued job must share one connection'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage_objects s WHERE s.id = NEW.storage_object_id AND s.organization_id = NEW.organization_id AND s.sha256 = NEW.body_sha256 AND s.state = 'quarantined' AND s.scan_status = 'pending') THEN RAISE EXCEPTION 'webhook delivery must bind exact quarantined bytes'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "integration_deliveries_integrity_guard" AFTER INSERT OR UPDATE ON "integration_webhook_deliveries" DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION fortify_integration_webhook_delivery_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_restrict_integration_connection_update() RETURNS trigger AS $$
BEGIN
  IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id OR OLD.canonical_key <> NEW.canonical_key OR OLD.name <> NEW.name OR OLD.provider_type <> NEW.provider_type OR OLD.provider_key <> NEW.provider_key OR OLD.provider_version <> NEW.provider_version OR OLD.connection_mode <> NEW.connection_mode OR OLD.configuration <> NEW.configuration OR OLD.capabilities <> NEW.capabilities OR OLD.data_classes <> NEW.data_classes OR OLD.page_size <> NEW.page_size OR OLD.rate_limit_per_minute <> NEW.rate_limit_per_minute OR OLD.owner_subject <> NEW.owner_subject THEN RAISE EXCEPTION 'integration connection identity, provider, limits, and configuration are immutable'; END IF;
  IF OLD.status = 'disabled' AND NEW.status <> 'disabled' THEN RAISE EXCEPTION 'disabled integration connection cannot be reactivated'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "integration_connections_restricted_update" BEFORE UPDATE ON "integration_connections" FOR EACH ROW EXECUTE FUNCTION fortify_restrict_integration_connection_update();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_restrict_integration_schema_update() RETURNS trigger AS $$
BEGIN
  IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id OR OLD.connection_id <> NEW.connection_id OR OLD.version_number <> NEW.version_number OR OLD.schema_key <> NEW.schema_key OR OLD.direction <> NEW.direction OR OLD.resource_kinds <> NEW.resource_kinds OR OLD.mapping <> NEW.mapping OR OLD.source_schema_hash <> NEW.source_schema_hash OR OLD.effective_at <> NEW.effective_at OR OLD.authored_by <> NEW.authored_by OR OLD.supersedes_version_id IS DISTINCT FROM NEW.supersedes_version_id THEN RAISE EXCEPTION 'integration schema substance and lineage are immutable'; END IF;
  IF NOT ((OLD.status = 'active' AND NEW.status IN ('active', 'superseded', 'withdrawn')) OR OLD.status = NEW.status) THEN RAISE EXCEPTION 'invalid integration schema lifecycle transition'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "integration_schemas_restricted_update" BEFORE UPDATE ON "integration_schema_versions" FOR EACH ROW EXECUTE FUNCTION fortify_restrict_integration_schema_update();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_restrict_integration_job_update() RETURNS trigger AS $$
BEGIN
  IF OLD.id <> NEW.id OR OLD.organization_id <> NEW.organization_id OR OLD.connection_id <> NEW.connection_id OR OLD.schema_version_id <> NEW.schema_version_id OR OLD.supersedes_job_id IS DISTINCT FROM NEW.supersedes_job_id OR OLD.direction <> NEW.direction OR OLD.resource_kind <> NEW.resource_kind OR OLD.idempotency_key <> NEW.idempotency_key OR OLD.request_hash <> NEW.request_hash OR OLD.request_payload <> NEW.request_payload OR OLD.cursor_before IS DISTINCT FROM NEW.cursor_before OR OLD.page_size <> NEW.page_size OR OLD.max_attempts <> NEW.max_attempts OR OLD.requested_by <> NEW.requested_by OR OLD.requested_at <> NEW.requested_at THEN RAISE EXCEPTION 'integration sync request and replay lineage are immutable'; END IF;
  IF NOT ((OLD.status = 'queued' AND NEW.status IN ('queued', 'running')) OR (OLD.status = 'running' AND NEW.status IN ('running', 'retry_scheduled', 'succeeded', 'dead_letter')) OR (OLD.status = 'retry_scheduled' AND NEW.status IN ('retry_scheduled', 'running')) OR OLD.status = NEW.status) THEN RAISE EXCEPTION 'invalid integration sync lifecycle transition'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "integration_jobs_restricted_update" BEFORE UPDATE ON "integration_sync_jobs" FOR EACH ROW EXECUTE FUNCTION fortify_restrict_integration_job_update();
--> statement-breakpoint
CREATE TRIGGER "integration_connections_immutable_delete" BEFORE DELETE ON "integration_connections" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_events_immutable_update" BEFORE UPDATE ON "integration_connection_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_events_immutable_delete" BEFORE DELETE ON "integration_connection_events" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_schemas_immutable_delete" BEFORE DELETE ON "integration_schema_versions" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_jobs_immutable_delete" BEFORE DELETE ON "integration_sync_jobs" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_attempts_immutable_update" BEFORE UPDATE ON "integration_sync_attempts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_attempts_immutable_delete" BEFORE DELETE ON "integration_sync_attempts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_receipts_immutable_update" BEFORE UPDATE ON "integration_sync_receipts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_receipts_immutable_delete" BEFORE DELETE ON "integration_sync_receipts" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_webhooks_immutable_update" BEFORE UPDATE ON "integration_webhook_endpoints" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_webhooks_immutable_delete" BEFORE DELETE ON "integration_webhook_endpoints" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_deliveries_immutable_update" BEFORE UPDATE ON "integration_webhook_deliveries" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_deliveries_immutable_delete" BEFORE DELETE ON "integration_webhook_deliveries" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_health_immutable_update" BEFORE UPDATE ON "integration_provider_health_checks" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "integration_health_immutable_delete" BEFORE DELETE ON "integration_provider_health_checks" FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
