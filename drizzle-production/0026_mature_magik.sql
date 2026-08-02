CREATE TABLE "request_rate_limit_windows" (
	"bucket_hash" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"request_count" integer NOT NULL,
	"request_limit" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "request_rate_limit_counts_check" CHECK ("request_rate_limit_windows"."request_count" > 0 and "request_rate_limit_windows"."request_limit" > 0)
);
--> statement-breakpoint
CREATE INDEX "request_rate_limit_expiry_idx" ON "request_rate_limit_windows" USING btree ("expires_at");
--> statement-breakpoint
DO $$
DECLARE tenant_table record;
BEGIN
  FOR tenant_table IN
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'organization_id'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tenant_table.table_name);
    EXECUTE format(
      'CREATE POLICY fortify_tenant_isolation ON public.%I USING (organization_id = nullif(current_setting(''fortify.organization_id'', true), '''')) WITH CHECK (organization_id = nullif(current_setting(''fortify.organization_id'', true), ''''))',
      tenant_table.table_name
    );
  END LOOP;
END $$;
