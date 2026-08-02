CREATE TABLE "governed_source_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_version_id" text NOT NULL,
	"consumer_type" text NOT NULL,
	"consumer_id" text NOT NULL,
	"relationship" text NOT NULL,
	"rationale" text NOT NULL,
	"pinned_at" timestamp with time zone NOT NULL,
	"pinned_by" text NOT NULL,
	CONSTRAINT "governed_source_dependencies_consumer_check" CHECK ("governed_source_dependencies"."consumer_type" in ('playbook_version', 'renewal_case')),
	CONSTRAINT "governed_source_dependencies_relationship_check" CHECK ("governed_source_dependencies"."relationship" in ('relied_on', 'reference_only')),
	CONSTRAINT "governed_source_dependencies_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "governed_source_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"publisher_subject" text NOT NULL,
	"note" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	CONSTRAINT "governed_source_publications_decision_check" CHECK ("governed_source_publications"."decision" in ('published', 'rejected')),
	CONSTRAINT "governed_source_publications_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "governed_source_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_version_id" text NOT NULL,
	"decision" text NOT NULL,
	"reviewer_subject" text NOT NULL,
	"note" text NOT NULL,
	"source_compared" boolean DEFAULT false NOT NULL,
	"rights_confirmed" boolean DEFAULT false NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "governed_source_reviews_decision_check" CHECK ("governed_source_reviews"."decision" in ('approved', 'changes_requested')),
	CONSTRAINT "governed_source_reviews_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "governed_source_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"version_label" text NOT NULL,
	"publication_date" date,
	"effective_from" date,
	"effective_to" date,
	"retrieval_date" date NOT NULL,
	"source_hash" text NOT NULL,
	"snapshot_state" text NOT NULL,
	"storage_object_id" text,
	"rights_status" text NOT NULL,
	"redistribution_allowed" boolean DEFAULT false NOT NULL,
	"use_restrictions" text NOT NULL,
	"structured_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verify_current_status" text NOT NULL,
	"next_review_date" date NOT NULL,
	"extraction_method" text NOT NULL,
	"human_confirmed" boolean DEFAULT false NOT NULL,
	"author_subject" text NOT NULL,
	"change_summary" text NOT NULL,
	"supersedes_version_id" text,
	CONSTRAINT "governed_source_versions_number_check" CHECK ("governed_source_versions"."version_number" >= 1),
	CONSTRAINT "governed_source_versions_hash_check" CHECK (char_length("governed_source_versions"."source_hash") = 64),
	CONSTRAINT "governed_source_versions_effective_period_check" CHECK ("governed_source_versions"."effective_to" is null or "governed_source_versions"."effective_from" is null or "governed_source_versions"."effective_to" >= "governed_source_versions"."effective_from"),
	CONSTRAINT "governed_source_versions_snapshot_check" CHECK ("governed_source_versions"."snapshot_state" in ('exact_bytes', 'approved_snapshot', 'metadata_only_restricted')),
	CONSTRAINT "governed_source_versions_snapshot_object_check" CHECK ("governed_source_versions"."snapshot_state" = 'metadata_only_restricted' or "governed_source_versions"."storage_object_id" is not null),
	CONSTRAINT "governed_source_versions_rights_check" CHECK ("governed_source_versions"."rights_status" in ('approved', 'restricted', 'pending')),
	CONSTRAINT "governed_source_versions_verify_check" CHECK ("governed_source_versions"."verify_current_status" in ('verified_current', 'verification_due', 'unverified', 'withdrawn')),
	CONSTRAINT "governed_source_versions_extraction_check" CHECK ("governed_source_versions"."extraction_method" in ('human_authored', 'deterministic_extraction', 'model_assisted')),
	CONSTRAINT "governed_source_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "governed_sources" (
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
	"source_class" text NOT NULL,
	"issuing_authority" text NOT NULL,
	"title" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"official_url" text NOT NULL,
	"authority_tier" text NOT NULL,
	"review_owner_subject" text NOT NULL,
	CONSTRAINT "governed_sources_class_check" CHECK ("governed_sources"."source_class" in ('statute_regulation', 'regulator_guidance', 'cal_fire_programme', 'fair_plan_rule_form', 'insurer_mga_material', 'third_party_standard', 'funding_programme', 'local_authority_requirement', 'external_model_documentation')),
	CONSTRAINT "governed_sources_authority_tier_check" CHECK ("governed_sources"."authority_tier" in ('primary', 'officially_authorized', 'customer_supplied', 'recognized_third_party')),
	CONSTRAINT "governed_sources_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "source_change_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_id" text NOT NULL,
	"from_version_id" text NOT NULL,
	"to_version_id" text NOT NULL,
	"impact_snapshot" jsonb NOT NULL,
	"owner_subject" text NOT NULL,
	"created_at_event" timestamp with time zone NOT NULL,
	CONSTRAINT "source_change_alerts_distinct_versions_check" CHECK ("source_change_alerts"."from_version_id" <> "source_change_alerts"."to_version_id"),
	CONSTRAINT "source_change_alerts_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD COLUMN "governed_source_version_id" text;--> statement-breakpoint
ALTER TABLE "governed_source_dependencies" ADD CONSTRAINT "governed_source_dependencies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_source_dependencies" ADD CONSTRAINT "governed_source_dependencies_source_version_id_governed_source_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_source_publications" ADD CONSTRAINT "governed_source_publications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_source_publications" ADD CONSTRAINT "governed_source_publications_source_version_id_governed_source_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_source_reviews" ADD CONSTRAINT "governed_source_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_source_reviews" ADD CONSTRAINT "governed_source_reviews_source_version_id_governed_source_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_source_versions" ADD CONSTRAINT "governed_source_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_source_versions" ADD CONSTRAINT "governed_source_versions_source_id_governed_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."governed_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_source_versions" ADD CONSTRAINT "governed_source_versions_storage_object_id_storage_objects_id_fk" FOREIGN KEY ("storage_object_id") REFERENCES "public"."storage_objects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_source_versions" ADD CONSTRAINT "governed_source_versions_supersedes_version_id_governed_source_versions_id_fk" FOREIGN KEY ("supersedes_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governed_sources" ADD CONSTRAINT "governed_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_change_alerts" ADD CONSTRAINT "source_change_alerts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_change_alerts" ADD CONSTRAINT "source_change_alerts_source_id_governed_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."governed_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_change_alerts" ADD CONSTRAINT "source_change_alerts_from_version_id_governed_source_versions_id_fk" FOREIGN KEY ("from_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_change_alerts" ADD CONSTRAINT "source_change_alerts_to_version_id_governed_source_versions_id_fk" FOREIGN KEY ("to_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "governed_source_dependencies_org_consumer_unique" ON "governed_source_dependencies" USING btree ("organization_id","source_version_id","consumer_type","consumer_id");--> statement-breakpoint
CREATE INDEX "governed_source_dependencies_org_source_idx" ON "governed_source_dependencies" USING btree ("organization_id","source_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "governed_source_publications_org_version_unique" ON "governed_source_publications" USING btree ("organization_id","source_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "governed_source_reviews_org_version_unique" ON "governed_source_reviews" USING btree ("organization_id","source_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "governed_source_versions_org_source_number_unique" ON "governed_source_versions" USING btree ("organization_id","source_id","version_number");--> statement-breakpoint
CREATE INDEX "governed_source_versions_org_review_idx" ON "governed_source_versions" USING btree ("organization_id","verify_current_status","next_review_date");--> statement-breakpoint
CREATE UNIQUE INDEX "governed_sources_org_key_unique" ON "governed_sources" USING btree ("organization_id","canonical_key");--> statement-breakpoint
CREATE UNIQUE INDEX "source_change_alerts_org_versions_unique" ON "source_change_alerts" USING btree ("organization_id","from_version_id","to_version_id");--> statement-breakpoint
CREATE INDEX "source_change_alerts_org_owner_idx" ON "source_change_alerts" USING btree ("organization_id","owner_subject","created_at_event");--> statement-breakpoint
ALTER TABLE "playbook_versions" ADD CONSTRAINT "playbook_versions_governed_source_version_id_governed_source_versions_id_fk" FOREIGN KEY ("governed_source_version_id") REFERENCES "public"."governed_source_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "governed_source_versions_source_tenant_guard"
AFTER INSERT OR UPDATE ON "governed_source_versions" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_id', 'governed_sources');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "governed_source_versions_storage_tenant_guard"
AFTER INSERT OR UPDATE ON "governed_source_versions" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."storage_object_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('storage_object_id', 'storage_objects');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "governed_source_versions_supersedes_tenant_guard"
AFTER INSERT OR UPDATE ON "governed_source_versions" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."supersedes_version_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('supersedes_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "governed_source_reviews_version_tenant_guard"
AFTER INSERT OR UPDATE ON "governed_source_reviews" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "governed_source_publications_version_tenant_guard"
AFTER INSERT OR UPDATE ON "governed_source_publications" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "governed_source_dependencies_version_tenant_guard"
AFTER INSERT OR UPDATE ON "governed_source_dependencies" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "source_change_alerts_source_tenant_guard"
AFTER INSERT OR UPDATE ON "source_change_alerts" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('source_id', 'governed_sources');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "source_change_alerts_from_tenant_guard"
AFTER INSERT OR UPDATE ON "source_change_alerts" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('from_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "source_change_alerts_to_tenant_guard"
AFTER INSERT OR UPDATE ON "source_change_alerts" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('to_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "playbook_versions_governed_source_tenant_guard"
AFTER INSERT OR UPDATE ON "playbook_versions" DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW WHEN (NEW."governed_source_version_id" IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('governed_source_version_id', 'governed_source_versions');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_governed_source_version_guard()
RETURNS trigger AS $$
DECLARE
  predecessor record;
  snapshot record;
BEGIN
  IF NEW.supersedes_version_id IS NOT NULL THEN
    SELECT source_id, version_number INTO predecessor
    FROM governed_source_versions
    WHERE id = NEW.supersedes_version_id
      AND organization_id = NEW.organization_id;
    IF predecessor IS NULL
      OR predecessor.source_id <> NEW.source_id
      OR predecessor.version_number <> NEW.version_number - 1 THEN
      RAISE EXCEPTION 'source successor must reference the immediately prior version';
    END IF;
  ELSIF NEW.version_number <> 1 THEN
    RAISE EXCEPTION 'source successor versions require predecessor lineage';
  END IF;
  IF NEW.storage_object_id IS NOT NULL THEN
    SELECT state, scan_status, sha256 INTO snapshot
    FROM storage_objects
    WHERE id = NEW.storage_object_id
      AND organization_id = NEW.organization_id;
    IF snapshot IS NULL OR snapshot.state <> 'clean' OR snapshot.scan_status <> 'clean' THEN
      RAISE EXCEPTION 'source snapshot must be an in-tenant clean storage object';
    END IF;
    IF snapshot.sha256 <> NEW.source_hash THEN
      RAISE EXCEPTION 'source snapshot hash must match exact stored bytes';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "governed_source_versions_lineage_snapshot_guard"
BEFORE INSERT ON "governed_source_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_governed_source_version_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_governed_source_review_guard()
RETURNS trigger AS $$
DECLARE
  source_author text;
BEGIN
  SELECT author_subject INTO source_author
  FROM governed_source_versions
  WHERE id = NEW.source_version_id
    AND organization_id = NEW.organization_id;
  IF source_author IS NULL THEN
    RAISE EXCEPTION 'source version is unavailable in this organization';
  END IF;
  IF NEW.reviewer_subject = source_author THEN
    RAISE EXCEPTION 'source authors cannot review their own version';
  END IF;
  IF NEW.decision = 'approved'
    AND (NEW.source_compared IS NOT TRUE OR NEW.rights_confirmed IS NOT TRUE) THEN
    RAISE EXCEPTION 'source approval requires exact-source comparison and rights confirmation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "governed_source_reviews_separation_guard"
BEFORE INSERT ON "governed_source_reviews"
FOR EACH ROW EXECUTE FUNCTION fortify_governed_source_review_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_governed_source_publication_guard()
RETURNS trigger AS $$
DECLARE
  version_record record;
  approved boolean;
BEGIN
  SELECT author_subject, verify_current_status, rights_status, human_confirmed
  INTO version_record
  FROM governed_source_versions
  WHERE id = NEW.source_version_id
    AND organization_id = NEW.organization_id;
  SELECT EXISTS(
    SELECT 1 FROM governed_source_reviews
    WHERE source_version_id = NEW.source_version_id
      AND organization_id = NEW.organization_id
      AND decision = 'approved'
      AND source_compared IS TRUE
      AND rights_confirmed IS TRUE
  ) INTO approved;
  IF version_record IS NULL THEN
    RAISE EXCEPTION 'source version is unavailable in this organization';
  END IF;
  IF NEW.publisher_subject = version_record.author_subject THEN
    RAISE EXCEPTION 'source authors cannot publish their own version';
  END IF;
  IF NEW.decision = 'published' AND (
    approved IS NOT TRUE
    OR version_record.verify_current_status <> 'verified_current'
    OR version_record.rights_status NOT IN ('approved', 'restricted')
    OR version_record.human_confirmed IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'publication requires independent approval, verified-current state, a rights decision, and human confirmation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "governed_source_publications_approval_guard"
BEFORE INSERT ON "governed_source_publications"
FOR EACH ROW EXECUTE FUNCTION fortify_governed_source_publication_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_governed_source_dependency_guard()
RETURNS trigger AS $$
DECLARE
  target_organization text;
  published boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM governed_source_publications
    WHERE source_version_id = NEW.source_version_id
      AND organization_id = NEW.organization_id
      AND decision = 'published'
  ) INTO published;
  IF published IS NOT TRUE THEN
    RAISE EXCEPTION 'only a published source version may be relied on';
  END IF;
  IF NEW.consumer_type = 'playbook_version' THEN
    SELECT organization_id INTO target_organization FROM playbook_versions WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'renewal_case' THEN
    SELECT organization_id INTO target_organization FROM renewal_cases WHERE id = NEW.consumer_id;
  END IF;
  IF target_organization IS NULL OR target_organization <> NEW.organization_id THEN
    RAISE EXCEPTION 'source dependency consumer is unavailable in this organization';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "governed_source_dependencies_consumer_guard"
BEFORE INSERT ON "governed_source_dependencies"
FOR EACH ROW EXECUTE FUNCTION fortify_governed_source_dependency_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_source_change_alert_guard()
RETURNS trigger AS $$
DECLARE
  previous record;
  successor record;
BEGIN
  SELECT source_id, version_number INTO previous
  FROM governed_source_versions
  WHERE id = NEW.from_version_id AND organization_id = NEW.organization_id;
  SELECT source_id, version_number, supersedes_version_id INTO successor
  FROM governed_source_versions
  WHERE id = NEW.to_version_id AND organization_id = NEW.organization_id;
  IF previous IS NULL OR successor IS NULL
    OR previous.source_id <> NEW.source_id
    OR successor.source_id <> NEW.source_id
    OR successor.supersedes_version_id <> NEW.from_version_id
    OR successor.version_number <> previous.version_number + 1 THEN
    RAISE EXCEPTION 'source change alert must describe an exact successor transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "source_change_alerts_lineage_guard"
BEFORE INSERT ON "source_change_alerts"
FOR EACH ROW EXECUTE FUNCTION fortify_source_change_alert_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_playbook_governed_source_guard()
RETURNS trigger AS $$
DECLARE
  source_record record;
BEGIN
  IF NEW.governed_source_version_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT source_id, verify_current_status INTO source_record
  FROM governed_source_versions
  WHERE id = NEW.governed_source_version_id
    AND organization_id = NEW.organization_id;
  IF source_record IS NULL OR source_record.verify_current_status <> 'verified_current'
    OR NOT EXISTS(
      SELECT 1 FROM governed_source_publications
      WHERE source_version_id = NEW.governed_source_version_id
        AND organization_id = NEW.organization_id
        AND decision = 'published'
    ) THEN
    RAISE EXCEPTION 'playbooks may pin only a published verified-current governed source version';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "playbook_versions_governed_source_publication_guard"
BEFORE INSERT ON "playbook_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_playbook_governed_source_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_playbook_review_guard()
RETURNS trigger AS $$
DECLARE
  version_author text;
  governed_version_id text;
  governed_current text;
  governed_published boolean;
BEGIN
  SELECT author_subject, governed_source_version_id
  INTO version_author, governed_version_id
  FROM playbook_versions
  WHERE id = NEW.playbook_version_id
    AND organization_id = NEW.organization_id;
  IF version_author IS NULL THEN
    RAISE EXCEPTION 'playbook version is unavailable in this organization';
  END IF;
  IF NEW.reviewer_subject = version_author THEN
    RAISE EXCEPTION 'playbook authors cannot review their own version';
  END IF;
  IF NEW.decision = 'approved' THEN
    SELECT verify_current_status INTO governed_current
    FROM governed_source_versions
    WHERE id = governed_version_id
      AND organization_id = NEW.organization_id;
    SELECT EXISTS(
      SELECT 1 FROM governed_source_publications
      WHERE source_version_id = governed_version_id
        AND organization_id = NEW.organization_id
        AND decision = 'published'
    ) INTO governed_published;
    IF governed_version_id IS NULL
      OR governed_current <> 'verified_current'
      OR governed_published IS NOT TRUE THEN
      RAISE EXCEPTION 'playbook approval requires a published verified-current governed source';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_case_playbook_link_guard()
RETURNS trigger AS $$
DECLARE
  selected_version record;
  selected_case record;
  approved boolean;
  governed_published boolean;
BEGIN
  SELECT market_id, program_id, jurisdiction, peril, property_class,
         effective_from, effective_to, governed_source_version_id
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
  SELECT EXISTS(
    SELECT 1
    FROM governed_source_versions version
    JOIN governed_source_publications publication
      ON publication.source_version_id = version.id
     AND publication.organization_id = version.organization_id
     AND publication.decision = 'published'
    WHERE version.id = selected_version.governed_source_version_id
      AND version.organization_id = NEW.organization_id
      AND version.verify_current_status = 'verified_current'
  ) INTO governed_published;
  IF selected_version IS NULL OR selected_case IS NULL
    OR approved IS NOT TRUE OR governed_published IS NOT TRUE THEN
    RAISE EXCEPTION 'only an approved playbook with a published current source may be linked';
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
CREATE TRIGGER "governed_sources_immutable_update"
BEFORE UPDATE ON "governed_sources"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "governed_sources_immutable_delete"
BEFORE DELETE ON "governed_sources"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "governed_source_versions_immutable_update"
BEFORE UPDATE ON "governed_source_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "governed_source_versions_immutable_delete"
BEFORE DELETE ON "governed_source_versions"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "governed_source_reviews_immutable_update"
BEFORE UPDATE ON "governed_source_reviews"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "governed_source_reviews_immutable_delete"
BEFORE DELETE ON "governed_source_reviews"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "governed_source_publications_immutable_update"
BEFORE UPDATE ON "governed_source_publications"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "governed_source_publications_immutable_delete"
BEFORE DELETE ON "governed_source_publications"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "governed_source_dependencies_immutable_update"
BEFORE UPDATE ON "governed_source_dependencies"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "governed_source_dependencies_immutable_delete"
BEFORE DELETE ON "governed_source_dependencies"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "source_change_alerts_immutable_update"
BEFORE UPDATE ON "source_change_alerts"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "source_change_alerts_immutable_delete"
BEFORE DELETE ON "source_change_alerts"
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
