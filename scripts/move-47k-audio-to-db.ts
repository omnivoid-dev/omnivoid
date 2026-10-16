/**
 * OMNIVOID LABS - Move the hard-coded "47K - Phase 01" track into the database.
 *
 * Uploads public/audio/47K_Phase_01.mp3 to Supabase Storage (audio/), then creates the AUDIO
 * resource for Edition 001 with 47K as the performer, so it shows up in Admin > Audio Player
 * and in the player's playlist for that edition. Safe to re-run: nothing is duplicated.
 *
 *   npx tsx --env-file=.env scripts/move-47k-audio-to-db.ts
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createAdminClient } from '../src/lib/supabase/admin';
import { findOrCreatePerformerProfile } from '../src/lib/profiles';

const prisma = new PrismaClient();
const FILE = path.join('public', 'audio', '47K_Phase_01.mp3');
const STORAGE_PATH = 'audio/47K_Phase_01.mp3';
const DURATION_SECONDS = 270; // measured with ffprobe: 270.03s
const TITLE = '47K - Phase 01';

async function main() {
  const edition = await prisma.edition.findUnique({ where: { slug: 'edition-001' } });
  if (!edition) throw new Error('Edition 001 (slug edition-001) not found');

  const existing = await prisma.resource.findFirst({ where: { type: 'AUDIO', editionId: edition.id, title: TITLE } });
  if (existing) {
    console.log('Already in the database; nothing to do.');
    return;
  }

  const bytes = await fs.readFile(FILE);
  const storage = createAdminClient().storage.from('media');
  const { error } = await storage.upload(STORAGE_PATH, bytes, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const url = storage.getPublicUrl(STORAGE_PATH).data.publicUrl;

  // 47K as a performer of Edition 001, linked to the shared 47K profile
  let performer = await prisma.performer.findFirst({ where: { editionId: edition.id, name: { equals: '47K', mode: 'insensitive' } } });
  if (!performer) {
    const profileId = await findOrCreatePerformerProfile(prisma, '47K');
    const count = await prisma.performer.count({ where: { editionId: edition.id } });
    performer = await prisma.performer.create({ data: { editionId: edition.id, name: '47K', sortOrder: count, profileId } });
    console.log('Added 47K to the Edition 001 roster.');
  }

  await prisma.resource.create({
    data: {
      editionId: edition.id,
      performerId: performer.id,
      type: 'AUDIO',
      title: TITLE,
      url,
      filePath: STORAGE_PATH,
      metadata: { artist: '47K', duration: DURATION_SECONDS, format: 'mp3', fileSize: bytes.length },
      sortOrder: 0,
      isActive: true,
    },
  });
  console.log('Created the audio track:', url);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
