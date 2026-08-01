import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle-production",
  schema: "./db/production/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://fortify:fortify@127.0.0.1:5432/fortify",
  },
});
