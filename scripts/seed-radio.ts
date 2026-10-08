/**
 * OMNIVOID LABS - Seed the RadioShow table from the legacy Mixcloud list.
 *
 * Run AFTER `npx prisma db push`:
 *   npx tsx --env-file=.env scripts/seed-radio.ts
 *
 * Safe to re-run (skips URLs already present). Pulls cover art and the original
 * title from Mixcloud; the legacy short name becomes the display name.
 */

import { PrismaClient } from '@prisma/client';
import { MIXCLOUD_SHOWS } from '../src/constants/mixcloudPlaylists';
import { fetchMixcloudMeta } from '../src/lib/mixcloud';

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  let skipped = 0;

  for (const [i, show] of (MIXCLOUD_SHOWS as { url: string; name: string }[]).entries()) {
    if (await prisma.radioShow.findFirst({ where: { url: show.url } })) {
      skipped++;
      continue;
    }

    let meta = { title: null as string | null, author: null as string | null, thumbnailUrl: null as string | null };
    try {
      meta = await fetchMixcloudMeta(show.url);
    } catch (e: any) {
      console.warn(`  (no Mixcloud metadata for ${show.name}: ${e.message})`);
    }

    await prisma.radioShow.create({
      data: {
        title: show.name,
        originalTitle: meta.title,
        url: show.url,
        thumbnailUrl: meta.thumbnailUrl,
        author: meta.author,
        sortOrder: i,
      },
    });
    created++;
  }

  console.log(`Created ${created}, skipped ${skipped}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
