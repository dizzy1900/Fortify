"use client";

import {
  AlertTriangle,
  Archive,
  Building2,
  CheckCircle2,
  Database,
  FileClock,
  Fingerprint,
  GitBranch,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MapPinned,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PropertyGraphWorkspaceResponse } from "@/lib/contracts/property-graph";

type RuntimeMode = "sandbox" | "production";
type Workspace = PropertyGraphWorkspaceResponse;

const governed = {
  sourceSystem: "fortify-california-development-fixture",
  effectiveFrom: "2026-08-01",
  confidentialityState: "tenant_confidential",
  dataRightClass: "property_specific_data",
  rightsVerified: true,
};

const fixtureWorkspace: Workspace = {
  organization: {
    id: "org-fortify-california-fixture",
    name: "Fortify California development fixture",
    environment: "sandbox",
    synthetic: true,
  },
  portfolios: [
    {
      id: "portfolio-california-fixture",
      name: "Fictional California catastrophe-property book",
      jurisdiction: "US-CA",
      primaryPeril: "wildfire",
      description:
        "Synthetic development fixture for property identity, scope, provenance, and insufficient spatial data.",
      propertyIds: [
        "property-ca-fixture-sierra-vista",
        "property-ca-fixture-canyon-court",
      ],
      ...governed,
    },
  ],
  properties: [
    {
      id: "property-ca-fixture-sierra-vista",
      name: "Fictional Sierra Vista Condominiums",
      propertyClass: "condominium",
      unitCount: 48,
      buildingCount: 3,
      community: {
        name: "Fictional Sierra Vista Condominiums",
        summary: "Synthetic California multi-building association fixture.",
      },
      location: {
        addressLine1: "100 Fictional Ridge Drive",
        city: "Nevada City",
        region: "CA",
        postalCode: "95959",
        county: "Nevada",
      },
      buildings: [
        { id: "building-ca-fixture-sierra-a", label: "Building A", constructionYear: 1998 },
      ],
      parcels: [
        {
          id: "parcel-ca-fixture-sierra",
          label: "Primary association parcel",
          parcelNumber: "FIXTURE-APN-001",
          geometryStatus: "unavailable",
          spatialReference: "EPSG:4326",
          boundaryGeojson: null,
          ...governed,
        },
      ],
      unitSummaries: [
        {
          id: "unit-summary-ca-fixture-sierra",
          label: "Residential unit summary",
          unitCount: 48,
          occupancyType: "condominium_residential",
          ...governed,
        },
      ],
      scopes: [
        ["community", "Entire fictional association"],
        ["parcel", "Primary parcel"],
        ["building_group", "Buildings A and B"],
        ["landscape_zone", "Shared landscape zone"],
      ].map(([scopeType, label], index) => ({
        id: `scope-sierra-${index}`,
        scopeType,
        label,
        details:
          scopeType === "landscape_zone"
            ? { geometryStatus: "unavailable" }
            : {},
        ...governed,
      })),
      aliases: [
        {
          id: "alias-ca-fixture-sierra",
          alias: "Fictional Sierra Vista HOA",
          aliasType: "association_name",
          reviewStatus: "confirmed",
          ...governed,
        },
      ],
      versions: [
        {
          id: "property-version-ca-fixture-sierra-v1",
          versionNumber: 1,
          snapshotHash:
            "08c38cc9f1d599121d7cb9d63c3416985d065d84c1c04ffccaa04003a4152edb",
          changeSummary: "Initial synthetic California property baseline.",
          recordedAt: "2026-08-01T12:00:00.000Z",
          ...governed,
        },
      ],
    },
    {
      id: "property-ca-fixture-canyon-court",
      name: "Fictional Canyon Court Townhomes",
      propertyClass: "townhome_community",
      unitCount: 32,
      buildingCount: 4,
      community: {
        name: "Fictional Canyon Court Townhomes",
        summary: "Synthetic California townhome association fixture.",
      },
      location: {
        addressLine1: "200 Fictional Canyon Court",
        city: "Auburn",
        region: "CA",
        postalCode: "95603",
        county: "Placer",
      },
      buildings: [
        { id: "building-ca-fixture-canyon-a", label: "Building A", constructionYear: 2004 },
      ],
      parcels: [
        {
          id: "parcel-ca-fixture-canyon",
          label: "Primary association parcel",
          parcelNumber: "FIXTURE-APN-002",
          geometryStatus: "unavailable",
          spatialReference: "EPSG:4326",
          boundaryGeojson: null,
          ...governed,
        },
      ],
      unitSummaries: [
        {
          id: "unit-summary-ca-fixture-canyon",
          label: "Residential unit summary",
          unitCount: 32,
          occupancyType: "townhome_residential",
          ...governed,
        },
      ],
      scopes: [
        {
          id: "scope-canyon-route",
          scopeType: "access_route",
          label: "Shared access route",
          details: { geometryStatus: "unavailable" },
          ...governed,
        },
        {
          id: "scope-canyon-infrastructure",
          scopeType: "shared_infrastructure",
          label: "Shared water infrastructure",
          details: { sourceStatus: "fixture_only" },
          ...governed,
        },
      ],
      aliases: [
        {
          id: "alias-ca-fixture-canyon",
          alias: "Fictional Canyon Court Association",
          aliasType: "association_name",
          reviewStatus: "confirmed",
          ...governed,
        },
      ],
      versions: [
        {
          id: "property-version-ca-fixture-canyon-v1",
          versionNumber: 1,
          snapshotHash:
            "7280523276e57985bb9bac7ec884dece8bde2690e357925e218fa0e0eb6b470f",
          changeSummary: "Initial synthetic California property baseline.",
          recordedAt: "2026-08-01T12:00:00.000Z",
          ...governed,
        },
      ],
    },
  ],
  relationships: [
    {
      id: "relationship-ca-fixture-shared-route",
      fromPropertyId: "property-ca-fixture-sierra-vista",
      toPropertyId: "property-ca-fixture-canyon-court",
      relationshipType: "shared_access_route",
      scopeLabel: "Fictional Ridge Access Road",
      reviewStatus: "confirmed",
      ...governed,
    },
  ],
  governance: {
    defaultCrossCustomerUse: "prohibited",
    rightsVerifiedRecords: 18,
    governedRecords: 18,
  },
};

const tabs = [
  ["overview", "Property record", Building2],
  ["scopes", "Scope graph", Layers3],
  ["versions", "Versions", FileClock],
  ["rights", "Rights & provenance", ShieldCheck],
] as const;

async function responseJson<T>(responseInput: Response | Promise<Response>) {
  const response = await responseInput;
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  return payload;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function shortHash(value: string) {
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export function PropertyGraphWorkspace({ mode }: { mode: RuntimeMode }) {
  const sandbox = mode === "sandbox";
  const [workspace, setWorkspace] = useState<Workspace | null>(
    sandbox ? fixtureWorkspace : null,
  );
  const [loading, setLoading] = useState(!sandbox);
  const [error, setError] = useState<string | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    sandbox ? fixtureWorkspace.portfolios[0].id : "",
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    sandbox ? fixtureWorkspace.properties[0].id : "",
  );
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number][0]>(
    "overview",
  );

  const load = async () => {
    if (sandbox) return;
    setLoading(true);
    setError(null);
    try {
      const next = await responseJson<Workspace>(
        fetch("/api/production/property-graph/workspace", {
          cache: "no-store",
        }),
      );
      setWorkspace(next);
      setSelectedPortfolioId((current) => current || next.portfolios[0]?.id || "");
      setSelectedPropertyId((current) => current || next.properties[0]?.id || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Property graph failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sandbox) return;
    let cancelled = false;
    void responseJson<Workspace>(
      fetch("/api/production/property-graph/workspace", { cache: "no-store" }),
    )
      .then((next) => {
        if (cancelled) return;
        setWorkspace(next);
        setSelectedPortfolioId(next.portfolios[0]?.id || "");
        setSelectedPropertyId(next.properties[0]?.id || "");
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Property graph failed to load.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sandbox]);

  const selectedPortfolio = workspace?.portfolios.find(
    (item) => item.id === selectedPortfolioId,
  );
  const visibleProperties = useMemo(() => {
    if (!workspace) return [];
    if (!selectedPortfolio) return workspace.properties;
    return workspace.properties.filter((property) =>
      selectedPortfolio.propertyIds.includes(property.id),
    );
  }, [selectedPortfolio, workspace]);
  const property =
    visibleProperties.find((item) => item.id === selectedPropertyId) ??
    visibleProperties[0];
  const propertyRelationships = workspace?.relationships.filter(
    (item) =>
      item.fromPropertyId === property?.id || item.toPropertyId === property?.id,
  );

  if (loading)
    return (
      <section className="property-graph-state" aria-live="polite">
        <LoaderCircle className="spin" size={24} />
        <h1>Loading the tenant property graph</h1>
        <p>Resolving portfolios, scopes, provenance, and access boundaries.</p>
      </section>
    );

  if (error)
    return (
      <section className="property-graph-state error" role="alert">
        <AlertTriangle size={24} />
        <h1>Property graph unavailable</h1>
        <p>{error}</p>
        <button className="button secondary" type="button" onClick={() => void load()}>
          <RefreshCw size={15} /> Retry
        </button>
      </section>
    );

  if (!workspace || workspace.portfolios.length === 0)
    return (
      <section className="property-graph-state">
        <Archive size={24} />
        <h1>No governed portfolio yet</h1>
        <p>Import or register a portfolio before building its property evidence graph.</p>
      </section>
    );

  return (
    <div className="property-graph-workspace">
      <header className="property-graph-hero">
        <div>
          <span className="eyebrow">M1 · tenant-scoped production foundation</span>
          <h1>California property evidence graph</h1>
          <p>
            Resolve durable property identity, physical scope, version history,
            source authority, and data rights before any resilience or insurance
            conclusion is attempted.
          </p>
        </div>
        <div className="property-graph-assurance">
          <MapPinned size={22} />
          <div>
            <strong>No inferred geometry or risk score</strong>
            <span>Unavailable boundaries stay unavailable</span>
          </div>
        </div>
      </header>

      <div className="property-graph-banner">
        <Database size={17} />
        <div>
          <strong>
            {sandbox
              ? "Synthetic California development fixture"
              : workspace.organization?.name ?? "Active organization"}
          </strong>
          <span>
            {sandbox
              ? "Separate organization and records from the preserved fictional Colorado renewal sandbox."
              : "Authenticated organization context; no synthetic data is loaded automatically."}
          </span>
        </div>
        <b>{selectedPortfolio?.jurisdiction ?? "No jurisdiction"}</b>
      </div>

      <section className="property-graph-metrics" aria-label="Property graph summary">
        <div><Building2 size={18} /><span>Properties</span><strong>{visibleProperties.length}</strong></div>
        <div><MapPinned size={18} /><span>Parcels</span><strong>{visibleProperties.flatMap((item) => item.parcels).length}</strong></div>
        <div><Layers3 size={18} /><span>Explicit scopes</span><strong>{visibleProperties.flatMap((item) => item.scopes).length}</strong></div>
        <div><ShieldCheck size={18} /><span>Governed records</span><strong>{workspace.governance.governedRecords}</strong></div>
      </section>

      <section className="property-graph-controls" aria-label="Portfolio and property selection">
        <label>
          Portfolio
          <select
            aria-label="Portfolio selector"
            value={selectedPortfolio?.id ?? ""}
            onChange={(event) => {
              const portfolioId = event.target.value;
              setSelectedPortfolioId(portfolioId);
              const nextPortfolio = workspace.portfolios.find(
                (item) => item.id === portfolioId,
              );
              setSelectedPropertyId(nextPortfolio?.propertyIds[0] ?? "");
            }}
          >
            {workspace.portfolios.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          Property
          <select
            aria-label="Property selector"
            value={property?.id ?? ""}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
          >
            {visibleProperties.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <div className="property-graph-source">
          <Fingerprint size={17} />
          <span>Portfolio source</span>
          <strong>{selectedPortfolio?.sourceSystem ?? "Unavailable"}</strong>
        </div>
      </section>

      {property ? (
        <>
          <nav className="property-graph-tabs" aria-label="Property graph views">
            {tabs.map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                className={activeTab === id ? "active" : ""}
                aria-pressed={activeTab === id}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>

          {activeTab === "overview" ? (
            <section className="property-record-grid">
              <article className="property-identity-panel">
                <span className="eyebrow">Stable property identity</span>
                <h2>{property.name}</h2>
                <p>{property.community?.summary}</p>
                <dl>
                  <div><dt>Class</dt><dd>{formatLabel(property.propertyClass)}</dd></div>
                  <div><dt>Units</dt><dd>{property.unitCount ?? "Unavailable"}</dd></div>
                  <div><dt>Buildings</dt><dd>{property.buildingCount ?? "Unavailable"}</dd></div>
                  <div><dt>County</dt><dd>{property.location?.county ?? "Unavailable"}</dd></div>
                  <div><dt>Address</dt><dd>{property.location ? `${property.location.addressLine1}, ${property.location.city}, ${property.location.region} ${property.location.postalCode}` : "Unavailable"}</dd></div>
                  <div><dt>Alias</dt><dd>{property.aliases[0]?.alias ?? "None recorded"}</dd></div>
                </dl>
              </article>
              <article className="property-spatial-panel">
                <div className="panel-heading">
                  <div><span className="eyebrow">Spatial state</span><h2>Boundary unavailable</h2></div>
                  <MapPinned size={23} />
                </div>
                <div className="spatial-empty">
                  <MapPinned size={32} />
                  <strong>No approved parcel geometry</strong>
                  <span>Fortify stores EPSG:4326-ready boundary payloads, but this fixture intentionally supplies no coordinates.</span>
                </div>
                {property.parcels.map((parcel) => (
                  <div className="property-detail-row" key={parcel.id}>
                    <div><span>Parcel</span><strong>{parcel.label}</strong></div>
                    <div><span>Identifier</span><strong>{parcel.parcelNumber ?? "Unavailable"}</strong></div>
                    <div><span>Geometry</span><strong>{parcel.geometryStatus}</strong></div>
                  </div>
                ))}
              </article>
            </section>
          ) : null}

          {activeTab === "scopes" ? (
            <section className="property-graph-panel">
              <div className="panel-heading">
                <div><span className="eyebrow">Exact applicability nodes</span><h2>Physical scope graph</h2></div>
                <GitBranch size={22} />
              </div>
              <div className="scope-node-list">
                {property.scopes.map((scope) => (
                  <article key={scope.id}>
                    <span>{formatLabel(scope.scopeType)}</span>
                    <h3>{scope.label}</h3>
                    <p>{scope.sourceSystem}</p>
                    <b>{scope.rightsVerified ? "Source right recorded" : "Rights unverified"}</b>
                  </article>
                ))}
              </div>
              <div className="relationship-list">
                <h3>Cross-property relationships</h3>
                {propertyRelationships?.length ? propertyRelationships.map((relationship) => (
                  <div key={relationship.id}>
                    <GitBranch size={16} />
                    <span>{formatLabel(relationship.relationshipType)}</span>
                    <strong>{relationship.scopeLabel}</strong>
                    <b>{relationship.reviewStatus}</b>
                  </div>
                )) : <p>No reviewed cross-property relationship is recorded.</p>}
              </div>
            </section>
          ) : null}

          {activeTab === "versions" ? (
            <section className="property-graph-panel">
              <div className="panel-heading">
                <div><span className="eyebrow">Append-only history</span><h2>Property versions</h2></div>
                <FileClock size={22} />
              </div>
              <div className="property-version-list">
                {property.versions.map((version) => (
                  <article key={version.id}>
                    <div className="version-number">v{version.versionNumber}</div>
                    <div><strong>{version.changeSummary}</strong><span>{new Date(version.recordedAt).toISOString()}</span></div>
                    <code>{shortHash(version.snapshotHash)}</code>
                    <b>Immutable</b>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "rights" ? (
            <section className="property-rights-grid">
              <article className="property-graph-panel">
                <div className="panel-heading">
                  <div><span className="eyebrow">Default boundary</span><h2>Tenant-controlled use</h2></div>
                  <LockKeyhole size={22} />
                </div>
                <dl className="rights-ledger">
                  <div><dt>Classification</dt><dd>{formatLabel(selectedPortfolio?.dataRightClass ?? "unavailable")}</dd></div>
                  <div><dt>Confidentiality</dt><dd>{formatLabel(selectedPortfolio?.confidentialityState ?? "unavailable")}</dd></div>
                  <div><dt>Cross-customer use</dt><dd>{workspace.governance.defaultCrossCustomerUse}</dd></div>
                  <div><dt>Rights-recorded nodes</dt><dd>{workspace.governance.rightsVerifiedRecords} / {workspace.governance.governedRecords}</dd></div>
                </dl>
              </article>
              <article className="property-governance-note">
                <ShieldCheck size={24} />
                <h2>What this record permits</h2>
                <p>It permits this tenant to organise its synthetic fixture record. It does not create rights to external model data, carrier material, customer documents, cross-customer analytics, or operational geospatial truth.</p>
                <ul>
                  <li><CheckCircle2 size={16} /> Exact source and effective date remain visible</li>
                  <li><CheckCircle2 size={16} /> Missing geometry is not inferred</li>
                  <li><CheckCircle2 size={16} /> History is superseding, not overwritten</li>
                </ul>
              </article>
            </section>
          ) : null}
        </>
      ) : (
        <section className="property-graph-state">
          <Archive size={24} />
          <h2>No property in this portfolio</h2>
          <p>The portfolio exists, but no active property link has been confirmed.</p>
        </section>
      )}
    </div>
  );
}
