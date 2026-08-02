"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  History,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type RuntimeMode = "sandbox" | "production";
type Adapter = {
  sourceSystem: string;
  displayName: string;
  externalValidationGate: string;
};
type WorkspaceOptions = {
  adapters: Adapter[];
  books: Array<{ id: string; name: string }>;
  storageObjects: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    state: string;
    scanStatus: string;
    createdAt: string;
  }>;
  mappings: Array<{
    id: string;
    name: string;
    sourceSystem: string;
    versionId: string;
    versionNumber: number;
    fileFormat: "csv" | "xlsx";
    sheetName?: string | null;
    headerRow: number;
    columnMapping: Record<string, string>;
    constants: Record<string, string>;
  }>;
  recentImports: Array<{
    id: string;
    filename: string;
    sourceSystem: string;
    status: string;
    totalRows: number;
    acceptedRows: number;
    rejectedRows: number;
    ambiguousRows: number;
    committedRows: number;
    createdAt: string;
  }>;
};
type ImportRow = {
  id?: string;
  rowNumber: number;
  status: string;
  normalizedData: Record<string, unknown>;
  errors: string[];
  warnings: string[];
};
type ImportResult = {
  portfolioImport: {
    id: string;
    status: string;
    totalRows: number;
    acceptedRows: number;
    rejectedRows: number;
    ambiguousRows: number;
    committedRows: number;
    originalFilename?: string;
  };
  rows: ImportRow[];
  receipts: Array<{
    id?: string;
    receiptType: string;
    receiptHash: string;
    occurredAt: string;
  }>;
  replayed?: boolean;
};

const fixtureAdapters: Adapter[] = [
  {
    sourceSystem: "generic_ams_csv",
    displayName: "Generic AMS or SOV export",
    externalValidationGate:
      "Validate this mapping against a rights-cleared export from the brokerage's authoritative system before production use.",
  },
  {
    sourceSystem: "applied_epic_fixture",
    displayName: "Applied Epic-compatible fixture",
    externalValidationGate:
      "Synthetic fixture only. This is not vendor certification or a live integration.",
  },
  {
    sourceSystem: "ams360_fixture",
    displayName: "AMS360-compatible fixture",
    externalValidationGate:
      "Synthetic fixture only. This is not vendor certification or a live integration.",
  },
];

const fixtureMapping = {
  externalClientId: "Client ID",
  clientName: "Client Name",
  externalCommunityId: "Community ID",
  communityName: "Community Name",
  externalPropertyId: "Property ID",
  propertyName: "Property Name",
  propertyClass: "Property Class",
  addressLine1: "Address 1",
  city: "City",
  region: "State",
  postalCode: "ZIP",
  buildingLabel: "Building",
  unitCount: "Units",
  policyNumber: "Policy Number",
  expirationDate: "Expiration Date",
};

const fixtureRows: ImportRow[] = [
  {
    rowNumber: 2,
    status: "accepted",
    normalizedData: {
      externalPropertyId: "PROP-100",
      propertyName: "Fictional Summit Ridge Condominium",
      normalizedAddress: "401pinecrestdrdurangoco81301",
      buildingLabel: "Building A",
      unitCount: 24,
    },
    errors: [],
    warnings: [],
  },
  {
    rowNumber: 3,
    status: "accepted",
    normalizedData: {
      externalPropertyId: "PROP-100",
      propertyName: "Fictional Summit Ridge Condominium",
      normalizedAddress: "401pinecrestdrdurangoco81301",
      buildingLabel: "Building B",
      unitCount: 24,
    },
    errors: [],
    warnings: [],
  },
  {
    rowNumber: 4,
    status: "ambiguous",
    normalizedData: {
      externalPropertyId: "PROP-200",
      propertyName: "Fictional Mesa View Townhomes",
      normalizedAddress: "18juniperlanegoldenCO80401",
      buildingLabel: "Building 1",
      unitCount: 18,
    },
    errors: [],
    warnings: [
      "The normalized address matches another property ID and requires review.",
    ],
  },
  {
    rowNumber: 5,
    status: "rejected",
    normalizedData: {
      externalPropertyId: "",
      propertyName: "Fictional Incomplete Row",
      normalizedAddress: "",
    },
    errors: ["External property ID is required."],
    warnings: [],
  },
];

const fixtureOptions: WorkspaceOptions = {
  adapters: fixtureAdapters,
  books: [{ id: "book-fixture", name: "Fictional Colorado habitational book" }],
  storageObjects: [
    {
      id: "object-clean-fixture",
      filename: "fictional-portfolio-sov.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 6763,
      sha256: "c8b70a6c45bd2df3d311427034829996f450835217b335e11b6ddf48f4f4e9f1",
      state: "clean",
      scanStatus: "clean",
      createdAt: "2026-08-01T12:00:00.000Z",
    },
    {
      id: "object-quarantine-fixture",
      filename: "awaiting-malware-scan.csv",
      mimeType: "text/csv",
      sizeBytes: 4280,
      sha256: "9f8d72dd6a2da2a8e4fd902490671d17c0330ca39a62a930d32d95f52976535f",
      state: "quarantined",
      scanStatus: "pending",
      createdAt: "2026-08-01T12:05:00.000Z",
    },
  ],
  mappings: [
    {
      id: "mapping-fixture",
      name: "Fictional generic SOV v1",
      sourceSystem: "generic_ams_csv",
      versionId: "mapping-version-fixture",
      versionNumber: 1,
      fileFormat: "xlsx",
      sheetName: "Portfolio SOV",
      headerRow: 4,
      columnMapping: fixtureMapping,
      constants: { currency: "USD" },
    },
  ],
  recentImports: [],
};

async function responseJson<T>(responseInput: Response | Promise<Response>): Promise<T> {
  const response = await responseInput;
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  return payload;
}

function statusClass(status: string) {
  return `status status-${status.replaceAll("_", "-")}`;
}

function shortHash(value: string) {
  return value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "Unavailable";
}

export function PortfolioImportWorkspace({ mode }: { mode: RuntimeMode }) {
  const sandbox = mode === "sandbox";
  const [options, setOptions] = useState<WorkspaceOptions | null>(
    sandbox ? fixtureOptions : null,
  );
  const [role, setRole] = useState<string | null>(sandbox ? "broker" : null);
  const [loading, setLoading] = useState(!sandbox);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileMimeType, setFileMimeType] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [bookId, setBookId] = useState(sandbox ? "book-fixture" : "");
  const [storageObjectId, setStorageObjectId] = useState(
    sandbox ? "object-clean-fixture" : "",
  );
  const [sourceSystem, setSourceSystem] = useState("generic_ams_csv");
  const [headerRow, setHeaderRow] = useState(sandbox ? 4 : 1);
  const [sheetName, setSheetName] = useState(sandbox ? "Portfolio SOV" : "");
  const [mappingName, setMappingName] = useState("Colorado portfolio SOV");
  const [columnMapping, setColumnMapping] =
    useState<Record<string, string>>(sandbox ? fixtureMapping : {});
  const [mappingVersionId, setMappingVersionId] = useState(
    sandbox ? "mapping-version-fixture" : "",
  );
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rowFilter, setRowFilter] = useState("all");
  const [rowPage, setRowPage] = useState(1);

  const refresh = async () => {
    if (sandbox) return;
    setLoading(true);
    setError(null);
    try {
      const [workspace, session] = await Promise.all([
        responseJson<WorkspaceOptions>(
          fetch("/api/production/portfolio-imports/workspace", {
            cache: "no-store",
          }),
        ),
        responseJson<{ role: string | null }>(
          fetch("/api/auth/session", { cache: "no-store" }),
        ),
      ]);
      setOptions(workspace);
      setRole(session.role);
      setBookId((current) => current || workspace.books[0]?.id || "");
      const firstObject =
        workspace.storageObjects.find(
          (object) => object.state === "clean" && object.scanStatus === "clean",
        ) ?? workspace.storageObjects[0];
      setStorageObjectId((current) => current || firstObject?.id || "");
      const firstMapping = workspace.mappings[0];
      if (firstMapping) {
        setMappingVersionId((current) => current || firstMapping.versionId);
        setSourceSystem(firstMapping.sourceSystem);
        setHeaderRow(firstMapping.headerRow);
        setSheetName(firstMapping.sheetName ?? "");
        setColumnMapping(firstMapping.columnMapping);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Workspace failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sandbox) return;
    let cancelled = false;
    void Promise.all([
      responseJson<WorkspaceOptions>(
        fetch("/api/production/portfolio-imports/workspace", {
          cache: "no-store",
        }),
      ),
      responseJson<{ role: string | null }>(
        fetch("/api/auth/session", { cache: "no-store" }),
      ),
    ])
      .then(([workspace, session]) => {
        if (cancelled) return;
        setOptions(workspace);
        setRole(session.role);
        setBookId(workspace.books[0]?.id || "");
        const firstObject =
          workspace.storageObjects.find(
            (object) => object.state === "clean" && object.scanStatus === "clean",
          ) ?? workspace.storageObjects[0];
        setStorageObjectId(firstObject?.id || "");
        const firstMapping = workspace.mappings[0];
        if (firstMapping) {
          setMappingVersionId(firstMapping.versionId);
          setSourceSystem(firstMapping.sourceSystem);
          setHeaderRow(firstMapping.headerRow);
          setSheetName(firstMapping.sheetName ?? "");
          setColumnMapping(firstMapping.columnMapping);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(
            caught instanceof Error ? caught.message : "Workspace failed to load.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sandbox]);

  const selectedObject = options?.storageObjects.find(
    (object) => object.id === storageObjectId,
  );
  const selectedAdapter = options?.adapters.find(
    (adapter) => adapter.sourceSystem === sourceSystem,
  );
  const cleanObject =
    selectedObject?.state === "clean" && selectedObject.scanStatus === "clean";
  const canManageMappings =
    sandbox ||
    ["organization_owner", "brokerage_administrator", "practice_leader"].includes(
      role ?? "",
    );
  const filteredRows = useMemo(
    () =>
      (result?.rows ?? []).filter(
        (row) => rowFilter === "all" || row.status === rowFilter,
      ),
    [result, rowFilter],
  );
  const rowsPerPage = 50;
  const rowPageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const visibleRows = filteredRows.slice(
    (rowPage - 1) * rowsPerPage,
    rowPage * rowsPerPage,
  );
  const invalidatePreview = () => {
    setResult(null);
    setConfirmed(false);
    setRollbackReason("");
    setRowPage(1);
  };

  const chooseFile = async (nextFile: File | null) => {
    setFile(nextFile);
    setFileHash("");
    setFileMimeType("");
    setNotice(null);
    invalidatePreview();
    if (!nextFile) return;
    const lowerName = nextFile.name.toLowerCase();
    const mimeType =
      nextFile.type ||
      (lowerName.endsWith(".csv")
        ? "text/csv"
        : lowerName.endsWith(".xlsx")
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "");
    if (
      !["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(
        mimeType,
      )
    ) {
      setError("Choose a CSV or XLSX portfolio file.");
      return;
    }
    setFileMimeType(mimeType);
    const digest = await crypto.subtle.digest("SHA-256", await nextFile.arrayBuffer());
    setFileHash(
      [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(""),
    );
    setError(null);
  };

  const uploadFile = async () => {
    if (!file || !fileHash || !fileMimeType) return;
    if (sandbox) {
      setNotice(
        "Synthetic walkthrough only: the file was hashed locally but was not uploaded or persisted.",
      );
      return;
    }
    setPending("upload");
    setError(null);
    try {
      const upload = await responseJson<{
        storageObjectId: string;
        grantId: string;
        url: string;
        requiredHeaders: Record<string, string>;
      }>(
        await fetch("/api/production/storage/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: fileMimeType,
            sizeBytes: file.size,
            sha256: fileHash,
          }),
        }),
      );
      const put = await fetch(upload.url, {
        method: "PUT",
        headers: upload.requiredHeaders,
        body: file,
      });
      if (!put.ok) throw new Error("Private object upload failed.");
      await responseJson(
        await fetch(
          `/api/production/storage/uploads/${upload.storageObjectId}/finalize`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grantId: upload.grantId }),
          },
        ),
      );
      setStorageObjectId(upload.storageObjectId);
      invalidatePreview();
      setNotice(
        "Upload finalized in quarantine. Preview remains locked until the configured malware scanner marks it clean.",
      );
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed closed.");
    } finally {
      setPending(null);
    }
  };

  const suggestMapping = async () => {
    if (!cleanObject) return;
    invalidatePreview();
    setPending("suggest");
    setError(null);
    try {
      if (sandbox) {
        setColumnMapping(fixtureMapping);
        setNotice("Synthetic fixture headers mapped. No customer data was read.");
      } else {
        const suggestion = await responseJson<{
          mapping: Record<string, string>;
          rowCount: number;
        }>(
          await fetch("/api/production/portfolio-imports/suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storageObjectId,
              sourceSystem,
              headerRow,
              sheetName: sheetName || undefined,
            }),
          }),
        );
        setColumnMapping(suggestion.mapping);
        setNotice(`${suggestion.rowCount} rows found; review every mapped field.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mapping failed closed.");
    } finally {
      setPending(null);
    }
  };

  const saveMapping = async () => {
    if (!canManageMappings) return;
    invalidatePreview();
    setPending("mapping");
    setError(null);
    try {
      if (sandbox) {
        setMappingVersionId("mapping-version-fixture");
        setNotice("Synthetic mapping version saved for this walkthrough only.");
      } else {
        const format = selectedObject?.mimeType === "text/csv" ? "csv" : "xlsx";
        const saved = await responseJson<{ version: { id: string } }>(
          await fetch("/api/production/portfolio-imports/mappings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: mappingName,
              sourceSystem,
              fileFormat: format,
              sheetName: format === "xlsx" ? sheetName || undefined : undefined,
              headerRow,
              columnMapping,
            }),
          }),
        );
        setMappingVersionId(saved.version.id);
        setNotice("Immutable mapping version saved.");
        await refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mapping save failed.");
    } finally {
      setPending(null);
    }
  };

  const previewImport = async () => {
    if (!cleanObject || !mappingVersionId || !bookId) return;
    setPending("preview");
    setError(null);
    setConfirmed(false);
    setRowPage(1);
    try {
      if (sandbox) {
        setResult({
          portfolioImport: {
            id: "fixture-import-preview",
            status: "previewed",
            totalRows: 4,
            acceptedRows: 2,
            rejectedRows: 1,
            ambiguousRows: 1,
            committedRows: 0,
            originalFilename: selectedObject?.filename,
          },
          rows: fixtureRows,
          receipts: [
            {
              receiptType: "preview",
              receiptHash:
                "908af0148a2f35a8456a47f7429a2a00f79ac720c29c63b557c66499b58609d8",
              occurredAt: "2026-08-01T12:00:00.000Z",
            },
          ],
        });
        setNotice("Synthetic dry run complete. Ambiguous and rejected rows remain quarantined.");
      } else {
        const preview = await responseJson<ImportResult>(
          await fetch("/api/production/portfolio-imports/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookId,
              storageObjectId,
              mappingVersionId,
              sourceSystem,
              idempotencyKey: crypto.randomUUID(),
            }),
          }),
        );
        setResult(preview);
        setNotice("Dry run complete. Review all quarantined rows before confirmation.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Preview failed closed.");
    } finally {
      setPending(null);
    }
  };

  const commitImport = async () => {
    if (!result || !confirmed) return;
    setPending("commit");
    setError(null);
    setRowPage(1);
    try {
      if (sandbox) {
        setResult({
          ...result,
          portfolioImport: {
            ...result.portfolioImport,
            status: "committed",
            committedRows: result.portfolioImport.acceptedRows,
          },
          rows: result.rows.map((row) =>
            row.status === "accepted" ? { ...row, status: "committed" } : row,
          ),
          receipts: [
            ...result.receipts,
            {
              receiptType: "commit",
              receiptHash:
                "6ba0098f22cc8fb9144ed941d2e8e679016f66d8e9b86bb8d31ec0b39fdc979f",
              occurredAt: "2026-08-01T12:04:00.000Z",
            },
          ],
        });
        setNotice("Synthetic accepted rows committed to the walkthrough graph.");
      } else {
        setResult(
          await responseJson<ImportResult>(
            await fetch(
              `/api/production/portfolio-imports/${result.portfolioImport.id}/commit`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmAcceptedRows: true }),
              },
            ),
          ),
        );
        setNotice("Accepted rows committed. Quarantined rows and receipts were retained.");
        await refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Commit failed closed.");
    } finally {
      setPending(null);
    }
  };

  const rollbackImport = async () => {
    if (!result || !rollbackReason.trim()) return;
    setPending("rollback");
    setError(null);
    setRowPage(1);
    try {
      if (sandbox) {
        setResult({
          ...result,
          portfolioImport: {
            ...result.portfolioImport,
            status: "rolled_back",
          },
          rows: result.rows.map((row) =>
            row.status === "committed" ? { ...row, status: "rolled_back" } : row,
          ),
          receipts: [
            ...result.receipts,
            {
              receiptType: "rollback",
              receiptHash:
                "2294e225f8744bb39e96a21294ee03385418975e176163183333748e249b2f33",
              occurredAt: "2026-08-01T12:09:00.000Z",
            },
          ],
        });
        setNotice("Synthetic rollback retained every row and receipt.");
      } else {
        setResult(
          await responseJson<ImportResult>(
            await fetch(
              `/api/production/portfolio-imports/${result.portfolioImport.id}/rollback`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: rollbackReason }),
              },
            ),
          ),
        );
        setNotice("Rollback archived import-owned records and retained the ledger.");
        await refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Rollback failed atomically.");
    } finally {
      setPending(null);
    }
  };

  if (loading)
    return (
      <main className="import-page import-state-page">
        <LoaderCircle className="import-spinner" aria-hidden="true" />
        <h1>Loading portfolio import controls</h1>
        <p>Resolving your organization, role, mappings, books, and clean objects.</p>
      </main>
    );

  if (!options)
    return (
      <main className="import-page import-state-page">
        <LockKeyhole size={28} aria-hidden="true" />
        <h1>Organization access required</h1>
        <p>{error || "A current Fortify organization session is required."}</p>
        <Link className="button primary" href="/sign-in">
          Sign in <ArrowRight size={15} />
        </Link>
      </main>
    );

  return (
    <main className="import-page">
      <a className="skip-link" href="#import-main">
        Skip to import controls
      </a>
      <header className="import-topbar">
        <Link className="import-brand" href="/">
          <span>F</span>
          <div>
            <strong>Fortify</strong>
            <small>Portfolio intake</small>
          </div>
        </Link>
        <div className="import-topbar-actions">
          <span className={sandbox ? "import-mode synthetic" : "import-mode"}>
            {sandbox ? "Synthetic walkthrough" : "Organization secured"}
          </span>
          <Link href={sandbox ? "/portfolio" : "/sign-in"} className="button ghost compact">
            {sandbox ? "Return to demo" : "Account access"}
          </Link>
        </div>
      </header>

      <div id="import-main" className="import-shell">
        <section className="import-hero">
          <div>
            <span className="eyebrow">Portfolio and SOV intake</span>
            <h1>Turn a property book into a reviewable evidence graph.</h1>
            <p>
              Upload to quarantine, map authoritative fields, preview every row,
              resolve uncertainty, then confirm only the accepted records.
            </p>
          </div>
          <div className="import-assurance">
            <ShieldCheck size={24} aria-hidden="true" />
            <div>
              <strong>No silent merges</strong>
              <span>Missing, contradictory, ambiguous, and unreviewed rows stay explicit.</span>
            </div>
          </div>
        </section>

        {sandbox && (
          <div className="import-boundary" role="note">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Fictional fixture walkthrough</strong>
              <span>
                This route demonstrates UI behavior only. It does not upload, persist,
                certify vendor compatibility, or represent customer validation.
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="import-message error" role="alert">
            <AlertTriangle size={17} /> {error}
            <button onClick={() => setError(null)} aria-label="Dismiss error">×</button>
          </div>
        )}
        {notice && (
          <div className="import-message success" role="status">
            <CheckCircle2 size={17} /> {notice}
            <button onClick={() => setNotice(null)} aria-label="Dismiss notice">×</button>
          </div>
        )}

        <section className="import-step-grid" aria-label="Import workflow">
          <article className="import-step active">
            <span>01</span><Upload size={19} /><strong>Secure source</strong><small>Hash, quarantine, scan</small>
          </article>
          <article className={columnMapping.externalPropertyId ? "import-step active" : "import-step"}>
            <span>02</span><Database size={19} /><strong>Map authority</strong><small>Version fields and constants</small>
          </article>
          <article className={result ? "import-step active" : "import-step"}>
            <span>03</span><FileSpreadsheet size={19} /><strong>Review dry run</strong><small>Accept, reject, quarantine</small>
          </article>
          <article className={result?.portfolioImport.status === "committed" ? "import-step active" : "import-step"}>
            <span>04</span><Check size={19} /><strong>Confirm graph</strong><small>Receipt and rollback</small>
          </article>
        </section>

        <section className="import-layout">
          <div className="import-main-column">
            <article className="panel import-panel">
              <div className="section-head">
                <div><h2>1. Secure the source file</h2><p>Only CSV and XLSX objects promoted clean by the scanner can be parsed.</p></div>
                <span className={cleanObject ? "status status-ready" : "status status-pending"}>{cleanObject ? "Clean object" : "Scan required"}</span>
              </div>
              <div className="import-upload-row">
                <label className="import-file-picker">
                  <Upload size={21} />
                  <span><strong>{file?.name ?? "Choose CSV or XLSX"}</strong><small>{file ? `${file.size.toLocaleString()} bytes` : "Maximum 25 MB · exact SHA-256 bound"}</small></span>
                  <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)} />
                </label>
                <button className="button secondary" disabled={!file || !fileHash || pending === "upload"} onClick={() => void uploadFile()}>
                  {pending === "upload" ? <LoaderCircle className="import-spinner" size={15} /> : <Upload size={15} />}
                  {sandbox ? "Verify locally" : "Upload to quarantine"}
                </button>
              </div>
              {fileHash && <div className="import-hash"><span>Local SHA-256</span><code>{fileHash}</code></div>}
              <div className="import-form-grid">
                <label><span>Scanned source object</span><select value={storageObjectId} onChange={(event) => { setStorageObjectId(event.target.value); invalidatePreview(); }}>{options.storageObjects.length ? options.storageObjects.map((object) => <option key={object.id} value={object.id}>{object.filename} · {object.state}/{object.scanStatus}</option>) : <option value="">No CSV/XLSX objects available</option>}</select></label>
                <label><span>Destination book</span><select value={bookId} onChange={(event) => { setBookId(event.target.value); invalidatePreview(); }}>{options.books.length ? options.books.map((book) => <option key={book.id} value={book.id}>{book.name}</option>) : <option value="">No books available</option>}</select></label>
              </div>
              {selectedObject && <dl className="import-object-meta"><div><dt>File</dt><dd>{selectedObject.filename}</dd></div><div><dt>State</dt><dd><span className={cleanObject ? "status status-ready" : "status status-pending"}>{selectedObject.state} / {selectedObject.scanStatus}</span></dd></div><div><dt>Bytes</dt><dd>{selectedObject.sizeBytes.toLocaleString()}</dd></div><div><dt>SHA-256</dt><dd><code>{shortHash(selectedObject.sha256)}</code></dd></div></dl>}
            </article>

            <article className="panel import-panel">
              <div className="section-head"><div><h2>2. Map the authoritative export</h2><p>Mapping versions are immutable. Names never authorize an identity merge.</p></div><span className="status">Schema v1</span></div>
              <div className="import-form-grid three">
                <label><span>Source boundary</span><select value={sourceSystem} onChange={(event) => { setSourceSystem(event.target.value); setMappingVersionId(""); setColumnMapping({}); invalidatePreview(); }}>{options.adapters.map((adapter) => <option key={adapter.sourceSystem} value={adapter.sourceSystem}>{adapter.displayName}</option>)}</select></label>
                <label><span>Header row</span><input type="number" min={1} value={headerRow} onChange={(event) => { setHeaderRow(Number(event.target.value)); invalidatePreview(); }} /></label>
                <label><span>XLSX sheet</span><input value={sheetName} onChange={(event) => { setSheetName(event.target.value); invalidatePreview(); }} placeholder="Portfolio SOV" /></label>
              </div>
              <div className="import-gate"><LockKeyhole size={16} /><span>{selectedAdapter?.externalValidationGate}</span></div>
              <div className="import-action-row">
                <button className="button secondary" disabled={!cleanObject || pending === "suggest"} onClick={() => void suggestMapping()}>{pending === "suggest" ? <LoaderCircle className="import-spinner" size={15} /> : <Database size={15} />}Suggest from clean file</button>
                {canManageMappings ? <><label className="inline-field"><span>Mapping name</span><input value={mappingName} onChange={(event) => setMappingName(event.target.value)} /></label><button className="button primary" disabled={!columnMapping.externalPropertyId || pending === "mapping"} onClick={() => void saveMapping()}>{pending === "mapping" ? <LoaderCircle className="import-spinner" size={15} /> : <Check size={15} />}Save immutable version</button></> : <span className="import-role-note">Practice leader approval is required to save mapping versions.</span>}
              </div>
              {Object.keys(columnMapping).length ? <div className="mapping-grid">{Object.entries(columnMapping).map(([field, header]) => <div key={field}><span>{field.replace(/([A-Z])/g, " $1")}</span><strong>{header}</strong></div>)}</div> : <div className="import-empty"><Database size={24} /><strong>No mapping loaded</strong><span>Select a clean source and request a suggestion, or choose a saved mapping.</span></div>}
              <label className="saved-mapping-select"><span>Use saved mapping version</span><select value={mappingVersionId} onChange={(event) => { const version = options.mappings.find((mapping) => mapping.versionId === event.target.value); setMappingVersionId(event.target.value); if (version) { setSourceSystem(version.sourceSystem); setHeaderRow(version.headerRow); setSheetName(version.sheetName ?? ""); setColumnMapping(version.columnMapping); } invalidatePreview(); }}><option value="">Choose a saved mapping</option>{options.mappings.filter((mapping) => mapping.sourceSystem === sourceSystem).map((mapping) => <option key={mapping.versionId} value={mapping.versionId}>{mapping.name} · v{mapping.versionNumber}</option>)}</select></label>
            </article>

            <article className="panel import-panel">
              <div className="section-head"><div><h2>3. Review the dry run</h2><p>Accepted rows are candidates only. Rejected and ambiguous rows remain quarantined.</p></div><button className="button primary" disabled={!cleanObject || !mappingVersionId || !bookId || pending === "preview"} onClick={() => void previewImport()}>{pending === "preview" ? <LoaderCircle className="import-spinner" size={15} /> : <FileSpreadsheet size={15} />}{result ? "Refresh preview" : "Generate preview"}</button></div>
              {!result ? <div className="import-empty large"><FileSpreadsheet size={28} /><strong>No dry run yet</strong><span>Choose a clean object, book, and immutable mapping version to inspect row-level results.</span></div> : <>
                <div className="metrics compact-metrics import-metrics"><div className="metric"><span>Total rows</span><strong>{result.portfolioImport.totalRows}</strong><small>Exact parsed rows</small></div><div className="metric metric-good"><span>Accepted</span><strong>{result.portfolioImport.acceptedRows}</strong><small>Eligible for confirmation</small></div><div className="metric metric-warning"><span>Ambiguous</span><strong>{result.portfolioImport.ambiguousRows}</strong><small>Requires identity review</small></div><div className="metric"><span>Rejected</span><strong>{result.portfolioImport.rejectedRows}</strong><small>Validation failed</small></div></div>
                <div className="import-table-toolbar"><div role="group" aria-label="Filter preview rows">{["all", "accepted", "ambiguous", "rejected", "committed", "rolled_back"].map((status) => <button key={status} className={rowFilter === status ? "active" : ""} onClick={() => { setRowFilter(status); setRowPage(1); }}>{status.replace("_", " ")}</button>)}</div><span>{filteredRows.length} matching · page {Math.min(rowPage, rowPageCount)} of {rowPageCount}</span></div>
                <div className="table-scroll"><table><thead><tr><th>Row</th><th>Property identity</th><th>Normalized address</th><th>Building / units</th><th>Review state</th></tr></thead><tbody>{visibleRows.length ? visibleRows.map((row) => <tr key={`${row.rowNumber}-${row.status}`}><td>{row.rowNumber}</td><td><strong>{String(row.normalizedData.propertyName || "Unnamed property")}</strong><span>{String(row.normalizedData.externalPropertyId || "Missing stable ID")}</span></td><td><code>{String(row.normalizedData.normalizedAddress || "Unavailable")}</code></td><td><strong>{String(row.normalizedData.buildingLabel || "Not provided")}</strong><span>{row.normalizedData.unitCount === undefined ? "Units unavailable" : `${String(row.normalizedData.unitCount)} units`}</span></td><td><span className={statusClass(row.status)}>{row.status.replace("_", " ")}</span>{[...row.errors, ...row.warnings].map((message) => <small className="row-message" key={message}>{message}</small>)}</td></tr>) : <tr><td colSpan={5}><div className="import-empty"><FileSpreadsheet size={22} /><strong>No rows in this state</strong><span>Choose another row filter.</span></div></td></tr>}</tbody></table></div>
                {rowPageCount > 1 && <div className="import-pagination"><button className="button ghost compact" disabled={rowPage === 1} onClick={() => setRowPage((page) => Math.max(1, page - 1))}>Previous 50</button><button className="button ghost compact" disabled={rowPage === rowPageCount} onClick={() => setRowPage((page) => Math.min(rowPageCount, page + 1))}>Next 50</button></div>}
              </>}
            </article>

            {result && <article className="panel import-panel import-confirm-panel"><div className="section-head"><div><h2>4. Human confirmation and rollback</h2><p>Confirmation applies only to accepted rows. It never converts quarantine into evidence.</p></div><span className={statusClass(result.portfolioImport.status)}>{result.portfolioImport.status.replace("_", " ")}</span></div>{result.portfolioImport.status === "previewed" && <><label className="import-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span><strong>I reviewed the source, mapping, accepted rows, and quarantine.</strong><small>I confirm {result.portfolioImport.acceptedRows} accepted rows for normalized graph creation. Carrier and pricing outcomes are not implied.</small></span></label><button className="button primary" disabled={!confirmed || pending === "commit"} onClick={() => void commitImport()}>{pending === "commit" ? <LoaderCircle className="import-spinner" size={15} /> : <Check size={15} />}Commit accepted rows</button></>}{result.portfolioImport.status === "committed" && <div className="rollback-box"><div><CheckCircle2 size={20} /><span><strong>{result.portfolioImport.committedRows} accepted rows committed</strong><small>Ambiguous/rejected rows and every receipt remain retained.</small></span></div><label><span>Rollback reason</span><input value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} placeholder="Required audit reason" /></label><button className="button danger" disabled={!rollbackReason.trim() || pending === "rollback"} onClick={() => void rollbackImport()}>{pending === "rollback" ? <LoaderCircle className="import-spinner" size={15} /> : <RotateCcw size={15} />}Rollback import-owned records</button></div>}{result.portfolioImport.status === "rolled_back" && <div className="import-rolled-back"><History size={20} /><span><strong>Import rolled back without destructive deletion</strong><small>Rows, receipts, and prior entity history remain available for audit.</small></span></div>}</article>}
          </div>

          <aside className="import-side-column">
            <article className="panel import-side-card"><div className="section-head"><div><h2>Authority and safety</h2><p>Fail-closed import doctrine</p></div><ShieldCheck size={20} /></div><ul><li><Check size={14} />AMS source remains authoritative unless configured otherwise.</li><li><Check size={14} />Stable identifiers outrank names.</li><li><Check size={14} />Address collisions require review.</li><li><Check size={14} />Only clean scanned objects can be parsed.</li><li><Check size={14} />Every consequential action has an immutable receipt.</li></ul></article>
            <article className="panel import-side-card"><div className="section-head"><div><h2>Receipt ledger</h2><p>Preview, commit, rollback</p></div><History size={19} /></div>{result?.receipts.length ? <div className="receipt-list">{result.receipts.map((receipt, index) => <div key={`${receipt.receiptType}-${index}`}><span className={statusClass(receipt.receiptType === "commit" ? "accepted" : receipt.receiptType === "rollback" ? "pending" : "reviewed")}>{receipt.receiptType}</span><code>{shortHash(receipt.receiptHash)}</code><small>{new Date(receipt.occurredAt).toLocaleString()}</small></div>)}</div> : <div className="import-empty"><History size={22} /><strong>No receipts yet</strong><span>A dry run creates the first immutable receipt.</span></div>}</article>
            <article className="panel import-side-card"><div className="section-head"><div><h2>Recent imports</h2><p>Organization-scoped history</p></div></div>{options.recentImports.length ? <div className="recent-imports">{options.recentImports.map((item) => <button key={item.id} onClick={async () => { if (sandbox) return; setPending("load"); try { setResult(await responseJson<ImportResult>(await fetch(`/api/production/portfolio-imports/${item.id}`, { cache: "no-store" }))); } catch (caught) { setError(caught instanceof Error ? caught.message : "Import failed to load."); } finally { setPending(null); } }}><span><strong>{item.filename}</strong><small>{item.totalRows} rows · {item.acceptedRows} accepted</small></span><span className={statusClass(item.status)}>{item.status.replace("_", " ")}</span></button>)}</div> : <div className="import-empty"><Database size={22} /><strong>No prior imports</strong><span>Completed previews appear here without crossing organization boundaries.</span></div>}</article>
          </aside>
        </section>
      </div>
    </main>
  );
}
