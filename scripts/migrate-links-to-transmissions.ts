/**
 * OMNIVOID LABS - Copy legacy YouTube Link rows into the Transmission table.
 *
 * Run AFTER `npx prisma db push`:
 *   npx tsx --env-file=.env scripts/migrate-links-to-transmissions.ts
 *
 * Safe to re-run (skips URLs already present for the edition). Does NOT delete
 * the original Link rows; remove them later once the new site is verified.
 */

import { PrismaClient } from '@prisma/client';
import { getYouTubeId, youtubeThumbnail } from '../src/lib/youtube';

const prisma = new PrismaClient();

async function main() {
  const links = await prisma.link.findMany({ where: { type: 'YOUTUBE', editionId: { not: null } } });
  let created = 0;
  let skipped = 0;

  for (const [i, link] of links.entries()) {
    const editionId = link.editionId!;
    const exists = await prisma.transmission.findFirst({ where: { editionId, url: link.url } });
    if (exists) {
      skipped++;
      continue;
    }

    const youtubeId = (link.metadata as any)?.youtubeId || getYouTubeId(link.url);
    await prisma.transmission.create({
      data: {
        editionId,
        title: link.title.trim(),
        originalTitle: link.title.trim(),
        url: link.url,
        youtubeId,
        thumbnailUrl: (link.metadata as any)?.thumbnailUrl || youtubeThumbnail(youtubeId),
        kind: link.category === 'labs' ? 'LABS' : 'SET',
        isActive: link.isActive,
        sortOrder: link.sortOrder ?? i,
      },
    });
    created++;
  }

  const orphans = await prisma.link.count({ where: { type: 'YOUTUBE', editionId: null } });
  console.log(`Created ${created}, skipped ${skipped}. YouTube links without an edition (not migrated): ${orphans}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
