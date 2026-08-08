export type PortfolioImportWorkspaceResponse = {
  adapters: Array<{
    sourceSystem: string;
    displayName: string;
    externalValidationGate: string;
  }>;
  books: Array<{
    id: string;
    name: string;
  }>;
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
    sheetName: string | null;
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
