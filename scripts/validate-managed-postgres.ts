import {
  createManagedPostgresFailureReceipt,
  validateManagedPostgres,
} from "@/lib/production/managed-postgres-validation";

try {
  const receipt = await validateManagedPostgres();
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  process.stderr.write(
    `${JSON.stringify(createManagedPostgresFailureReceipt(error), null, 2)}\n`,
  );
  process.exitCode = 1;
}
