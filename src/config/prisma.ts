/**
 * Prisma client configuration (Prisma 7 + Postgres adapter)
 *
 * Thought process:
 * - Prisma 7 prefers using a driver adapter instead of hidden built-in drivers.
 * - I generate the client into src/generated/prisma and import it from there.
 * - I create exactly one PrismaClient instance for the whole app to avoid
 *   opening multiple DB connections.
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// 1. Read the Postgres connection string from .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fail fast if DATABASE_URL is missing so the error is obvious
  throw new Error("DATABASE_URL is not set in the environment variables");
}

// 2. Create the Postgres driver adapter that Prisma will use under the hood
const adapter = new PrismaPg({ connectionString });

// 3. Create a single PrismaClient instance for the whole application
const prisma = new PrismaClient({ adapter });

export default prisma;
