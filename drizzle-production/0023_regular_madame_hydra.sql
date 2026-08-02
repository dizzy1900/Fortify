ALTER TABLE "governed_source_dependencies" DROP CONSTRAINT "governed_source_dependencies_consumer_check";--> statement-breakpoint
ALTER TABLE "governed_source_dependencies" DROP CONSTRAINT "governed_source_dependencies_relationship_check";--> statement-breakpoint
ALTER TABLE "governed_source_dependencies" ADD CONSTRAINT "governed_source_dependencies_consumer_check" CHECK ("governed_source_dependencies"."consumer_type" in ('playbook_version', 'renewal_case', 'target_profile_version', 'external_model_version', 'market_commitment_version', 'analytics_report'));--> statement-breakpoint
ALTER TABLE "governed_source_dependencies" ADD CONSTRAINT "governed_source_dependencies_relationship_check" CHECK ("governed_source_dependencies"."relationship" in ('relied_on', 'reference_only', 'input_lineage'));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_governed_source_dependency_guard() RETURNS trigger AS $$
DECLARE target_organization text; published boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM governed_source_publications WHERE source_version_id = NEW.source_version_id AND organization_id = NEW.organization_id AND decision = 'published') INTO published;
  IF published IS NOT TRUE THEN RAISE EXCEPTION 'only a published source version may be relied on'; END IF;
  IF NEW.consumer_type = 'playbook_version' THEN SELECT organization_id INTO target_organization FROM playbook_versions WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'renewal_case' THEN SELECT organization_id INTO target_organization FROM renewal_cases WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'target_profile_version' THEN SELECT organization_id INTO target_organization FROM target_profile_versions WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'external_model_version' THEN SELECT organization_id INTO target_organization FROM external_model_versions WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'market_commitment_version' THEN SELECT organization_id INTO target_organization FROM market_commitment_versions WHERE id = NEW.consumer_id;
  ELSIF NEW.consumer_type = 'analytics_report' THEN SELECT organization_id INTO target_organization FROM analytics_reports WHERE id = NEW.consumer_id;
  END IF;
  IF target_organization IS NULL OR target_organization <> NEW.organization_id THEN RAISE EXCEPTION 'source dependency consumer is unavailable in this organization'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
