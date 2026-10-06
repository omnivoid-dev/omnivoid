/**
 * OMNIVOID LABS - YouTube oEmbed Metadata Fetcher & Edition Organizer
 * 
 * Fetches exact YouTube titles for all 21 transmission links using YouTube oEmbed API,
 * parses edition names (e.g., "Edition 001", "Edition 002"), creates Edition records,
 * and updates Link records in the database.
 * 
 * Usage: npx tsx --env-file=.env scripts/fetch-youtube-editions.ts
 */

import { prisma } from '../src/lib/prisma';

interface YouTubeOEmbed {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function fetchOEmbed(url: string): Promise<YouTubeOEmbed | null> {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) {
      console.warn(`⚠️ Could not fetch oEmbed for ${url} (HTTP ${res.status})`);
      return null;
    }
    return (await res.json()) as YouTubeOEmbed;
  } catch (err: any) {
    console.error(`❌ Error fetching oEmbed for ${url}:`, err?.message || err);
    return null;
  }
}

function parseEditionName(title: string): { slug: string; name: string } | null {
  // Look for patterns like "Edition 001", "ED001", "Edition 01", "ED 01", "Edition 1", "Ed 001"
  const match = title.match(/(?:Edition|Ed|ED)\s*#?\s*0*(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const padded = String(num).padStart(3, '0'); // e.g. "001"
    return {
      slug: `edition-${padded}`,
      name: `Edition ${padded}`,
    };
  }
  return null;
}

async function main() {
  console.log('🔍 Fetching YouTube titles & organizing by Edition...\n');

  const links = await prisma.link.findMany({
    where: { type: 'YOUTUBE' },
  });

  console.log(`Found ${links.length} YouTube links in database.`);

  for (const link of links) {
    const videoId = extractVideoId(link.url);
    console.log(`\n--------------------------------------------------`);
    console.log(`Processing link: ${link.url}`);

    const oembed = await fetchOEmbed(link.url);
    
    if (oembed) {
      const fullTitle = oembed.title;
      console.log(`  📹 YouTube Title: "${fullTitle}"`);
      console.log(`  👤 Author: ${oembed.author_name}`);

      const editionInfo = parseEditionName(fullTitle);
      let targetEditionId = link.editionId;

      if (editionInfo) {
        console.log(`  🎯 Detected Edition: ${editionInfo.name} (slug: ${editionInfo.slug})`);

        // Upsert Edition in database
        const edition = await prisma.edition.upsert({
          where: { slug: editionInfo.slug },
          update: { name: editionInfo.name },
          create: {
            name: editionInfo.name,
            slug: editionInfo.slug,
            description: `${editionInfo.name} Live Performances`,
            isActive: true,
            sortOrder: parseInt(editionInfo.slug.replace('edition-', ''), 10),
          },
        });
        targetEditionId = edition.id;
      } else {
        console.log(`  ℹ️ No specific Edition number detected in title.`);
      }

      // Update link with exact YouTube title, metadata, and editionId
      await prisma.link.update({
        where: { id: link.id },
        data: {
          title: fullTitle,
          editionId: targetEditionId,
          metadata: {
            ...(typeof link.metadata === 'object' && link.metadata !== null ? link.metadata : {}),
            youtubeId: videoId,
            authorName: oembed.author_name,
            thumbnailUrl: oembed.thumbnail_url,
          },
        },
      });
      console.log(`  ✅ Updated Link in database.`);
    } else {
      console.log(`  ⚠️ Failed to retrieve oEmbed info for ${link.url}`);
    }
  }

  console.log('\n🎉 Finished processing YouTube links & Edition mappings!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
