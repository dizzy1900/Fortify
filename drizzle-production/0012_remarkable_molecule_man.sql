CREATE TABLE "parcels" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_system" text DEFAULT 'manual' NOT NULL,
	"source_record_id" text,
	"effective_from" date,
	"effective_to" date,
	"confidentiality_state" text DEFAULT 'tenant_confidential' NOT NULL,
	"data_right_class" text DEFAULT 'property_specific_data' NOT NULL,
	"rights_verified" boolean DEFAULT false NOT NULL,
	"property_id" text NOT NULL,
	"label" text NOT NULL,
	"parcel_number" text,
	"boundary_geojson" jsonb,
	"spatial_reference" text DEFAULT 'EPSG:4326' NOT NULL,
	"geometry_status" text DEFAULT 'unavailable' NOT NULL,
	CONSTRAINT "governed_effective_period_check" CHECK ("parcels"."effective_to" is null or "parcels"."effective_from" is null or "parcels"."effective_to" >= "parcels"."effective_from"),
	CONSTRAINT "governed_confidentiality_check" CHECK ("parcels"."confidentiality_state" in ('public', 'tenant_confidential', 'carrier_confidential', 'restricted')),
	CONSTRAINT "governed_data_right_check" CHECK ("parcels"."data_right_class" in ('raw_customer_document', 'personally_identifiable', 'property_specific_data', 'carrier_confidential_material', 'customer_specific_playbook', 'fortify_generic_ontology', 'software_telemetry', 'deidentified_derived_event', 'cross_customer_benchmark', 'model_provider_restricted')),
	CONSTRAINT "parcels_geometry_status_check" CHECK ("parcels"."geometry_status" in ('unavailable', 'unreviewed', 'confirmed', 'rejected')),
	CONSTRAINT "parcels_boundary_state_check" CHECK (("parcels"."boundary_geojson" is null and "parcels"."geometry_status" in ('unavailable', 'rejected')) or ("parcels"."boundary_geojson" is not null and "parcels"."geometry_status" in ('unreviewed', 'confirmed'))),
	CONSTRAINT "parcels_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "portfolio_properties" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_system" text DEFAULT 'manual' NOT NULL,
	"source_record_id" text,
	"effective_from" date,
	"effective_to" date,
	"confidentiality_state" text DEFAULT 'tenant_confidential' NOT NULL,
	"data_right_class" text DEFAULT 'property_specific_data' NOT NULL,
	"rights_verified" boolean DEFAULT false NOT NULL,
	"portfolio_id" text NOT NULL,
	"property_id" text NOT NULL,
	"relationship_status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "governed_effective_period_check" CHECK ("portfolio_properties"."effective_to" is null or "portfolio_properties"."effective_from" is null or "portfolio_properties"."effective_to" >= "portfolio_properties"."effective_from"),
	CONSTRAINT "governed_confidentiality_check" CHECK ("portfolio_properties"."confidentiality_state" in ('public', 'tenant_confidential', 'carrier_confidential', 'restricted')),
	CONSTRAINT "governed_data_right_check" CHECK ("portfolio_properties"."data_right_class" in ('raw_customer_document', 'personally_identifiable', 'property_specific_data', 'carrier_confidential_material', 'customer_specific_playbook', 'fortify_generic_ontology', 'software_telemetry', 'deidentified_derived_event', 'cross_customer_benchmark', 'model_provider_restricted')),
	CONSTRAINT "portfolio_properties_status_check" CHECK ("portfolio_properties"."relationship_status" in ('active', 'pending_review', 'ended')),
	CONSTRAINT "portfolio_properties_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "property_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_system" text DEFAULT 'manual' NOT NULL,
	"source_record_id" text,
	"effective_from" date,
	"effective_to" date,
	"confidentiality_state" text DEFAULT 'tenant_confidential' NOT NULL,
	"data_right_class" text DEFAULT 'property_specific_data' NOT NULL,
	"rights_verified" boolean DEFAULT false NOT NULL,
	"property_id" text NOT NULL,
	"alias" text NOT NULL,
	"alias_type" text NOT NULL,
	"review_status" text DEFAULT 'unreviewed' NOT NULL,
	CONSTRAINT "governed_effective_period_check" CHECK ("property_aliases"."effective_to" is null or "property_aliases"."effective_from" is null or "property_aliases"."effective_to" >= "property_aliases"."effective_from"),
	CONSTRAINT "governed_confidentiality_check" CHECK ("property_aliases"."confidentiality_state" in ('public', 'tenant_confidential', 'carrier_confidential', 'restricted')),
	CONSTRAINT "governed_data_right_check" CHECK ("property_aliases"."data_right_class" in ('raw_customer_document', 'personally_identifiable', 'property_specific_data', 'carrier_confidential_material', 'customer_specific_playbook', 'fortify_generic_ontology', 'software_telemetry', 'deidentified_derived_event', 'cross_customer_benchmark', 'model_provider_restricted')),
	CONSTRAINT "property_aliases_review_check" CHECK ("property_aliases"."review_status" in ('unreviewed', 'confirmed', 'rejected', 'superseded')),
	CONSTRAINT "property_aliases_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "property_portfolios" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_system" text DEFAULT 'manual' NOT NULL,
	"source_record_id" text,
	"effective_from" date,
	"effective_to" date,
	"confidentiality_state" text DEFAULT 'tenant_confidential' NOT NULL,
	"data_right_class" text DEFAULT 'property_specific_data' NOT NULL,
	"rights_verified" boolean DEFAULT false NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"primary_peril" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "governed_effective_period_check" CHECK ("property_portfolios"."effective_to" is null or "property_portfolios"."effective_from" is null or "property_portfolios"."effective_to" >= "property_portfolios"."effective_from"),
	CONSTRAINT "governed_confidentiality_check" CHECK ("property_portfolios"."confidentiality_state" in ('public', 'tenant_confidential', 'carrier_confidential', 'restricted')),
	CONSTRAINT "governed_data_right_check" CHECK ("property_portfolios"."data_right_class" in ('raw_customer_document', 'personally_identifiable', 'property_specific_data', 'carrier_confidential_material', 'customer_specific_playbook', 'fortify_generic_ontology', 'software_telemetry', 'deidentified_derived_event', 'cross_customer_benchmark', 'model_provider_restricted')),
	CONSTRAINT "property_portfolios_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "property_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_system" text DEFAULT 'manual' NOT NULL,
	"source_record_id" text,
	"effective_from" date,
	"effective_to" date,
	"confidentiality_state" text DEFAULT 'tenant_confidential' NOT NULL,
	"data_right_class" text DEFAULT 'property_specific_data' NOT NULL,
	"rights_verified" boolean DEFAULT false NOT NULL,
	"from_property_id" text NOT NULL,
	"to_property_id" text NOT NULL,
	"relationship_type" text NOT NULL,
	"scope_label" text DEFAULT '' NOT NULL,
	"review_status" text DEFAULT 'unreviewed' NOT NULL,
	CONSTRAINT "governed_effective_period_check" CHECK ("property_relationships"."effective_to" is null or "property_relationships"."effective_from" is null or "property_relationships"."effective_to" >= "property_relationships"."effective_from"),
	CONSTRAINT "governed_confidentiality_check" CHECK ("property_relationships"."confidentiality_state" in ('public', 'tenant_confidential', 'carrier_confidential', 'restricted')),
	CONSTRAINT "governed_data_right_check" CHECK ("property_relationships"."data_right_class" in ('raw_customer_document', 'personally_identifiable', 'property_specific_data', 'carrier_confidential_material', 'customer_specific_playbook', 'fortify_generic_ontology', 'software_telemetry', 'deidentified_derived_event', 'cross_customer_benchmark', 'model_provider_restricted')),
	CONSTRAINT "property_relationships_distinct_check" CHECK ("property_relationships"."from_property_id" <> "property_relationships"."to_property_id"),
	CONSTRAINT "property_relationships_review_check" CHECK ("property_relationships"."review_status" in ('unreviewed', 'confirmed', 'rejected', 'superseded')),
	CONSTRAINT "property_relationships_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "property_scopes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_system" text DEFAULT 'manual' NOT NULL,
	"source_record_id" text,
	"effective_from" date,
	"effective_to" date,
	"confidentiality_state" text DEFAULT 'tenant_confidential' NOT NULL,
	"data_right_class" text DEFAULT 'property_specific_data' NOT NULL,
	"rights_verified" boolean DEFAULT false NOT NULL,
	"property_id" text NOT NULL,
	"parcel_id" text,
	"building_id" text,
	"unit_summary_id" text,
	"scope_type" text NOT NULL,
	"label" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "governed_effective_period_check" CHECK ("property_scopes"."effective_to" is null or "property_scopes"."effective_from" is null or "property_scopes"."effective_to" >= "property_scopes"."effective_from"),
	CONSTRAINT "governed_confidentiality_check" CHECK ("property_scopes"."confidentiality_state" in ('public', 'tenant_confidential', 'carrier_confidential', 'restricted')),
	CONSTRAINT "governed_data_right_check" CHECK ("property_scopes"."data_right_class" in ('raw_customer_document', 'personally_identifiable', 'property_specific_data', 'carrier_confidential_material', 'customer_specific_playbook', 'fortify_generic_ontology', 'software_telemetry', 'deidentified_derived_event', 'cross_customer_benchmark', 'model_provider_restricted')),
	CONSTRAINT "property_scopes_type_check" CHECK ("property_scopes"."scope_type" in ('community', 'parcel', 'building', 'building_group', 'unit_summary', 'landscape_zone', 'access_route', 'shared_infrastructure')),
	CONSTRAINT "property_scopes_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "property_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_system" text DEFAULT 'manual' NOT NULL,
	"source_record_id" text,
	"effective_from" date,
	"effective_to" date,
	"confidentiality_state" text DEFAULT 'tenant_confidential' NOT NULL,
	"data_right_class" text DEFAULT 'property_specific_data' NOT NULL,
	"rights_verified" boolean DEFAULT false NOT NULL,
	"property_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"snapshot_hash" text NOT NULL,
	"change_summary" text NOT NULL,
	"supersedes_id" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "governed_effective_period_check" CHECK ("property_versions"."effective_to" is null or "property_versions"."effective_from" is null or "property_versions"."effective_to" >= "property_versions"."effective_from"),
	CONSTRAINT "governed_confidentiality_check" CHECK ("property_versions"."confidentiality_state" in ('public', 'tenant_confidential', 'carrier_confidential', 'restricted')),
	CONSTRAINT "governed_data_right_check" CHECK ("property_versions"."data_right_class" in ('raw_customer_document', 'personally_identifiable', 'property_specific_data', 'carrier_confidential_material', 'customer_specific_playbook', 'fortify_generic_ontology', 'software_telemetry', 'deidentified_derived_event', 'cross_customer_benchmark', 'model_provider_restricted')),
	CONSTRAINT "property_versions_number_check" CHECK ("property_versions"."version_number" >= 1),
	CONSTRAINT "property_versions_hash_check" CHECK (char_length("property_versions"."snapshot_hash") = 64),
	CONSTRAINT "property_versions_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
CREATE TABLE "unit_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"source_system" text DEFAULT 'manual' NOT NULL,
	"source_record_id" text,
	"effective_from" date,
	"effective_to" date,
	"confidentiality_state" text DEFAULT 'tenant_confidential' NOT NULL,
	"data_right_class" text DEFAULT 'property_specific_data' NOT NULL,
	"rights_verified" boolean DEFAULT false NOT NULL,
	"property_id" text NOT NULL,
	"building_id" text,
	"label" text NOT NULL,
	"unit_count" integer NOT NULL,
	"occupancy_type" text NOT NULL,
	CONSTRAINT "governed_effective_period_check" CHECK ("unit_summaries"."effective_to" is null or "unit_summaries"."effective_from" is null or "unit_summaries"."effective_to" >= "unit_summaries"."effective_from"),
	CONSTRAINT "governed_confidentiality_check" CHECK ("unit_summaries"."confidentiality_state" in ('public', 'tenant_confidential', 'carrier_confidential', 'restricted')),
	CONSTRAINT "governed_data_right_check" CHECK ("unit_summaries"."data_right_class" in ('raw_customer_document', 'personally_identifiable', 'property_specific_data', 'carrier_confidential_material', 'customer_specific_playbook', 'fortify_generic_ontology', 'software_telemetry', 'deidentified_derived_event', 'cross_customer_benchmark', 'model_provider_restricted')),
	CONSTRAINT "unit_summaries_count_check" CHECK ("unit_summaries"."unit_count" >= 0),
	CONSTRAINT "unit_summaries_lifecycle_check" CHECK (lifecycle_status in ('active', 'archived', 'pending_deletion', 'deleted', 'legal_hold'))
);
--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_properties" ADD CONSTRAINT "portfolio_properties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_properties" ADD CONSTRAINT "portfolio_properties_portfolio_id_property_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."property_portfolios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_properties" ADD CONSTRAINT "portfolio_properties_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_aliases" ADD CONSTRAINT "property_aliases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_aliases" ADD CONSTRAINT "property_aliases_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_portfolios" ADD CONSTRAINT "property_portfolios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_portfolios" ADD CONSTRAINT "property_portfolios_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_relationships" ADD CONSTRAINT "property_relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_relationships" ADD CONSTRAINT "property_relationships_from_property_id_properties_id_fk" FOREIGN KEY ("from_property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_relationships" ADD CONSTRAINT "property_relationships_to_property_id_properties_id_fk" FOREIGN KEY ("to_property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_scopes" ADD CONSTRAINT "property_scopes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_scopes" ADD CONSTRAINT "property_scopes_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_scopes" ADD CONSTRAINT "property_scopes_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_scopes" ADD CONSTRAINT "property_scopes_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_scopes" ADD CONSTRAINT "property_scopes_unit_summary_id_unit_summaries_id_fk" FOREIGN KEY ("unit_summary_id") REFERENCES "public"."unit_summaries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_versions" ADD CONSTRAINT "property_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_versions" ADD CONSTRAINT "property_versions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_versions" ADD CONSTRAINT "property_versions_supersedes_id_property_versions_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."property_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_summaries" ADD CONSTRAINT "unit_summaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_summaries" ADD CONSTRAINT "unit_summaries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_summaries" ADD CONSTRAINT "unit_summaries_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "parcels_org_property_label_unique" ON "parcels" USING btree ("organization_id","property_id","label");--> statement-breakpoint
CREATE INDEX "parcels_org_number_idx" ON "parcels" USING btree ("organization_id","parcel_number");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_properties_org_pair_unique" ON "portfolio_properties" USING btree ("organization_id","portfolio_id","property_id","effective_from");--> statement-breakpoint
CREATE INDEX "portfolio_properties_org_property_idx" ON "portfolio_properties" USING btree ("organization_id","property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_aliases_org_alias_unique" ON "property_aliases" USING btree ("organization_id","property_id","alias","source_system","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "property_portfolios_org_source_unique" ON "property_portfolios" USING btree ("organization_id","source_system","source_record_id");--> statement-breakpoint
CREATE INDEX "property_portfolios_org_client_idx" ON "property_portfolios" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_relationships_org_pair_unique" ON "property_relationships" USING btree ("organization_id","from_property_id","to_property_id","relationship_type","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "property_scopes_org_property_type_label_unique" ON "property_scopes" USING btree ("organization_id","property_id","scope_type","label","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "property_versions_org_property_version_unique" ON "property_versions" USING btree ("organization_id","property_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "property_versions_org_hash_unique" ON "property_versions" USING btree ("organization_id","property_id","snapshot_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_summaries_org_property_label_unique" ON "unit_summaries" USING btree ("organization_id","property_id","label","effective_from");
--> statement-breakpoint
CREATE TRIGGER "property_portfolios_client_tenant_guard"
BEFORE INSERT OR UPDATE ON property_portfolios
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('client_id', 'clients');
--> statement-breakpoint
CREATE TRIGGER "portfolio_properties_portfolio_tenant_guard"
BEFORE INSERT OR UPDATE ON portfolio_properties
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('portfolio_id', 'property_portfolios');
--> statement-breakpoint
CREATE TRIGGER "portfolio_properties_property_tenant_guard"
BEFORE INSERT OR UPDATE ON portfolio_properties
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE TRIGGER "parcels_property_tenant_guard"
BEFORE INSERT OR UPDATE ON parcels
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE TRIGGER "unit_summaries_property_tenant_guard"
BEFORE INSERT OR UPDATE ON unit_summaries
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE TRIGGER "unit_summaries_building_tenant_guard"
BEFORE INSERT OR UPDATE ON unit_summaries
FOR EACH ROW WHEN (NEW.building_id IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('building_id', 'buildings');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_unit_summary_property_guard()
RETURNS trigger AS $$
DECLARE
  building_property_id text;
BEGIN
  IF NEW.building_id IS NOT NULL THEN
    SELECT property_id INTO building_property_id FROM buildings WHERE id = NEW.building_id;
    IF building_property_id IS DISTINCT FROM NEW.property_id THEN
      RAISE EXCEPTION 'unit summary building must belong to the selected property';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "unit_summaries_property_reference_guard"
BEFORE INSERT OR UPDATE ON unit_summaries
FOR EACH ROW EXECUTE FUNCTION fortify_unit_summary_property_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_portfolio_property_client_guard()
RETURNS trigger AS $$
DECLARE
  portfolio_client_id text;
  property_client_id text;
BEGIN
  SELECT client_id INTO portfolio_client_id
    FROM property_portfolios
    WHERE id = NEW.portfolio_id;
  SELECT communities.client_id INTO property_client_id
    FROM properties
    JOIN communities ON communities.id = properties.community_id
    WHERE properties.id = NEW.property_id;
  IF property_client_id IS DISTINCT FROM portfolio_client_id THEN
    RAISE EXCEPTION 'portfolio property must belong to the portfolio client';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "portfolio_properties_client_reference_guard"
BEFORE INSERT OR UPDATE ON portfolio_properties
FOR EACH ROW EXECUTE FUNCTION fortify_portfolio_property_client_guard();
--> statement-breakpoint
CREATE TRIGGER "property_scopes_property_tenant_guard"
BEFORE INSERT OR UPDATE ON property_scopes
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE TRIGGER "property_scopes_parcel_tenant_guard"
BEFORE INSERT OR UPDATE ON property_scopes
FOR EACH ROW WHEN (NEW.parcel_id IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('parcel_id', 'parcels');
--> statement-breakpoint
CREATE TRIGGER "property_scopes_building_tenant_guard"
BEFORE INSERT OR UPDATE ON property_scopes
FOR EACH ROW WHEN (NEW.building_id IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('building_id', 'buildings');
--> statement-breakpoint
CREATE TRIGGER "property_scopes_unit_summary_tenant_guard"
BEFORE INSERT OR UPDATE ON property_scopes
FOR EACH ROW WHEN (NEW.unit_summary_id IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('unit_summary_id', 'unit_summaries');
--> statement-breakpoint
CREATE TRIGGER "property_aliases_property_tenant_guard"
BEFORE INSERT OR UPDATE ON property_aliases
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE TRIGGER "property_relationships_from_tenant_guard"
BEFORE INSERT OR UPDATE ON property_relationships
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('from_property_id', 'properties');
--> statement-breakpoint
CREATE TRIGGER "property_relationships_to_tenant_guard"
BEFORE INSERT OR UPDATE ON property_relationships
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('to_property_id', 'properties');
--> statement-breakpoint
CREATE TRIGGER "property_versions_property_tenant_guard"
BEFORE INSERT OR UPDATE ON property_versions
FOR EACH ROW EXECUTE FUNCTION fortify_require_same_organization('property_id', 'properties');
--> statement-breakpoint
CREATE TRIGGER "property_versions_supersedes_tenant_guard"
BEFORE INSERT OR UPDATE ON property_versions
FOR EACH ROW WHEN (NEW.supersedes_id IS NOT NULL)
EXECUTE FUNCTION fortify_require_same_organization('supersedes_id', 'property_versions');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_property_scope_guard()
RETURNS trigger AS $$
DECLARE
  referenced_property_id text;
BEGIN
  IF NEW.parcel_id IS NOT NULL THEN
    SELECT property_id INTO referenced_property_id FROM parcels WHERE id = NEW.parcel_id;
    IF referenced_property_id IS DISTINCT FROM NEW.property_id THEN
      RAISE EXCEPTION 'parcel scope must belong to the selected property';
    END IF;
  END IF;
  IF NEW.building_id IS NOT NULL THEN
    SELECT property_id INTO referenced_property_id FROM buildings WHERE id = NEW.building_id;
    IF referenced_property_id IS DISTINCT FROM NEW.property_id THEN
      RAISE EXCEPTION 'building scope must belong to the selected property';
    END IF;
  END IF;
  IF NEW.unit_summary_id IS NOT NULL THEN
    SELECT property_id INTO referenced_property_id FROM unit_summaries WHERE id = NEW.unit_summary_id;
    IF referenced_property_id IS DISTINCT FROM NEW.property_id THEN
      RAISE EXCEPTION 'unit summary scope must belong to the selected property';
    END IF;
  END IF;
  IF NEW.scope_type = 'parcel' AND NEW.parcel_id IS NULL THEN
    RAISE EXCEPTION 'parcel scope requires a parcel reference';
  END IF;
  IF NEW.scope_type = 'building' AND NEW.building_id IS NULL THEN
    RAISE EXCEPTION 'building scope requires a building reference';
  END IF;
  IF NEW.scope_type = 'unit_summary' AND NEW.unit_summary_id IS NULL THEN
    RAISE EXCEPTION 'unit summary scope requires a unit summary reference';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "property_scopes_reference_guard"
BEFORE INSERT OR UPDATE ON property_scopes
FOR EACH ROW EXECUTE FUNCTION fortify_property_scope_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION fortify_property_version_lineage_guard()
RETURNS trigger AS $$
DECLARE
  predecessor_property_id text;
  predecessor_version integer;
BEGIN
  IF NEW.version_number = 1 AND NEW.supersedes_id IS NOT NULL THEN
    RAISE EXCEPTION 'first property version cannot supersede another version';
  END IF;
  IF NEW.version_number > 1 AND NEW.supersedes_id IS NULL THEN
    RAISE EXCEPTION 'successor property version requires its predecessor';
  END IF;
  IF NEW.supersedes_id IS NOT NULL THEN
    SELECT property_id, version_number
      INTO predecessor_property_id, predecessor_version
      FROM property_versions
      WHERE id = NEW.supersedes_id;
    IF predecessor_property_id IS DISTINCT FROM NEW.property_id OR predecessor_version IS DISTINCT FROM NEW.version_number - 1 THEN
      RAISE EXCEPTION 'property version must supersede the immediately prior version for the same property';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "property_versions_lineage_guard"
BEFORE INSERT ON property_versions
FOR EACH ROW EXECUTE FUNCTION fortify_property_version_lineage_guard();
--> statement-breakpoint
CREATE TRIGGER "property_versions_immutable_update"
BEFORE UPDATE ON property_versions
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
--> statement-breakpoint
CREATE TRIGGER "property_versions_immutable_delete"
BEFORE DELETE ON property_versions
FOR EACH ROW EXECUTE FUNCTION fortify_reject_immutable_change();
