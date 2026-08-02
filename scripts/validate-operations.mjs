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
const proxy = fs.readFileSync("proxy.ts", "utf8");
for (const control of [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "Cross-site request rejected",
])
  if (!proxy.includes(control))
    throw new Error(`Missing proxy control ${control}.`);
console.log(
  `Operational contract: ${required.length} artifacts, RLS, CSP, CSRF, and readiness present.`,
);
