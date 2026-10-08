/**
 * Supabase Storage housekeeping (server-side).
 *
 * Uploads are "appended" immediately so the admin sees a preview, but a file only
 * survives if a saved record points at it:
 *  - deleteIfUnreferenced(): called when a record is replaced/deleted, removes files nothing uses any more.
 *  - scanOrphans() / purgeOrphans(): sweep for files that were uploaded but never saved
 *    (older than a grace period, so in-progress forms are never touched).
 *
 * Only folders created by the admin upload flows are managed. Legacy `docs/` and `gallery/` are never touched.
 */

import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';

export const BUCKET = 'media';
export const MANAGED_FOLDERS = ['thumbnails', 'posters', 'research', 'audio', 'branding'];
export const GRACE_MS = 24 * 60 * 60 * 1000;

const marker = `/object/public/${BUCKET}/`;

/** Public Supabase URL -> storage path ("thumbnails/123_x.webp"), or null if it is not one of ours. */
export function storagePathFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
  } catch {
    return null;
  }
}

const isManaged = (path: string) => MANAGED_FOLDERS.includes(path.split('/')[0]);

/** Every storage path currently referenced by a saved record. */
async function collectReferences(): Promise<string> {
  const [docs, editions, resources, links, radio, settings] = await Promise.all([
    prisma.document.findMany({ select: { fileUrl: true, thumbnailUrl: true } }),
    prisma.edition.findMany({ select: { posterUrl: true, workshopPosterUrl: true } }),
    prisma.resource.findMany({ select: { url: true, filePath: true, thumbnailUrl: true } }),
    prisma.link.findMany({ select: { url: true } }),
    prisma.radioShow.findMany({ select: { thumbnailUrl: true } }),
    prisma.siteSettings.findMany({ select: { value: true } }),
  ]);

  // One big haystack; a path counts as referenced if it appears anywhere in it.
  return JSON.stringify([docs, editions, resources, links, radio, settings.map((s) => s.value)]);
}

/** Extract every storage path mentioned in an arbitrary JSON value (used for settings diffs). */
export function pathsInValue(value: unknown): string[] {
  const text = JSON.stringify(value ?? null);
  const found = new Set<string>();
  const re = /https?:\/\/[^"\\\s]+/g;
  for (const m of text.match(re) || []) {
    const p = storagePathFromUrl(m);
    if (p) found.add(p);
  }
  return [...found];
}

/** Delete the given files (URLs or paths) unless a saved record still references them. */
export async function deleteIfUnreferenced(items: (string | null | undefined)[]): Promise<string[]> {
  const paths = [
    ...new Set(items.map((i) => (i && !i.startsWith('http') ? i : storagePathFromUrl(i))).filter((p): p is string => !!p)),
  ].filter(isManaged);
  if (paths.length === 0) return [];

  const haystack = await collectReferences();
  const doomed = paths.filter((p) => !haystack.includes(p));
  if (doomed.length === 0) return [];

  const { error } = await createAdminClient().storage.from(BUCKET).remove(doomed);
  if (error) {
    console.error('Storage cleanup failed:', error.message);
    return [];
  }
  return doomed;
}

export interface Orphan {
  path: string;
  size: number;
  createdAt: string;
}

/** Files in managed folders that no record references and are past the grace period. */
export async function scanOrphans(): Promise<Orphan[]> {
  const storage = createAdminClient().storage.from(BUCKET);
  const haystack = await collectReferences();
  const orphans: Orphan[] = [];

  for (const folder of MANAGED_FOLDERS) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await storage.list(folder, { limit: 1000, offset });
      if (error || !data || data.length === 0) break;

      for (const f of data) {
        if (!f.id) continue; // sub-folder placeholder
        const path = `${folder}/${f.name}`;
        const created = new Date(f.created_at || f.updated_at || 0).getTime();
        if (Date.now() - created < GRACE_MS) continue;
        if (haystack.includes(path)) continue;
        orphans.push({ path, size: Number((f.metadata as any)?.size) || 0, createdAt: new Date(created).toISOString() });
      }
      if (data.length < 1000) break;
    }
  }
  return orphans;
}

export async function purgeOrphans(): Promise<{ deleted: number; bytes: number }> {
  const orphans = await scanOrphans();
  if (orphans.length === 0) return { deleted: 0, bytes: 0 };

  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .remove(orphans.map((o) => o.path));
  if (error) throw new Error(error.message);

  return { deleted: orphans.length, bytes: orphans.reduce((n, o) => n + o.size, 0) };
}
