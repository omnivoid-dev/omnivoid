/**
 * OMNIVOID LABS - Load the 47K Phase tracks (the split-up Edition 001 set) into the database.
 *
 * For each 47K_Phase_NN.mp3 in the folder: re-encode to 128 kbps (needs ffmpeg/ffprobe on PATH),
 * upload to Supabase Storage (audio/), and create/update an AUDIO resource for Edition 001 with
 * 47K as the performer, so the tracks show in Admin > Audio Player and in that edition's playlist.
 * Safe to re-run: existing tracks are updated, never duplicated.
 *
 *   npx tsx --env-file=.env scripts/move-47k-audio-to-db.ts "K:/path/to/public/audio"
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createAdminClient } from '../src/lib/supabase/admin';
import { findOrCreatePerformerProfile } from '../src/lib/profiles';

const run = promisify(execFile);
const prisma = new PrismaClient();
const KBPS = 128;

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: move-47k-audio-to-db.ts <folder with 47K_Phase_NN.mp3 files>');

  const files = (await fs.readdir(dir)).filter((f) => /^47K_Phase_\d+\.mp3$/i.test(f)).sort();
  if (!files.length) throw new Error('No 47K_Phase_NN.mp3 files found in ' + dir);

  const edition = await prisma.edition.findUnique({ where: { slug: 'edition-001' } });
  if (!edition) throw new Error('Edition 001 (slug edition-001) not found');

  // 47K as a performer of Edition 001, linked to the shared 47K profile
  let performer = await prisma.performer.findFirst({ where: { editionId: edition.id, name: { equals: '47K', mode: 'insensitive' } } });
  if (!performer) {
    const profileId = await findOrCreatePerformerProfile(prisma, '47K');
    const count = await prisma.performer.count({ where: { editionId: edition.id } });
    performer = await prisma.performer.create({ data: { editionId: edition.id, name: '47K', sortOrder: count, profileId } });
    console.log('Added 47K to the Edition 001 roster.');
  }

  const storage = createAdminClient().storage.from('media');
  let totalIn = 0;
  let totalOut = 0;

  for (const file of files) {
    const n = parseInt(file.match(/Phase_(\d+)/i)![1], 10);
    const title = `47K - Phase ${String(n).padStart(2, '0')}`;
    const source = path.join(dir, file);

    const tmp = path.join(os.tmpdir(), `omnivoid_${Date.now()}_${file}`);
    await run('ffmpeg', ['-v', 'error', '-y', '-i', source, '-codec:a', 'libmp3lame', '-b:a', `${KBPS}k`, '-ar', '44100', '-map_metadata', '-1', tmp]);
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', tmp]);
    const duration = Math.round(parseFloat(stdout.trim()));
    const bytes = await fs.readFile(tmp);
    await fs.rm(tmp, { force: true });
    totalIn += (await fs.stat(source)).size;
    totalOut += bytes.length;

    const storagePath = `audio/${file}`;
    const { error } = await storage.upload(storagePath, bytes, { contentType: 'audio/mpeg', upsert: true });
    if (error) throw new Error(`Upload of ${file} failed: ${error.message}`);
    const url = storage.getPublicUrl(storagePath).data.publicUrl;

    const data = {
      editionId: edition.id,
      performerId: performer.id,
      type: 'AUDIO' as const,
      title,
      url,
      filePath: storagePath,
      metadata: { artist: '47K', duration, format: 'mp3', fileSize: bytes.length },
      sortOrder: n,
      isActive: true,
    };
    const existing = await prisma.resource.findFirst({ where: { type: 'AUDIO', editionId: edition.id, title } });
    if (existing) await prisma.resource.update({ where: { id: existing.id }, data });
    else await prisma.resource.create({ data });
    console.log(`${existing ? 'Updated' : 'Created'} ${title}  ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}  ${(bytes.length / 1048576).toFixed(1)}MB`);
  }

  console.log(`\n${files.length} tracks. ${(totalIn / 1048576).toFixed(0)}MB -> ${(totalOut / 1048576).toFixed(0)}MB after compression.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
