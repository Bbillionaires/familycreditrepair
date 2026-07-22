import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel's Neon integration doesn't always expose a plain DATABASE_URL —
// depending on how it was connected, the connection string may only be
// available under one of these Neon-specific names instead. Prefer the
// Prisma-optimized pooled URL for the live app (safe for serverless, where
// each invocation may open its own connection); fall back through the
// other variants if that one isn't present.
const DATABASE_URL =
  process.env.DATABASE_URL ??
  process.env.DATABASE_POSTGRES_PRISMA_URL ??
  process.env.DATABASE_POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED;

if (!DATABASE_URL) {
  throw new Error(
    "No database connection string found. Provision a Postgres database (e.g. Vercel's Neon integration) and set DATABASE_URL (or confirm one of DATABASE_POSTGRES_PRISMA_URL / DATABASE_POSTGRES_URL / DATABASE_URL_UNPOOLED is set) to its connection string."
  );
}

const adapter = new PrismaPg(DATABASE_URL);

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
