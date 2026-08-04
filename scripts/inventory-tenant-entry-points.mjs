import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? filesBelow(target) : [target];
    }),
  );
  return nested.flat();
}

function relative(file) {
  return path.relative(process.cwd(), file).split(path.sep).join("/");
}

function classifyRoute(file, source) {
  if (/\breturn\s+withAuthenticatedTenantRequest\s*\(/.test(source))
    return "unsafe_authenticated_error_boundary";
  if (/\bwithAuthenticatedTenantRequest\s*\(/.test(source))
    return "bound_authenticated_request";
  if (
    /\bresolveTenantBootstrap\s*\(/.test(source) &&
    /\bsetTenantTransactionContext\s*\(/.test(source)
  )
    return "bound_inbound_request";
  if (
    file.includes("/api/auth/") &&
    /\b(resolveInvitationForOidc|consumeOidcAttemptForRequest|issueIdentitySession)\s*\(/.test(
      source,
    )
  )
    return "bound_identity_bootstrap";
  if (/\bresolveRequestPrincipal\s*\(/.test(source))
    return "unbound_authenticated_request";
  if (file.includes("/api/auth/")) return "unbound_identity_bootstrap";
  return "unclassified";
}

const routeFiles = (
  await Promise.all(
    ["app/api/production", "app/api/auth"].map((directory) =>
      filesBelow(path.resolve(directory)),
    ),
  )
)
  .flat()
  .filter((file) => file.endsWith("/route.ts"))
  .sort();

const entries = [];
for (const file of routeFiles) {
  const source = await readFile(file, "utf8");
  entries.push({ path: relative(file), status: classifyRoute(file, source) });
}

const workerFile = path.resolve("scripts/run-document-worker.ts");
const workerSource = await readFile(workerFile, "utf8");
entries.push({
  path: relative(workerFile),
  status: /\bwithTenantTransaction\s*\(/.test(workerSource)
    ? "bound_tenant_worker"
    : "unbound_tenant_worker",
});

const summary = Object.fromEntries(
  [...new Set(entries.map((entry) => entry.status))]
    .sort()
    .map((status) => [
      status,
      entries.filter((entry) => entry.status === status).length,
    ]),
);

process.stdout.write(`${JSON.stringify({ summary, entries }, null, 2)}\n`);

if (
  entries.some((entry) =>
    ["unclassified", "unsafe_authenticated_error_boundary"].includes(
      entry.status,
    ),
  )
) {
  process.stderr.write(
    "Tenant entry-point inventory has unclassified or unsafe authenticated routes.\n",
  );
  process.exitCode = 1;
}
