import fs from "node:fs";

const required = [
  "docs/SECURITY_AND_PRIVACY.md",
  "docs/THREAT_MODEL.md",
  "docs/DATA_FLOW.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "docs/INCIDENT_RESPONSE.md",
  "docs/BACKUP_RESTORE_REPORT.md",
  "docs/PAID_PILOT_RUNBOOK.md",
  "docs/ROI_MEASUREMENT.md",
  "docs/LAUNCH_READINESS.md",
  "docs/SECURITY_QUESTIONNAIRE.md",
  "docs/SUBPROCESSORS.md",
  "scripts/validate-managed-postgres.ts",
  "lib/production/managed-postgres-validation.ts",
  "proxy.ts",
  "app/api/ready/route.ts",
];
for (const file of required)
  if (!fs.existsSync(file))
    throw new Error(`Missing operational contract ${file}.`);
const migration = fs.readFileSync(
  "drizzle-production/0026_mature_magik.sql",
  "utf8",
);
if (
  !migration.includes("ENABLE ROW LEVEL SECURITY") ||
  !migration.includes("fortify_tenant_isolation")
)
  throw new Error("RLS migration contract missing.");
const release = fs.readFileSync(".github/workflows/release.yml", "utf8");
for (const managedControl of [
  "db:validate:managed-postgres",
  "FORTIFY_VALIDATION_ENVIRONMENT: staging",
  "managed-postgres-validation.json",
])
  if (!release.includes(managedControl))
    throw new Error(
      `Missing managed PostgreSQL release control ${managedControl}.`,
    );
const managedProbe = fs.readFileSync(
  "lib/production/managed-postgres-validation.ts",
  "utf8",
);
for (const managedControl of [
  "set local role fortify_app",
  "pg_backend_pid()",
  "cross_tenant_write_rejection",
  "commit_context_reset",
  "rollback_context_reset",
  "fixture_cleanup",
])
  if (!managedProbe.includes(managedControl))
    throw new Error(
      `Missing managed PostgreSQL probe control ${managedControl}.`,
    );
const proxy = fs.readFileSync("proxy.ts", "utf8");
for (const control of [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "Cross-site request rejected",
])
  if (!proxy.includes(control))
    throw new Error(`Missing proxy control ${control}.`);
console.log(
  `Operational contract: ${required.length} artifacts, RLS, managed pool proof, CSP, CSRF, and readiness present.`,
);
