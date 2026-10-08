/**
 * OMNIVOID LABS - Populate editions from the poster archive.
 *
 *   npx tsx --env-file=.env scripts/populate-editions.ts                 dry run of stage A
 *   npx tsx --env-file=.env scripts/populate-editions.ts --write         stage A: editions, dates, venues,
 *                                                                        posters, workshops, themes, videos, radio
 *   npx tsx --env-file=.env scripts/populate-editions.ts --performers    dry run of stage B (review the table)
 *   npx tsx --env-file=.env scripts/populate-editions.ts --performers --write   stage B: lineups and profiles
 *
 * Idempotent: existing values are never overwritten unless --force is given. Handles are left blank.
 * Data comes from K:\F DRIVE\OMNIVOID\Posters\ALL POSTERS (dates, venues, lineups, workshops).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { createAdminClient } from '../src/lib/supabase/admin';
import { findOrCreatePerformerProfile } from '../src/lib/profiles';
import { getYouTubeId, youtubeThumbnail } from '../src/lib/youtube';
import { MIXCLOUD_SHOWS } from '../src/constants/mixcloudPlaylists';
import { fetchMixcloudMeta } from '../src/lib/mixcloud';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const FORCE = args.includes('--force');
const STAGE_B = args.includes('--performers');

const POSTER_DIR = 'K:/F DRIVE/OMNIVOID/Posters/ALL POSTERS';

interface Workshop {
  title: string;
  dateTime?: string;
  description: string;
  poster?: string;
}

interface EditionDef {
  slug: string;
  name: string;
  sortOrder: number;
  date: string; // ISO with offset; null when unknown
  venue?: string;
  city?: string;
  description?: string;
  poster?: string;
  isLatestRitual?: boolean;
  /** Theme preset id (resolved in code later) plus a rough palette sampled from the poster. */
  theme: { preset: string; palette?: { bg: string; ink: string; accent: string } };
  workshop?: Workshop;
}

const IST = '+05:30';

const EDITIONS: EditionDef[] = [
  {
    slug: 'edition-001', name: 'Edition 001', sortOrder: 1, date: `2025-07-13T16:00:00${IST}`, venue: 'Aura Studios', city: 'Chennai',
    description: 'Live sets and visuals. 4 PM.',
    poster: 'for thewildcity_.png',
    theme: { preset: 'dither-yellow', palette: { bg: '#000000', ink: '#FFC400', accent: '#FFFFFF' } },
    workshop: {
      title: 'Production 101: Tools for the Modern Producer',
      dateTime: `2025-07-13T11:00:00${IST}`,
      description: 'Workshop by ProMusicals, Chennai. Dive deeper into music production with creators, elevate your sound design and streamline your workflow. Industry-standard tools from Focusrite, Novation, Native Instruments, Universal Audio, ICON Pro Audio and Softube. 11 AM to 1 PM.',
      poster: 'workshop post.png',
    },
  },
  {
    slug: 'edition-002', name: 'Edition 002', sortOrder: 2, date: `2025-09-07T17:00:00${IST}`, venue: 'Aura Studios', city: 'Chennai',
    description: 'Live sets and visuals. 5 PM.',
    poster: 'Copy of A2 - gig poster ed002.png',
    theme: { preset: 'riso-blue', palette: { bg: '#241A7A', ink: '#2F7FC1', accent: '#C0278E' } },
    workshop: {
      title: 'Echoes from the Void',
      description: 'Labs sessions: Producer Roulette, Meditative Drone Session and Reactions.',
    },
  },
  {
    slug: 'special-la-nuit-blanche', name: 'La Nuit Blanche (Special)', sortOrder: 3, date: `2025-10-11T17:00:00${IST}`,
    venue: 'Alliance Francaise Madras, Espace 24', city: 'Chennai',
    description: 'OMNIVOID Specials. 5 PM to 2 AM. Entry free.',
    poster: 'Copy of Instagram post - 1.png',
    theme: { preset: 'vanity', palette: { bg: '#8A0F26', ink: '#FFE6A0', accent: '#FFB347' } },
  },
  {
    slug: 'edition-003', name: 'Edition 003', sortOrder: 4, date: `2025-11-02T17:00:00${IST}`, venue: 'Aura Studios', city: 'Chennai',
    description: 'Live and visuals. 5 PM.',
    poster: 'phat.png',
    theme: { preset: 'ascii-green', palette: { bg: '#121212', ink: '#00FF30', accent: '#BBBBBB' } },
    workshop: {
      title: 'Inside the Mix (Labs 003)',
      dateTime: `2025-11-02T11:00:00${IST}`,
      description: 'With Krishnamurthy Ramesh, Ableton Certified Trainer: Ableton Live 12.3 showcase, production insights, live sampling and Producer Roulette. 11 AM to 2 PM.',
      poster: 'workshop (1).png',
    },
  },
  {
    slug: 'edition-004', name: 'Edition 004', sortOrder: 5, date: `2025-12-21T17:00:00${IST}`, venue: 'Aura Studios', city: 'Chennai',
    description: 'Gates 5 PM.',
    poster: 'gig4 - post (1).png',
    theme: { preset: 'oscilloscope-red', palette: { bg: '#050505', ink: '#FF1A1A', accent: '#FFB3B3' } },
    workshop: {
      title: 'Visions from the Void (Labs 004)',
      dateTime: `2025-12-21T10:30:00${IST}`,
      description: 'VJ Zombie on live analog video synthesis, Krishnamurthy Ramesh on analog synthesis concepts, and Producers Against the Clock with Shayne Ballantyne and Native Indian. 10:30 AM to 1:30 PM.',
      poster: 'workshop.png',
    },
  },
  {
    slug: 'edition-005', name: 'Edition 005', sortOrder: 6, date: `2026-02-07T17:00:00${IST}`, venue: 'Aura Studios', city: 'Chennai',
    description: '5 PM.',
    poster: 'gig poster — post (1).png',
    theme: { preset: 'ai-goo-red-metallic', palette: { bg: '#05060A', ink: '#F23B0E', accent: '#C9D3DC' } },
    workshop: {
      title: 'Labs 005',
      dateTime: `2026-02-07T11:00:00${IST}`,
      description: 'skipster: hybrid DJ production workshop. spryk: AV performance workshop. against the clock: 15-minute producer challenge. 11 AM.',
      poster: 'workshop poster — post.png',
    },
  },
  {
    slug: 'edition-007', name: 'Edition 007', sortOrder: 7, date: `2026-04-11T17:00:00${IST}`, venue: 'KKALA, Versova', city: 'Mumbai',
    description: 'OMNIVOID.live. Gates 5 PM.',
    poster: '1777646659489.jpg',
    theme: { preset: 'dither-purple-green', palette: { bg: '#A924C6', ink: '#7DC15E', accent: '#FFFFFF' } },
  },
  {
    slug: 'edition-008', name: 'Edition 008', sortOrder: 8, date: '',
    theme: { preset: 'glitch-print' },
  },
  {
    slug: 'edition-009', name: 'Edition 009', sortOrder: 9, date: '',
    theme: { preset: 'cyanotype-blue', palette: { bg: '#0B2A5B', ink: '#E8F1FF', accent: '#2F6FD0' } },
  },
  {
    slug: 'edition-010', name: 'Edition 010', sortOrder: 10, date: '2026-11-15T12:00:00Z', isLatestRitual: true,
    theme: { preset: 'mandelbrot' },
  },
];

// ---------------- Stage B: lineups from the posters ----------------

interface Act { name: string; role?: string }
const LINEUPS: Record<string, Act[]> = {
  'edition-001': [
    { name: 'The Öbjektz' }, { name: 'Gooth' }, { name: '47K' },
    { name: 'Juncando', role: 'Visuals' }, { name: 'Television Dust', role: 'Visuals' }, { name: 'Designst3in', role: 'Visuals' },
  ],
  'edition-002': [
    { name: 'Sijya', role: 'Alt / Ambient / Art rock · Delhi' },
    { name: 'Dakta Dub', role: 'Roots / Dub / Reggae · Hyderabad' },
    { name: 'The Broadway Addicts', role: 'Post punk · Chennai' },
    { name: 'Juncando', role: 'Visuals' }, { name: 'Designst3in', role: 'Visuals' }, { name: 'Television Dust', role: 'Visuals' },
  ],
  'special-la-nuit-blanche': [
    { name: 'Raj', role: 'Lo-fi jazz / House / Soul · Delhi' },
    { name: 'Sinhwave', role: 'Deep dubstep / Dub techno / Jungle · Hyderabad' },
    { name: 'The Öbjektz', role: 'Afro / French house / Electronica · Chennai' },
    { name: 'NoLatency', role: 'Ambient / IDM / Electronica · Chennai' },
    { name: 'Cursorama', role: 'Immersive video art · Goa' },
  ],
  'edition-003': [
    { name: 'Native Indian', role: 'Hip-hop / Alt / Experimental · Chennai' },
    { name: 'Yuhina', role: 'Electronica / Experimental · Gangtok / Bengaluru' },
    { name: 'Elsewhere in India', role: 'DnB / Trip hop / Electroclassical Indian · Hyderabad / Goa' },
    { name: 'Television Dust', role: 'Visuals' }, { name: 'Designst3in', role: 'Visuals' },
    { name: 'Krishnamurthy Ramesh', role: 'Workshop host · Ableton Certified Trainer' },
  ],
  'edition-004': [
    { name: 'Komorebi', role: 'Delhi' },
    { name: 'Kuru Circus', role: 'Bengaluru / Delhi / Goa' },
    { name: 'VJ Zombie', role: 'Visuals · USA' },
    { name: 'NoLatency', role: 'Ambient / IDM / Electronica · Chennai' },
    { name: 'Television Dust', role: 'Visuals · Chennai' },
    { name: 'Krishnamurthy Ramesh', role: 'Workshop host · Ableton Certified Trainer' },
    { name: 'Shayne Ballantyne', role: 'Producers Against the Clock' },
  ],
  'edition-005': [
    { name: 'pause.dxa', role: 'Dhrupad + electronic soundscapes' },
    { name: 'neural natak', role: 'Technomagic by Spryk' },
    { name: 'Hemant Sreekumar', role: 'Harsh noise / Power electronics' },
    { name: 'skipster', role: 'Workshop host · Hybrid DJ production' },
    { name: 'spryk', role: 'Workshop host · AV performance' },
  ],
  'edition-007': [
    { name: 'Animal Factory Amplification' }, { name: 'Darknaam' }, { name: 'Naad Labs' }, { name: 'Philtersoup' },
  ],
  // No poster available yet: taken from the video titles, to be confirmed
  'edition-008': [
    { name: 'Jhanu - Nila' }, { name: 'Geography of the Moon' }, { name: 'DIFFFREKT' }, { name: 'hanging wave' },
  ],
};

// Workshop-only hosts for Edition 001's Production 101
const EXTRA_PEOPLE: Record<string, Act[]> = {
  'edition-001': [
    { name: 'Vivin Kuruvilla', role: 'Workshop host · National Head, Sales & Marketing, ProMusicals' },
    { name: 'Premik Jolly', role: 'Workshop host · Musician, producer & educator' },
  ],
};

/** Which performer a video title belongs to (substring match, lowercase). */
const VIDEO_ALIASES: [string, string][] = [
  ['öbjektz', 'The Öbjektz'], ['47k', '47K'], ['gooth', 'Gooth'],
  ['broadway addicts', 'The Broadway Addicts'], ['dakta dub', 'Dakta Dub'],
  ['elsewhere in india', 'Elsewhere in India'], ['native indian', 'Native Indian'],
  ['pause.dxa', 'pause.dxa'], ['hemant', 'Hemant Sreekumar'],
  ['animal factory', 'Animal Factory Amplification'], ['naad labs', 'Naad Labs'], ['philtersoup', 'Philtersoup'], ['darknaam', 'Darknaam'],
  ['jhanu', 'Jhanu - Nila'], ['geography of the moon', 'Geography of the Moon'], ['difffrekt', 'DIFFFREKT'], ['hanging wave', 'hanging wave'],
];

/** Mixcloud URL fragment -> edition and performer */
const RADIO_MAP: [string, string, string][] = [
  ['rajkanwar-sodhi', 'special-la-nuit-blanche', 'Raj'],
  ['sinhwave', 'special-la-nuit-blanche', 'Sinhwave'],
  ['la-nuit-blanche', 'special-la-nuit-blanche', 'The Öbjektz'],
  ['broadway-addicts', 'edition-002', 'The Broadway Addicts'],
  ['dakta-dub', 'edition-002', 'Dakta Dub'],
  ['gooth', 'edition-001', 'Gooth'],
  ['47k', 'edition-001', '47K'],
  ['ed001', 'edition-001', 'The Öbjektz'],
];

// ---------------- helpers ----------------

const log = (...a: unknown[]) => console.log(...a);
const poster = (f: string) => path.join(POSTER_DIR, f);

async function uploadPoster(file: string, slug: string, tag: string): Promise<string | null> {
  const src = poster(file);
  try {
    await fs.access(src);
  } catch {
    log(`   ! poster file missing: ${file}`);
    return null;
  }
  const input = await fs.readFile(src);
  const out = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  log(`   poster ${file}: ${(input.length / 1024).toFixed(0)}KB -> ${(out.length / 1024).toFixed(0)}KB WebP`);
  if (!WRITE) return `(dry run) ${slug}-${tag}.webp`;

  const storage = createAdminClient().storage.from('media');
  const dest = `posters/${Date.now()}_${slug}_${tag}.webp`;
  const { error } = await storage.upload(dest, out, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error(`upload ${dest}: ${error.message}`);
  return storage.getPublicUrl(dest).data.publicUrl;
}

// ---------------- Stage A ----------------

async function stageA() {
  log(`\n=== STAGE A: editions, posters, workshops, themes ${WRITE ? '(WRITE)' : '(dry run)'} ===\n`);
  const editionIdBySlug = new Map<string, string>();

  for (const def of EDITIONS) {
    const existing = await prisma.edition.findUnique({ where: { slug: def.slug } });
    log(`${existing ? '~' : '+'} ${def.name}  [${def.slug}]  ${def.date ? def.date.slice(0, 10) : 'date TBC'}  ${[def.venue, def.city].filter(Boolean).join(', ') || ''}  theme=${def.theme.preset}${def.isLatestRitual ? '  ★ LATEST RITUAL' : ''}`);

    const data: Record<string, unknown> = {
      name: existing && !FORCE ? existing.name : def.name,
      sortOrder: def.sortOrder,
      isActive: true,
      themeColors: def.theme,
    };
    const setIf = (key: string, value: unknown, current: unknown) => {
      if (value !== undefined && value !== '' && (FORCE || current == null || current === '' || current === false)) data[key] = value;
    };
    setIf('eventDate', def.date ? new Date(def.date) : undefined, existing?.eventDate);
    setIf('venue', def.venue, existing?.venue);
    setIf('city', def.city, existing?.city);
    setIf('description', def.description, existing?.description);

    if (def.poster && (FORCE || !existing?.posterUrl)) {
      const url = await uploadPoster(def.poster, def.slug, 'poster');
      if (url) data.posterUrl = url;
    }
    if (def.workshop) {
      setIf('hasWorkshop', true, existing?.hasWorkshop);
      setIf('workshopTitle', def.workshop.title, existing?.workshopTitle);
      setIf('workshopDescription', def.workshop.description, existing?.workshopDescription);
      setIf('workshopDateTime', def.workshop.dateTime ? new Date(def.workshop.dateTime) : undefined, existing?.workshopDateTime);
      if (def.workshop.poster && (FORCE || !existing?.workshopPosterUrl)) {
        const url = await uploadPoster(def.workshop.poster, def.slug, 'workshop');
        if (url) data.workshopPosterUrl = url;
      }
    }

    let id = existing?.id;
    if (WRITE) {
      if (def.isLatestRitual) await prisma.edition.updateMany({ where: { slug: { not: def.slug }, isLatestRitual: true }, data: { isLatestRitual: false, ticketUrl: null, ticketLabel: null, workshopTicketUrl: null } });
      if (def.isLatestRitual) data.isLatestRitual = true;
      const saved = existing
        ? await prisma.edition.update({ where: { id: existing.id }, data: data as any })
        : await prisma.edition.create({ data: { slug: def.slug, ...(data as any) } });
      id = saved.id;
    }
    if (id) editionIdBySlug.set(def.slug, id);
  }

  // Legacy bucket edition: hide it (its 11 gallery images stay untouched)
  const legacy = await prisma.edition.findUnique({ where: { slug: '2024' } });
  if (legacy?.isActive) {
    log(`\n~ legacy "${legacy.name}" (slug 2024) -> hidden from the site`);
    if (WRITE) await prisma.edition.update({ where: { id: legacy.id }, data: { isActive: false } });
  }

  // Videos: copy the legacy YouTube Link rows into Transmission, attached to their edition
  log('\n--- Videos ---');
  const links = await prisma.link.findMany({ where: { type: 'YOUTUBE', editionId: { not: null } }, orderBy: { sortOrder: 'asc' } });
  let made = 0;
  for (const [i, link] of links.entries()) {
    const dup = await prisma.transmission.findFirst({ where: { editionId: link.editionId!, url: link.url } });
    if (dup) continue;
    const ytId = (link.metadata as any)?.youtubeId || getYouTubeId(link.url);
    const kind = link.category === 'labs' ? 'LABS' : 'SET';
    log(`+ [${kind}] ${link.title.trim()}`);
    made++;
    if (WRITE) {
      await prisma.transmission.create({
        data: {
          editionId: link.editionId!, title: link.title.trim(), originalTitle: link.title.trim(), url: link.url,
          youtubeId: ytId, thumbnailUrl: (link.metadata as any)?.thumbnailUrl || youtubeThumbnail(ytId),
          kind, isActive: link.isActive, sortOrder: link.sortOrder ?? i,
        },
      });
    }
  }
  log(`   ${made} video(s) to create (${links.length - made} already present).`);

  // Radio shows
  log('\n--- Radio (Mixcloud) ---');
  for (const [i, show] of (MIXCLOUD_SHOWS as { url: string; name: string }[]).entries()) {
    const found = await prisma.radioShow.findFirst({ where: { url: show.url } });
    const match = RADIO_MAP.find(([frag]) => show.url.toLowerCase().includes(frag));
    const editionId = match ? editionIdBySlug.get(match[1]) ?? (await prisma.edition.findUnique({ where: { slug: match[1] } }))?.id : undefined;
    log(`${found ? '~' : '+'} ${show.name}  ->  ${match ? match[1] : 'no edition'}`);
    if (!WRITE) continue;
    if (found) {
      if (!found.editionId && editionId) await prisma.radioShow.update({ where: { id: found.id }, data: { editionId } });
      continue;
    }
    let meta: { title: string | null; author: string | null; thumbnailUrl: string | null } = { title: null, author: null, thumbnailUrl: null };
    try { meta = await fetchMixcloudMeta(show.url); } catch { /* names only */ }
    await prisma.radioShow.create({
      data: { title: show.name, originalTitle: meta.title, url: show.url, thumbnailUrl: meta.thumbnailUrl, author: meta.author, editionId: editionId ?? null, sortOrder: i },
    });
  }
}

// ---------------- Stage B ----------------

async function stageB() {
  log(`\n=== STAGE B: lineups and performer profiles ${WRITE ? '(WRITE)' : '(dry run: review this table)'} ===\n`);

  for (const [slug, acts] of Object.entries(LINEUPS)) {
    const edition = await prisma.edition.findUnique({ where: { slug } });
    const all = [...acts, ...(EXTRA_PEOPLE[slug] || [])];
    log(`${edition?.name ?? slug}${edition ? '' : '  (edition missing: run stage A first)'}`);
    for (const [i, act] of all.entries()) {
      log(`   ${String(i + 1).padStart(2)}. ${act.name}${act.role ? `   [${act.role}]` : ''}${slug === 'edition-008' ? '   ?? confirm' : ''}`);
      if (!WRITE || !edition) continue;

      const profileId = await findOrCreatePerformerProfile(prisma, act.name, null, null);
      if (act.role) {
        const p = await prisma.profile.findUnique({ where: { id: profileId } });
        if (p && !p.role) await prisma.profile.update({ where: { id: profileId }, data: { role: act.role } });
      }
      const exists = await prisma.performer.findFirst({ where: { editionId: edition.id, name: { equals: act.name, mode: 'insensitive' } } });
      if (exists) {
        if (!exists.profileId) await prisma.performer.update({ where: { id: exists.id }, data: { profileId } });
      } else {
        await prisma.performer.create({ data: { editionId: edition.id, name: act.name, profileId, sortOrder: i } });
      }
    }
  }

  // Attach videos and radio shows to performers
  log('\n--- Video -> performer ---');
  const transmissions = await prisma.transmission.findMany({ include: { edition: { select: { slug: true } } } });
  for (const t of transmissions) {
    const alias = VIDEO_ALIASES.find(([frag]) => t.title.toLowerCase().includes(frag));
    if (!alias) {
      log(`   (no performer)  ${t.title.trim()}`);
      continue;
    }
    const performer = await prisma.performer.findFirst({ where: { editionId: t.editionId, name: { equals: alias[1], mode: 'insensitive' } } });
    log(`   ${performer ? '✓' : '✗ missing'}  ${t.title.trim()}  ->  ${alias[1]}`);
    if (WRITE && performer && !t.performerId) await prisma.transmission.update({ where: { id: t.id }, data: { performerId: performer.id } });
  }

  log('\n--- Radio -> performer ---');
  for (const show of await prisma.radioShow.findMany()) {
    const match = RADIO_MAP.find(([frag]) => show.url.toLowerCase().includes(frag));
    if (!match) continue;
    const edition = await prisma.edition.findUnique({ where: { slug: match[1] } });
    const performer = edition ? await prisma.performer.findFirst({ where: { editionId: edition.id, name: { equals: match[2], mode: 'insensitive' } } }) : null;
    log(`   ${performer ? '✓' : '✗ missing'}  ${show.title}  ->  ${match[2]}`);
    if (WRITE && performer && !show.performerId) await prisma.radioShow.update({ where: { id: show.id }, data: { performerId: performer.id } });
  }
}

(async () => {
  if (STAGE_B) await stageB();
  else await stageA();
  if (!WRITE) log('\nDry run only. Add --write to apply.');
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
