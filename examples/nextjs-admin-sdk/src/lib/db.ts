/**
 * PrismaClient singleton.
 *
 * In `next dev`, fast-refresh re-evaluates modules on every save.
 * Without this guard each save would create a fresh PrismaClient,
 * leaking SQLite connections until the dev server is restarted (and
 * eventually hitting Prisma's "Already 10 instances created" warning).
 *
 * Standard pattern from
 * https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
