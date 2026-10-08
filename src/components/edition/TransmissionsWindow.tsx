'use client';

import { useMemo, useState } from 'react';
import { PublicEdition, PublicTransmission } from './types';

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

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (!editionFilter || r.editionId === editionFilter) &&
      (!q || r.title.toLowerCase().includes(q) || r.performerName?.toLowerCase().includes(q))
  );

  // Group by edition, newest edition first (editions arrive latest-first)
  const groups = editions
    .map((e) => ({ edition: e, items: filtered.filter((r) => r.editionId === e.id) }))
    .filter((g) => g.items.length > 0);

  const editionsWithRows = editions.filter((e) => rows.some((r) => r.editionId === e.id));

  return (
    <div className="font-mono text-white space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search performer or title..."
          className="flex-1 bg-[#111] border border-[#333] rounded px-3 py-2 text-xs outline-none focus:border-[#99ccff]"
        />
        <select
          value={editionFilter}
          onChange={(e) => setEditionFilter(e.target.value)}
          className="bg-[#111] border border-[#333] rounded px-2 py-2 text-xs outline-none focus:border-[#99ccff]"
        >
          <option value="">All editions</option>
          {editionsWithRows.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

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
