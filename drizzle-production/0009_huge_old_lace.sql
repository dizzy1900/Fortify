CREATE TABLE "case_playbook_links" (
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
	"playbook_version_id" text NOT NULL,
	"destination_market_id" text NOT NULL,
	"destination_program_id" text,
	"linked_at" timestamp with time zone NOT NULL,
	"linked_by" text NOT NULL,
	"supersedes_link_id" text,
	CONSTRAINT "case_playbook_links_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "market_playbooks" (
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
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "market_playbooks_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "playbook_applicability_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"playbook_requirement_id" text NOT NULL,
	"position" integer NOT NULL,
	"field" text NOT NULL,
	"operator" text NOT NULL,
	"expected_values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "playbook_applicability_rules_field_check" CHECK ("playbook_applicability_rules"."field" in ('market_id', 'program_id', 'jurisdiction', 'peril', 'property_class', 'policy_form')),
	CONSTRAINT "playbook_applicability_rules_operator_check" CHECK ("playbook_applicability_rules"."operator" in ('equals', 'not_equals', 'one_of', 'not_one_of')),
	CONSTRAINT "playbook_applicability_rules_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "playbook_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"playbook_version_id" text NOT NULL,
	"requirement_version_id" text NOT NULL,
	"position" integer NOT NULL,
	"importance" text NOT NULL,
	"blocking" boolean DEFAULT false NOT NULL,
	"accepted_evidence_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"freshness_days" integer,
	"required_scope_type" text NOT NULL,
	"accepted_source_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_review_status" text DEFAULT 'human_confirmed' NOT NULL,
	"deadline_days_before" integer,
	"template_key" text,
	"delivery_requirement" text,
	"caveat" text,
	CONSTRAINT "playbook_requirements_importance_check" CHECK ("playbook_requirements"."importance" in ('required', 'recommended')),
	CONSTRAINT "playbook_requirements_freshness_check" CHECK ("playbook_requirements"."freshness_days" is null or "playbook_requirements"."freshness_days" >= 0),
	CONSTRAINT "playbook_requirements_deadline_check" CHECK ("playbook_requirements"."deadline_days_before" is null or "playbook_requirements"."deadline_days_before" >= 0),
	CONSTRAINT "playbook_requirements_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "playbook_version_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"playbook_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"note" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "playbook_version_reviews_decision_check" CHECK ("playbook_version_reviews"."decision" in ('approved', 'changes_requested')),
	CONSTRAINT "playbook_version_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "playbook_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"playbook_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"market_id" text NOT NULL,
	"program_id" text,
	"jurisdiction" text NOT NULL,
	"peril" text NOT NULL,
	"property_class" text NOT NULL,
	"policy_form" text,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"source_name" text NOT NULL,
	"source_url" text NOT NULL,
	"source_version" text NOT NULL,
	"source_citation" text NOT NULL,
	"verify_current" boolean DEFAULT true NOT NULL,
	"change_summary" text NOT NULL,
	"content_hash" text NOT NULL,
	"author_subject" text NOT NULL,
	"supersedes_version_id" text,
	CONSTRAINT "playbook_versions_number_check" CHECK ("playbook_versions"."version_number" >= 1),
	CONSTRAINT "playbook_versions_effective_period_check" CHECK ("playbook_versions"."effective_to" is null or "playbook_versions"."effective_to" >= "playbook_versions"."effective_from"),
	CONSTRAINT "playbook_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "case_playbook_links" ADD CONSTRAINT "case_playbook_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_playbook_links" ADD CONSTRAINT "case_playbook_links_case_id_renewal_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."renewal_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_playbook_links" ADD CONSTRAINT "case_playbook_links_playbook_version_id_playbook_versions_id_fk" FOREIGN KEY ("playbook_version_id") REFERENCES "public"."playbook_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_playbook_links" ADD CONSTRAINT "case_playbook_links_destination_market_id_markets_id_fk" FOREIGN KEY ("destination_market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_playbook_links" ADD CONSTRAINT "case_playbook_links_destination_program_id_programs_id_fk" FOREIGN KEY ("destination_program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_playbook_links" ADD CONSTRAINT "case_playbook_links_supersedes_link_id_case_playbook_links_id_fk" FOREIGN KEY ("supersedes_link_id") REFERENCES "public"."case_playbook_links"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_playbooks" ADD CONSTRAINT "market_playbooks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_applicability_rules" ADD CONSTRAINT "playbook_applicability_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_applicability_rules" ADD CONSTRAINT "playbook_applicability_rules_playbook_requirement_id_playbook_requirements_id_fk" FOREIGN KEY ("playbook_requirement_id") REFERENCES "public"."playbook_requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_requirements" ADD CONSTRAINT "playbook_requirements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_requirements" ADD CONSTRAINT "playbook_requirements_playbook_version_id_playbook_versions_id_fk" FOREIGN KEY ("playbook_version_id") REFERENCES "public"."playbook_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_requirements" ADD CONSTRAINT "playbook_requirements_requirement_version_id_requirement_versions_id_fk" FOREIGN KEY ("requirement_version_id") REFERENCES "public"."requirement_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_version_reviews" ADD CONSTRAINT "playbook_version_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_version_reviews" ADD CONSTRAINT "playbook_version_reviews_playbook_version_id_playbook_versions_id_fk" FOREIGN KEY ("playbook_version_id") REFERENCES "public"."playbook_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_playbook_id_market_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."market_playbooks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_supersedes_version_id_playbook_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."playbook_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_playbook_links_org_case_destination_idx" ON "case_playbook_links" USING btree ("organization_id","case_id","destination_market_id","destination_program_id","linked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "market_playbooks_org_name_unique" ON "market_playbooks" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "playbook_applicability_rules_org_requirement_position_unique" ON "playbook_applicability_rules" USING btree ("organization_id","playbook_requirement_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "playbook_requirements_org_version_requirement_unique" ON "playbook_requirements" USING btree ("organization_id","playbook_version_id","requirement_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "playbook_requirements_org_version_position_unique" ON "playbook_requirements" USING btree ("organization_id","playbook_version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "playbook_version_reviews_org_version_unique" ON "playbook_version_reviews" USING btree ("organization_id","playbook_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "playbook_versions_org_playbook_number_unique" ON "playbook_versions" USING btree ("organization_id","playbook_id","version_number");--> statement-breakpoint
CREATE INDEX "playbook_versions_org_scope_effective_idx" ON "playbook_versions" USING btree ("organization_id","market_id","program_id","jurisdiction","peril","property_class","effective_from");
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "playbook_versions_playbook_tenant_guard"
AFTER INSERT OR UPDATE ON "playbook_versions" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('playbook_id', 'market_playbooks');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "playbook_versions_market_tenant_guard"
AFTER INSERT OR UPDATE ON "playbook_versions" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('market_id', 'markets');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "playbook_versions_program_tenant_guard"
AFTER INSERT OR UPDATE ON "playbook_versions" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."program_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('program_id', 'programs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "playbook_versions_supersedes_tenant_guard"
AFTER INSERT OR UPDATE ON "playbook_versions" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'playbook_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "playbook_requirements_version_tenant_guard"
AFTER INSERT OR UPDATE ON "playbook_requirements" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('playbook_version_id', 'playbook_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "playbook_requirements_requirement_tenant_guard"
AFTER INSERT OR UPDATE ON "playbook_requirements" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('requirement_version_id', 'requirement_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "playbook_applicability_rules_requirement_tenant_guard"
AFTER INSERT OR UPDATE ON "playbook_applicability_rules" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('playbook_requirement_id', 'playbook_requirements');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "playbook_version_reviews_version_tenant_guard"
AFTER INSERT OR UPDATE ON "playbook_version_reviews" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('playbook_version_id', 'playbook_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "case_playbook_links_case_tenant_guard"
AFTER INSERT OR UPDATE ON "case_playbook_links" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('case_id', 'renewal_cases');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "case_playbook_links_version_tenant_guard"
AFTER INSERT OR UPDATE ON "case_playbook_links" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('playbook_version_id', 'playbook_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "case_playbook_links_market_tenant_guard"
AFTER INSERT OR UPDATE ON "case_playbook_links" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('destination_market_id', 'markets');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "case_playbook_links_program_tenant_guard"
AFTER INSERT OR UPDATE ON "case_playbook_links" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."destination_program_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('destination_program_id', 'programs');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "case_playbook_links_supersedes_tenant_guard"
AFTER INSERT OR UPDATE ON "case_playbook_links" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."supersedes_link_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('supersedes_link_id', 'case_playbook_links');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_playbook_review_guard()
RETURNS trigger AS $$
DECLARE
  version_author text;
  source_current boolean;
BEGIN
  SELECT author_subject, verify_current
  INTO version_author, source_current
  FROM playbook_versions
  WHERE id = NEW.playbook_version_id
    AND organization_id = NEW.organization_id;
  IF version_author IS NULL THEN
    RAISE EXCEPTION 'playbook version is unavailable in this organization';
  END IF;
  IF NEW.reviewer_subject = version_author THEN
    RAISE EXCEPTION 'playbook authors cannot review their own version';
  END IF;
  IF NEW.decision = 'approved' AND source_current IS NOT TRUE THEN
    RAISE EXCEPTION 'playbook source must be verified current before approval';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "playbook_version_reviews_separation_guard"
BEFORE INSERT ON "playbook_version_reviews"
FOR EACH ROW EXECUTE FUNCTION fortify_playbook_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_playbook_version_scope_guard()
RETURNS trigger AS $$
DECLARE
  selected_program_market text;
  predecessor record;
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    SELECT market_id INTO selected_program_market
    FROM programs
    WHERE id = NEW.program_id
      AND organization_id = NEW.organization_id;
    IF selected_program_market IS NULL OR selected_program_market <> NEW.market_id THEN
      RAISE EXCEPTION 'playbook program must belong to the selected market';
    END IF;
  END IF;
  IF NEW.supersedes_version_id IS NOT NULL THEN
    SELECT playbook_id, version_number INTO predecessor
    FROM playbook_versions
    WHERE id = NEW.supersedes_version_id
      AND organization_id = NEW.organization_id;
    IF predecessor IS NULL
      OR predecessor.playbook_id <> NEW.playbook_id
      OR predecessor.version_number <> NEW.version_number - 1 THEN
      RAISE EXCEPTION 'playbook successor must reference the immediately prior version';
    END IF;
  ELSIF NEW.version_number <> 1 THEN
    RAISE EXCEPTION 'playbook successor versions require predecessor lineage';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "playbook_versions_scope_lineage_guard"
BEFORE INSERT ON "playbook_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_playbook_version_scope_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_case_playbook_link_guard()
RETURNS trigger AS $$
DECLARE
  selected_version record;
  selected_case record;
  approved boolean;
BEGIN
  SELECT market_id, program_id, jurisdiction, peril, property_class,
         effective_from, effective_to
  INTO selected_version
  FROM playbook_versions
  WHERE id = NEW.playbook_version_id
    AND organization_id = NEW.organization_id;
  SELECT jurisdiction, peril, property_class, renewal_date
  INTO selected_case
  FROM renewal_cases
  WHERE id = NEW.case_id
    AND organization_id = NEW.organization_id;
  SELECT EXISTS(
    SELECT 1 FROM playbook_version_reviews
    WHERE playbook_version_id = NEW.playbook_version_id
      AND organization_id = NEW.organization_id
      AND decision = 'approved'
  ) INTO approved;
  IF selected_version IS NULL OR selected_case IS NULL OR approved IS NOT TRUE THEN
    RAISE EXCEPTION 'only an approved in-tenant playbook version may be linked';
  END IF;
  IF selected_version.market_id <> NEW.destination_market_id
    OR selected_version.program_id IS DISTINCT FROM NEW.destination_program_id
    OR selected_version.jurisdiction <> selected_case.jurisdiction
    OR selected_version.peril <> selected_case.peril
    OR selected_version.property_class <> selected_case.property_class
    OR selected_case.renewal_date < selected_version.effective_from
    OR (selected_version.effective_to IS NOT NULL
        AND selected_case.renewal_date > selected_version.effective_to) THEN
    RAISE EXCEPTION 'playbook version is not applicable to this case destination';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "case_playbook_links_applicability_guard"
BEFORE INSERT ON "case_playbook_links"
FOR EACH ROW EXECUTE FUNCTION fortify_case_playbook_link_guard();
--> statement-breakpoint
CREATE TRIGGER "playbook_versions_immutable_update"
BEFORE UPDATE ON "playbook_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "playbook_versions_immutable_delete"
BEFORE DELETE ON "playbook_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "playbook_requirements_immutable_update"
BEFORE UPDATE ON "playbook_requirements"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "playbook_requirements_immutable_delete"
BEFORE DELETE ON "playbook_requirements"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "playbook_applicability_rules_immutable_update"
BEFORE UPDATE ON "playbook_applicability_rules"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "playbook_applicability_rules_immutable_delete"
BEFORE DELETE ON "playbook_applicability_rules"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "playbook_version_reviews_immutable_update"
BEFORE UPDATE ON "playbook_version_reviews"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "playbook_version_reviews_immutable_delete"
BEFORE DELETE ON "playbook_version_reviews"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "case_playbook_links_immutable_update"
BEFORE UPDATE ON "case_playbook_links"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "case_playbook_links_immutable_delete"
BEFORE DELETE ON "case_playbook_links"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
