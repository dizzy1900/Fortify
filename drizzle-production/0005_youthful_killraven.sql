CREATE TABLE "import_mapping_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"import_mapping_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"schema_version" text NOT NULL,
	"file_format" text NOT NULL,
	"sheet_name" text,
	"header_row" integer DEFAULT 1 NOT NULL,
	"column_mapping" jsonb NOT NULL,
	"constants" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" text NOT NULL,
	CONSTRAINT "import_mapping_versions_format_check" CHECK ("import_mapping_versions"."file_format" in ('csv', 'xlsx')),
	CONSTRAINT "import_mapping_versions_header_check" CHECK ("import_mapping_versions"."header_row" > 0),
	CONSTRAINT "import_mapping_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "import_mappings" (
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
	"source_system" text NOT NULL,
	"current_version_id" text,
	CONSTRAINT "import_mappings_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "import_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"portfolio_import_id" text NOT NULL,
	"receipt_type" text NOT NULL,
	"summary" jsonb NOT NULL,
	"receipt_hash" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "import_receipts_type_check" CHECK ("import_receipts"."receipt_type" in ('preview', 'commit', 'rollback')),
	CONSTRAINT "import_receipts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"portfolio_import_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"raw_data" jsonb NOT NULL,
	"normalized_data" jsonb NOT NULL,
	"status" text NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"match_candidate_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applied_entities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "import_rows_row_check" CHECK ("import_rows"."row_number" > 0),
	CONSTRAINT "import_rows_status_check" CHECK ("import_rows"."status" in ('accepted', 'rejected', 'ambiguous', 'committed', 'rolled_back')),
	CONSTRAINT "import_rows_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "portfolio_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"book_id" text NOT NULL,
	"storage_object_id" text NOT NULL,
	"mapping_version_id" text NOT NULL,
	"source_system" text NOT NULL,
	"file_format" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_hash" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'previewed' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"accepted_rows" integer DEFAULT 0 NOT NULL,
	"rejected_rows" integer DEFAULT 0 NOT NULL,
	"ambiguous_rows" integer DEFAULT 0 NOT NULL,
	"committed_rows" integer DEFAULT 0 NOT NULL,
	"created_entities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"committed_at" timestamp with time zone,
	"rolled_back_at" timestamp with time zone,
	CONSTRAINT "portfolio_imports_format_check" CHECK ("portfolio_imports"."file_format" in ('csv', 'xlsx')),
	CONSTRAINT "portfolio_imports_status_check" CHECK ("portfolio_imports"."status" in ('previewed', 'committed', 'rolled_back', 'failed')),
	CONSTRAINT "portfolio_imports_count_check" CHECK ("portfolio_imports"."total_rows" >= 0 and "portfolio_imports"."accepted_rows" >= 0 and "portfolio_imports"."rejected_rows" >= 0 and "portfolio_imports"."ambiguous_rows" >= 0 and "portfolio_imports"."committed_rows" >= 0),
	CONSTRAINT "portfolio_imports_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "import_mapping_versions" ADD CONSTRAINT "import_mapping_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_mapping_versions" ADD CONSTRAINT "import_mapping_versions_import_mapping_id_import_mappings_id_fk" FOREIGN KEY ("import_mapping_id") REFERENCES "public"."import_mappings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_receipts" ADD CONSTRAINT "import_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_receipts" ADD CONSTRAINT "import_receipts_portfolio_import_id_portfolio_imports_id_fk" FOREIGN KEY ("portfolio_import_id") REFERENCES "public"."portfolio_imports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_portfolio_import_id_portfolio_imports_id_fk" FOREIGN KEY ("portfolio_import_id") REFERENCES "public"."portfolio_imports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_imports" ADD CONSTRAINT "portfolio_imports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_imports" ADD CONSTRAINT "portfolio_imports_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_imports" ADD CONSTRAINT "portfolio_imports_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_imports" ADD CONSTRAINT "portfolio_imports_mapping_version_id_import_mapping_versions_id_fk" FOREIGN KEY ("mapping_version_id") REFERENCES "public"."import_mapping_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "import_mapping_versions_org_mapping_version_unique" ON "import_mapping_versions" USING btree ("organization_id","import_mapping_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "import_mappings_org_name_unique" ON "import_mappings" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "import_receipts_org_hash_unique" ON "import_receipts" USING btree ("organization_id","receipt_hash");--> statement-breakpoint
CREATE INDEX "import_receipts_org_import_idx" ON "import_receipts" USING btree ("organization_id","portfolio_import_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "import_rows_org_import_row_unique" ON "import_rows" USING btree ("organization_id","portfolio_import_id","row_number");--> statement-breakpoint
CREATE INDEX "import_rows_org_status_idx" ON "import_rows" USING btree ("organization_id","portfolio_import_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_imports_org_idempotency_unique" ON "portfolio_imports" USING btree ("organization_id","source_system","idempotency_key");--> statement-breakpoint
CREATE INDEX "portfolio_imports_org_status_idx" ON "portfolio_imports" USING btree ("organization_id","status","created_at");
--> statement-breakpoint
ALTER TABLE "import_mappings" ADD CONSTRAINT "import_mappings_current_version_id_import_mapping_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."import_mapping_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TRIGGER "import_mapping_versions_tenant_guard"
BEFORE INSERT OR UPDATE ON "import_mapping_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('import_mapping_id', 'import_mappings');
--> statement-breakpoint
CREATE TRIGGER "import_mappings_current_version_tenant_guard"
BEFORE INSERT OR UPDATE ON "import_mappings"
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('current_version_id', 'import_mapping_versions');
--> statement-breakpoint
CREATE TRIGGER "portfolio_imports_book_tenant_guard"
BEFORE INSERT OR UPDATE ON "portfolio_imports"
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('book_id', 'books');
--> statement-breakpoint
CREATE TRIGGER "portfolio_imports_storage_tenant_guard"
BEFORE INSERT OR UPDATE ON "portfolio_imports"
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE TRIGGER "portfolio_imports_mapping_tenant_guard"
BEFORE INSERT OR UPDATE ON "portfolio_imports"
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('mapping_version_id', 'import_mapping_versions');
--> statement-breakpoint
CREATE TRIGGER "import_rows_tenant_guard"
BEFORE INSERT OR UPDATE ON "import_rows"
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('portfolio_import_id', 'portfolio_imports');
--> statement-breakpoint
CREATE TRIGGER "import_receipts_tenant_guard"
BEFORE INSERT OR UPDATE ON "import_receipts"
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('portfolio_import_id', 'portfolio_imports');
--> statement-breakpoint
CREATE TRIGGER "import_mapping_versions_immutable_update"
BEFORE UPDATE ON "import_mapping_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "import_mapping_versions_immutable_delete"
BEFORE DELETE ON "import_mapping_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "import_receipts_immutable_update"
BEFORE UPDATE ON "import_receipts"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "import_receipts_immutable_delete"
BEFORE DELETE ON "import_receipts"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
