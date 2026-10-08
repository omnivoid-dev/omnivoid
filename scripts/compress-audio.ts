/**
 * OMNIVOID LABS - Re-encode MP3s to a smaller bitrate (needs ffmpeg on PATH).
 *
 * Local files (a file or a folder):
 *   npx tsx scripts/compress-audio.ts public/audio/47K_Phase_01.mp3          (dry run)
 *   npx tsx scripts/compress-audio.ts public/audio/47K_Phase_01.mp3 --write  (replace in place)
 *   npx tsx scripts/compress-audio.ts public/audio --kbps 96 --write
 *
 * Supabase Storage (the audio/ folder; same public URLs, files replaced in place):
 *   npx tsx --env-file=.env scripts/compress-audio.ts --supabase --write
 *
 * Files already at or below the target bitrate are skipped, and a result that is not
 * smaller than the original is discarded. Dry run is the default.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAdminClient } from '../src/lib/supabase/admin';

const run = promisify(execFile);

const args = process.argv.slice(2);
const write = args.includes('--write');
const useSupabase = args.includes('--supabase');
const kbpsIdx = args.indexOf('--kbps');
const kbps = kbpsIdx >= 0 ? parseInt(args[kbpsIdx + 1]) : 128;
const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--kbps');

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)}MB`;

async function bitrateOf(file: string): Promise<number> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=bit_rate', '-of', 'default=nw=1:nk=1', file]);
  return Math.round(parseInt(stdout.trim()) / 1000);
}

/** Encode `input` to a temp MP3; returns its path, or null if it would not be smaller. */
async function encode(input: string, originalSize: number): Promise<string | null> {
  const out = path.join(os.tmpdir(), `omnivoid_${Date.now()}_${path.basename(input)}`);
  await run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-codec:a', 'libmp3lame', '-b:a', `${kbps}k`, '-ar', '44100', '-map_metadata', '-1', out]);
  const size = (await fs.stat(out)).size;
  if (size >= originalSize) {
    await fs.rm(out, { force: true });
    return null;
  }
  return out;
}

async function localFiles(p: string): Promise<string[]> {
  const stat = await fs.stat(p);
  if (stat.isFile()) return [p];
  return (await fs.readdir(p)).filter((f) => f.toLowerCase().endsWith('.mp3')).map((f) => path.join(p, f));
}

async function compressLocal(p: string) {
  let saved = 0;
  for (const file of await localFiles(p)) {
    const size = (await fs.stat(file)).size;
    const current = await bitrateOf(file);
    if (current <= kbps * 1.05) {
      console.log(`skip   ${path.basename(file)} (${current} kbps, ${mb(size)})`);
      continue;
    }
    const out = await encode(file, size);
    if (!out) {
      console.log(`skip   ${path.basename(file)} (not smaller)`);
      continue;
    }
    const newSize = (await fs.stat(out)).size;
    console.log(`${write ? 'saved ' : 'would '} ${path.basename(file)}: ${current} kbps ${mb(size)} -> ${kbps} kbps ${mb(newSize)}`);
    if (write) {
      await fs.copyFile(out, file);
      saved += size - newSize;
    }
    await fs.rm(out, { force: true });
  }
  if (write) console.log(`\nFreed ${mb(saved)}.`);
}

async function compressSupabase() {
  const storage = createAdminClient().storage.from('media');
  const { data: files, error } = await storage.list('audio', { limit: 1000 });
  if (error || !files) throw new Error(error?.message || 'Could not list audio/');

  let saved = 0;
  for (const f of files.filter((x) => x.id && x.name.toLowerCase().endsWith('.mp3'))) {
    const remote = `audio/${f.name}`;
    const size = Number((f.metadata as any)?.size) || 0;
    const tmpIn = path.join(os.tmpdir(), `omnivoid_in_${Date.now()}_${f.name}`);

    const dl = await storage.download(remote);
    if (dl.error || !dl.data) {
      console.log(`fail   ${remote}: ${dl.error?.message}`);
      continue;
    }
    await fs.writeFile(tmpIn, Buffer.from(await dl.data.arrayBuffer()));

    const current = await bitrateOf(tmpIn);
    if (current <= kbps * 1.05) {
      console.log(`skip   ${remote} (${current} kbps)`);
    } else {
      const out = await encode(tmpIn, size || (await fs.stat(tmpIn)).size);
      if (!out) {
        console.log(`skip   ${remote} (not smaller)`);
      } else {
        const newSize = (await fs.stat(out)).size;
        console.log(`${write ? 'saved ' : 'would '} ${remote}: ${current} kbps ${mb(size)} -> ${kbps} kbps ${mb(newSize)}`);
        if (write) {
          const up = await storage.upload(remote, await fs.readFile(out), { contentType: 'audio/mpeg', upsert: true });
          if (up.error) console.log(`fail   upload ${remote}: ${up.error.message}`);
          else saved += size - newSize;
        }
        await fs.rm(out, { force: true });
      }
    }
    await fs.rm(tmpIn, { force: true });
  }
  if (write) console.log(`\nFreed ${mb(saved)}.`);
}

(async () => {
  console.log(`${write ? 'WRITE' : 'DRY RUN'} · target ${kbps} kbps\n`);
  if (useSupabase) await compressSupabase();
  else if (target) await compressLocal(target);
  else console.log('Give a file/folder path, or use --supabase.');
  if (!write) console.log('\nDry run only. Add --write to apply.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
