/**
 * Create the hand-made playlist "47K at Edition 001" from the 47K Phase tracks. Safe to re-run.
 *   npx tsx --env-file=.env scripts/seed-47k-playlist.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const NAME = '47K at Edition 001';

async function main() {
  const tracks = await prisma.resource.findMany({
    where: { type: 'AUDIO', title: { startsWith: '47K - Phase' }, edition: { slug: 'edition-001' } },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  if (!tracks.length) throw new Error('No 47K Phase tracks found; run move-47k-audio-to-db.ts first');

  const existing = await prisma.playlist.findFirst({ where: { name: NAME } });
  if (existing) {
    console.log('Playlist already exists; leaving it untouched.');
    return;
  }
  await prisma.playlist.create({
    data: { name: NAME, description: 'The Phase series, in order.', items: { create: tracks.map((t, i) => ({ resourceId: t.id, sortOrder: i })) } },
  });
  console.log(`Created "${NAME}" with ${tracks.length} tracks.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
