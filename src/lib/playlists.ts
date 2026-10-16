/** Shared bits for the playlists API routes. */

export const playlistInclude = {
  items: {
    orderBy: { sortOrder: 'asc' as const },
    select: { resourceId: true, sortOrder: true },
  },
};

/** Keep order, drop duplicates and non-strings. */
export function cleanIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string'))];
}
