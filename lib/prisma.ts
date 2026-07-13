import { PrismaClient } from '@prisma/client';
import { isDemoMode } from '@/lib/demo/config';

// Standard Next.js singleton pattern — avoids exhausting connections
// during dev hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Demo Mode never touches Postgres — every repository module checks
 * `isDemoMode()` before using `prisma` at all. Constructing a real
 * `PrismaClient` regardless (the previous behaviour) would mean merely
 * *importing* this module could fail without `DATABASE_URL` configured,
 * which defeats "no database migrations" as a Demo Mode promise. The
 * Proxy below is never touched in practice; it exists so a future
 * repository function that forgets its `isDemoMode()` check fails loudly
 * and immediately, rather than silently trying (and failing) to reach a
 * database that was never configured.
 */
function createPrismaClient(): PrismaClient {
  if (isDemoMode()) {
    return new Proxy(
      {},
      {
        get() {
          throw new Error(
            'Prisma was accessed while Demo Mode is active. Every repository function must check isDemoMode() before using `prisma` — see lib/demo/store.ts.'
          );
        },
      }
    ) as PrismaClient;
  }
  return globalForPrisma.prisma ?? new PrismaClient();
}

export const prisma = createPrismaClient();

if (process.env.NODE_ENV !== 'production' && !isDemoMode()) globalForPrisma.prisma = prisma;
