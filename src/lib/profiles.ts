/**
 * Shared profile helpers (performers, collaborators, affiliates).
 * Takes a Prisma client/transaction as a parameter and has no path-alias imports,
 * so it also works from standalone scripts.
 */

export type ProfileKind = 'PERFORMER' | 'COLLABORATOR' | 'AFFILIATE';

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'profile'
  );
}

/** A slug unique within the profile type (appends -2, -3, ... when taken). */
export async function uniqueSlug(db: any, type: ProfileKind, name: string, ignoreId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; ; n++) {
    const clash = await db.profile.findFirst({
      where: { type, slug, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${n}`;
  }
}

const clean = (v?: string | null) => (v && v.trim() !== '' ? v.trim() : null);

/**
 * Find the performer profile for a name (case-insensitive), or create one.
 * Missing handles on an existing profile are filled in from the edition entry.
 */
export async function findOrCreatePerformerProfile(
  db: any,
  name: string,
  instagram?: string | null,
  youtube?: string | null
): Promise<string> {
  const trimmed = name.trim();
  const existing = await db.profile.findFirst({
    where: { type: 'PERFORMER', name: { equals: trimmed, mode: 'insensitive' } },
  });

  if (existing) {
    const patch: Record<string, string> = {};
    if (!existing.instagram && clean(instagram)) patch.instagram = clean(instagram)!;
    if (!existing.youtube && clean(youtube)) patch.youtube = clean(youtube)!;
    if (Object.keys(patch).length) await db.profile.update({ where: { id: existing.id }, data: patch });
    return existing.id;
  }

  const created = await db.profile.create({
    data: {
      type: 'PERFORMER',
      name: trimmed,
      slug: await uniqueSlug(db, 'PERFORMER', trimmed),
      instagram: clean(instagram),
      youtube: clean(youtube),
    },
  });
  return created.id;
}
