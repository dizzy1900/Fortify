CREATE TABLE "backup_manifest_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"backup_manifest_id" text NOT NULL,
	"storage_object_id" text NOT NULL,
	"source_key" text NOT NULL,
	"backup_key" text NOT NULL,
	"sha256" text NOT NULL,
	"size_bytes" integer NOT NULL,
	CONSTRAINT "backup_manifest_items_size_check" CHECK ("backup_manifest_items"."size_bytes" > 0),
	CONSTRAINT "backup_manifest_items_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "backup_manifests" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"provider" text NOT NULL,
	"status" text DEFAULT 'building' NOT NULL,
	"object_count" integer DEFAULT 0 NOT NULL,
	"total_bytes" integer DEFAULT 0 NOT NULL,
	"manifest_hash" text,
	"storage_key" text,
	"completed_at" timestamp with time zone,
	CONSTRAINT "backup_manifests_status_check" CHECK ("backup_manifests"."status" in ('building', 'complete', 'failed')),
	CONSTRAINT "backup_manifests_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "malware_scan_results" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"storage_object_id" text NOT NULL,
	"scanner" text NOT NULL,
	"engine_version" text NOT NULL,
	"status" text NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scanned_at" timestamp with time zone NOT NULL,
	"supersedes_id" text,
	CONSTRAINT "malware_scan_results_status_check" CHECK ("malware_scan_results"."status" in ('clean', 'infected', 'error')),
	CONSTRAINT "malware_scan_results_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "storage_access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"storage_object_id" text NOT NULL,
	"operation" text NOT NULL,
	"purpose" text NOT NULL,
	"principal_subject" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "storage_access_grants_operation_check" CHECK ("storage_access_grants"."operation" in ('upload', 'download')),
	CONSTRAINT "storage_access_grants_use_check" CHECK ("storage_access_grants"."max_uses" > 0 and "storage_access_grants"."use_count" >= 0 and "storage_access_grants"."use_count" <= "storage_access_grants"."max_uses"),
	CONSTRAINT "storage_access_grants_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "storage_objects" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"provider" text NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"checksum_algorithm" text DEFAULT 'sha256' NOT NULL,
	"encryption_mode" text NOT NULL,
	"encryption_key_id" text,
	"state" text DEFAULT 'pending_upload' NOT NULL,
	"scan_status" text DEFAULT 'pending' NOT NULL,
	"retention_until" timestamp with time zone,
	"legal_hold" boolean DEFAULT false NOT NULL,
	"legal_hold_reason" text,
	"backed_up_at" timestamp with time zone,
	"deleted_reason" text,
	CONSTRAINT "storage_objects_size_check" CHECK ("storage_objects"."size_bytes" > 0),
	CONSTRAINT "storage_objects_state_check" CHECK ("storage_objects"."state" in ('pending_upload', 'quarantined', 'scanning', 'clean', 'rejected', 'pending_deletion', 'deleted')),
	CONSTRAINT "storage_objects_scan_check" CHECK ("storage_objects"."scan_status" in ('pending', 'scanning', 'clean', 'infected', 'error')),
	CONSTRAINT "storage_objects_encryption_check" CHECK ("storage_objects"."encryption_mode" in ('AES256', 'aws:kms')),
	CONSTRAINT "storage_objects_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "backup_manifest_items" ADD CONSTRAINT "backup_manifest_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_manifest_items" ADD CONSTRAINT "backup_manifest_items_backup_manifest_id_backup_manifests_id_fk" FOREIGN KEY ("backup_manifest_id") REFERENCES "public"."backup_manifests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_manifest_items" ADD CONSTRAINT "backup_manifest_items_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_manifests" ADD CONSTRAINT "backup_manifests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "malware_scan_results" ADD CONSTRAINT "malware_scan_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "malware_scan_results" ADD CONSTRAINT "malware_scan_results_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_access_grants" ADD CONSTRAINT "storage_access_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_access_grants" ADD CONSTRAINT "storage_access_grants_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "backup_manifest_items_org_manifest_object_unique" ON "backup_manifest_items" USING btree ("organization_id","backup_manifest_id","storage_object_id");--> statement-breakpoint
CREATE INDEX "backup_manifests_org_status_idx" ON "backup_manifests" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "malware_scan_results_org_object_idx" ON "malware_scan_results" USING btree ("organization_id","storage_object_id","scanned_at");--> statement-breakpoint
CREATE INDEX "storage_access_grants_org_object_idx" ON "storage_access_grants" USING btree ("organization_id","storage_object_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "storage_objects_org_key_unique" ON "storage_objects" USING btree ("organization_id","object_key");--> statement-breakpoint
CREATE INDEX "storage_objects_org_state_idx" ON "storage_objects" USING btree ("organization_id","state","scan_status");
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "storage_access_grants_tenant_guard"
AFTER INSERT OR UPDATE ON "storage_access_grants"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "malware_scan_results_tenant_guard"
AFTER INSERT OR UPDATE ON "malware_scan_results"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "backup_manifest_items_manifest_tenant_guard"
AFTER INSERT OR UPDATE ON "backup_manifest_items"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('backup_manifest_id', 'backup_manifests');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "backup_manifest_items_object_tenant_guard"
AFTER INSERT OR UPDATE ON "backup_manifest_items"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE TRIGGER "malware_scan_results_immutable_update"
BEFORE UPDATE ON "malware_scan_results"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "malware_scan_results_immutable_delete"
BEFORE DELETE ON "malware_scan_results"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "backup_manifest_items_immutable_update"
BEFORE UPDATE ON "backup_manifest_items"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "backup_manifest_items_immutable_delete"
BEFORE DELETE ON "backup_manifest_items"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
