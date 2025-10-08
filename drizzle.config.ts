import { defineConfig } from "drizzle-kit";

const isSQLite = process.env.DATABASE_URL?.startsWith('file:') || !process.env.DATABASE_URL;

export default defineConfig({
  out: "./migrations",
  schema: isSQLite ? "./shared/schema-sqlite.ts" : "./shared/schema.ts",
  dialect: isSQLite ? "sqlite" : "postgresql",
  dbCredentials: isSQLite 
    ? { url: process.env.DATABASE_URL || "file:./dev.db" }
    : { url: process.env.DATABASE_URL! },
});
