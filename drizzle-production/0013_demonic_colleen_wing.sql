CREATE TABLE "data_access_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"principal_type" text NOT NULL,
	"actor_subject" text NOT NULL,
	"access_purpose" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"action" text NOT NULL,
	"outcome" text NOT NULL,
	"portfolio_id" text,
	"case_id" text,
	"data_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"request_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_access_logs_principal_check" CHECK ("data_access_logs"."principal_type" in ('membership', 'external_collaborator', 'external_reviewer', 'service_account', 'support_administrator')),
	CONSTRAINT "data_access_logs_action_check" CHECK ("data_access_logs"."action" in ('read', 'create', 'update', 'delete', 'manage', 'upload', 'download')),
	CONSTRAINT "data_access_logs_outcome_check" CHECK ("data_access_logs"."outcome" in ('allowed', 'denied')),
	CONSTRAINT "data_access_logs_purpose_check" CHECK (char_length(trim("data_access_logs"."access_purpose")) >= 8),
	CONSTRAINT "data_access_logs_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "portfolio_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"portfolio_id" text NOT NULL,
	"membership_id" text,
	"team_id" text,
	"external_principal_id" text,
	"assignment_role" text NOT NULL,
	"access_purpose" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	CONSTRAINT "portfolio_assignments_one_principal_check" CHECK ((("portfolio_assignments"."membership_id" is not null)::integer + ("portfolio_assignments"."team_id" is not null)::integer + ("portfolio_assignments"."external_principal_id" is not null)::integer) = 1),
	CONSTRAINT "portfolio_assignments_role_check" CHECK ("portfolio_assignments"."assignment_role" in ('owner', 'manager', 'contributor', 'verifier', 'reviewer', 'auditor')),
	CONSTRAINT "portfolio_assignments_purpose_check" CHECK (char_length(trim("portfolio_assignments"."access_purpose")) >= 8),
	CONSTRAINT "portfolio_assignments_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_role_check";--> statement-breakpoint
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_portfolio_id_property_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."property_portfolios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_assignments" ADD CONSTRAINT "portfolio_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_assignments" ADD CONSTRAINT "portfolio_assignments_portfolio_id_property_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."property_portfolios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_assignments" ADD CONSTRAINT "portfolio_assignments_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_assignments" ADD CONSTRAINT "portfolio_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_assignments" ADD CONSTRAINT "portfolio_assignments_external_principal_id_external_principals_id_fk" FOREIGN KEY ("external_principal_id") REFERENCES "public"."external_principals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_access_logs_org_time_idx" ON "data_access_logs" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "data_access_logs_org_resource_idx" ON "data_access_logs" USING btree ("organization_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "portfolio_assignments_org_portfolio_idx" ON "portfolio_assignments" USING btree ("organization_id","portfolio_id");--> statement-breakpoint
CREATE INDEX "portfolio_assignments_org_membership_idx" ON "portfolio_assignments" USING btree ("organization_id","membership_id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_check" CHECK ("memberships"."role" in ('organization_owner', 'brokerage_administrator', 'practice_leader', 'broker', 'marketer', 'assistant', 'property_operator_administrator', 'property_manager', 'client_property_manager', 'board_contributor', 'contractor_evidence_contributor', 'evidence_contributor', 'independent_verifier', 'programme_administrator', 'insurer_mga_reviewer', 'underwriter_reviewer', 'lender_funder_reviewer', 'read_only_auditor'));
--> statement-breakpoint
CREATE TRIGGER tenant_guard_portfolio_assignments_portfolio
BEFORE INSERT OR UPDATE ON "portfolio_assignments" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('portfolio_id', 'property_portfolios');
--> statement-breakpoint
CREATE TRIGGER tenant_guard_portfolio_assignments_membership
BEFORE INSERT OR UPDATE ON "portfolio_assignments" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('membership_id', 'memberships');
--> statement-breakpoint
CREATE TRIGGER tenant_guard_portfolio_assignments_team
BEFORE INSERT OR UPDATE ON "portfolio_assignments" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('team_id', 'teams');
--> statement-breakpoint
CREATE TRIGGER tenant_guard_portfolio_assignments_external_principal
BEFORE INSERT OR UPDATE ON "portfolio_assignments" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('external_principal_id', 'external_principals');
--> statement-breakpoint
CREATE TRIGGER tenant_guard_data_access_logs_portfolio
BEFORE INSERT ON "data_access_logs" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('portfolio_id', 'property_portfolios');
--> statement-breakpoint
CREATE TRIGGER tenant_guard_data_access_logs_case
BEFORE INSERT ON "data_access_logs" FOR EACH ROW
EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_guard_assignment_revocation()
RETURNS trigger AS $$
BEGIN
  IF to_jsonb(NEW) - ARRAY['updated_at', 'updated_by', 'revision', 'revoked_at', 'revocation_reason']
       IS DISTINCT FROM
     to_jsonb(OLD) - ARRAY['updated_at', 'updated_by', 'revision', 'revoked_at', 'revocation_reason'] THEN
    RAISE EXCEPTION '% assignments are immutable except for revocation', TG_TABLE_NAME;
  END IF;
  IF OLD.revoked_at IS NOT NULL
     OR NEW.revoked_at IS NULL
     OR char_length(trim(coalesce(NEW.revocation_reason, ''))) < 4
     OR NEW.revision IS DISTINCT FROM OLD.revision + 1 THEN
    RAISE EXCEPTION '% assignment revocation requires a reason and one revision increment', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER portfolio_assignments_revocation_only
BEFORE UPDATE ON "portfolio_assignments"
FOR EACH ROW EXECUTE FUNCTION fortify_guard_assignment_revocation();
--> statement-breakpoint
CREATE TRIGGER data_access_logs_no_update
BEFORE UPDATE ON "data_access_logs"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER data_access_logs_no_delete
BEFORE DELETE ON "data_access_logs"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
