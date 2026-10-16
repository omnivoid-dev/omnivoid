'use client';

import { useMemo, useState } from 'react';
import { PublicEdition, PublicTransmission } from './types';
import { ListControls } from '@/components/ui/ListControls';
import { matchesSearch, nameOptions, sameName, sortList, toTime, type SortMode } from '@/lib/listView';

interface TransmissionsWindowProps {
  editions: PublicEdition[];
  /** Restrict to one kind, e.g. LABS for the Labs window. Omit for all. */
  kinds?: PublicTransmission['kind'][];
  title?: string;
  onPlayVideo: (url: string) => void;
}

interface Row extends PublicTransmission {
  editionId: string;
  editionName: string;
  eventDate?: string | null;
  performerName?: string;
}

export function TransmissionsWindow({ editions, kinds, title = 'TRANSMISSIONS', onPlayVideo }: TransmissionsWindowProps) {
  const [editionFilter, setEditionFilter] = useState('');
  const [query, setQuery] = useState('');
  const [performerFilter, setPerformerFilter] = useState('');
  const [sort, setSort] = useState<SortMode>('date-desc');

  const rows: Row[] = useMemo(
    () =>
      editions.flatMap((e) =>
        e.transmissions
          .filter((t) => !kinds || kinds.includes(t.kind))
          .map((t) => ({
            ...t,
            editionId: e.id,
            editionName: e.name,
            eventDate: e.eventDate,
            performerName: e.performers.find((p) => p.id === t.performerId)?.name,
          }))
      ),
    [editions, kinds]
  );

  const filtered = rows.filter(
    (r) =>
      (!editionFilter || r.editionId === editionFilter) &&
      (!performerFilter || sameName(r.performerName, performerFilter)) &&
      matchesSearch(query, r.title, r.performerName)
  );

  // Groups are editions, ordered by event date (or A-Z); within a group A-Z sorts by title
  const editionsWithRows = editions.filter((e) => rows.some((r) => r.editionId === e.id));
  const groups = sortList(editionsWithRows, sort, (e) => e.name, (e) => toTime(e.eventDate))
    .map((e) => {
      const items = filtered.filter((r) => r.editionId === e.id);
      return { edition: e, items: sort === 'az' || sort === 'za' ? sortList(items, sort, (r) => r.title, () => null) : items };
    })
    .filter((g) => g.items.length > 0);

  const performerOptions = nameOptions(rows.map((r) => r.performerName));

  return (
    <div className="font-mono text-white space-y-4">
      <ListControls
        search={query}
        onSearch={setQuery}
        editions={editionsWithRows.map((e) => ({ value: e.id, label: e.name }))}
        edition={editionFilter}
        onEdition={setEditionFilter}
        performers={performerOptions}
        performer={performerFilter}
        onPerformer={setPerformerFilter}
        sort={sort}
        onSort={setSort}
        shown={filtered.length}
        total={rows.length}
      />

      {groups.length === 0 && <p className="text-xs text-white/40">No {title.toLowerCase()} match.</p>}

      {groups.map(({ edition, items }) => (
        <div key={edition.id} className="space-y-2">
          <h4 className="text-[10px] text-[#99ccff] font-bold tracking-widest border-b border-white/10 pb-1">
            {edition.name.toUpperCase()} <span className="text-white/30">({items.length})</span>
          </h4>
          {items.map((t) => (
            <button
              key={t.id}
              onClick={() => onPlayVideo(t.url)}
              className="w-full flex items-center justify-between gap-3 p-3 bg-white/5 border border-white/10 rounded hover:bg-[#99ccff]/10 hover:border-[#99ccff]/40 text-left transition-all group"
            >
              <span className="flex items-center gap-3 min-w-0">
                {t.thumbnailUrl ? (
                  <img src={t.thumbnailUrl} alt="" className="w-16 h-9 object-cover rounded shrink-0" />
                ) : (
                  <span className="text-lg shrink-0">📺</span>
                )}
                <span className="min-w-0">
                  <span className="block text-xs font-bold truncate">{t.title}</span>
                  {t.performerName && <span className="block text-[10px] text-white/40">{t.performerName}</span>}
                </span>
              </span>
              <span className="text-[10px] text-[#99ccff] font-bold shrink-0 group-hover:text-white">PLAY ▶</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
