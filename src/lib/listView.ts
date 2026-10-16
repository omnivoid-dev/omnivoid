/** Shared sorting helpers for filtered lists (admin tables and the public Gallery). */

export type SortMode = 'date-desc' | 'date-asc' | 'az' | 'za';

export const SORT_LABELS: Record<SortMode, string> = {
  'date-desc': 'Newest first',
  'date-asc': 'Oldest first',
  az: 'A → Z',
  za: 'Z → A',
};

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Date value for sorting: ms since epoch, or null when there is no date (those always sort last). */
export function toTime(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export function sortList<T>(items: T[], mode: SortMode, getName: (item: T) => string, getDate: (item: T) => number | null): T[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (mode === 'az') return collator.compare(getName(a), getName(b));
    if (mode === 'za') return collator.compare(getName(b), getName(a));
    const da = getDate(a);
    const db = getDate(b);
    if (da === null && db === null) return collator.compare(getName(a), getName(b));
    if (da === null) return 1;
    if (db === null) return -1;
    return mode === 'date-desc' ? db - da : da - db;
  });
  return copy;
}

export function matchesSearch(q: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

/** Distinct names -> select options (value is lowercased so "DJ Foo" and "dj foo" are one performer). */
export function nameOptions(names: (string | null | undefined)[]): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const n of names) {
    const label = n?.trim();
    if (label) seen.set(label.toLowerCase(), seen.get(label.toLowerCase()) ?? label);
  }
  return [...seen.entries()].sort((a, b) => collator.compare(a[1], b[1])).map(([value, label]) => ({ value, label }));
}

export const sameName = (a: string | null | undefined, key: string) => (a ?? '').trim().toLowerCase() === key;
