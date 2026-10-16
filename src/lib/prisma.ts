/**
 * OMNIVOID LABS - Prisma Client Singleton
 * 
 * This module exports a singleton instance of the Prisma client
 * to ensure efficient database connections in serverless environments.
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const SLOW_QUERY_MS = 1000;

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      ...(process.env.NODE_ENV === 'development' ? [{ emit: 'stdout' as const, level: 'warn' as const }] : []),
    ],
  });
  // Surface slow database calls in the server logs (Vercel) so latency problems are visible
  (client as any).$on('query', (e: { duration: number; query: string }) => {
    if (e.duration >= SLOW_QUERY_MS) console.warn(`[db] slow query ${e.duration}ms: ${e.query.slice(0, 120)}`);
  });
  return client;
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;