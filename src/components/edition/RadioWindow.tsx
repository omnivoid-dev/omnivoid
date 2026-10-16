'use client';

import { useMemo, useState } from 'react';
import { mixcloudEmbedSrc } from '@/lib/mixcloud';
import { ListControls } from '@/components/ui/ListControls';
import { matchesSearch, nameOptions, sameName, sortList, toTime, type SortMode } from '@/lib/listView';

export interface PublicRadioShow {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string | null;
  author?: string | null;
  editionName?: string | null;
  performerName?: string | null;
  /** ISO date used for newest/oldest */
  date?: string | null;
}

interface RadioWindowProps {
  shows: PublicRadioShow[];
}

export function RadioWindow({ shows }: RadioWindowProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [edition, setEdition] = useState('');
  const [performer, setPerformer] = useState('');
  const [sort, setSort] = useState<SortMode>('date-desc');

  const active = shows.find((s) => s.id === activeId) || null;
  const activeIndex = active ? shows.findIndex((s) => s.id === active.id) : -1;

  const editionOptions = useMemo(() => nameOptions(shows.map((s) => s.editionName)).map((o) => ({ value: o.value, label: o.label })), [shows]);
  const performerOptions = useMemo(() => nameOptions(shows.map((s) => s.performerName)), [shows]);

  const filtered = useMemo(() => {
    const list = shows.filter(
      (s) =>
        (!edition || sameName(s.editionName, edition)) &&
        (!performer || sameName(s.performerName, performer)) &&
        matchesSearch(query, s.title, s.performerName, s.editionName)
    );
    return sortList(list, sort, (s) => s.title, (s) => toTime(s.date));
  }, [shows, query, edition, performer, sort]);

  if (shows.length === 0) return <p className="font-mono text-xs text-white/40">No radio shows published yet.</p>;

  const step = (delta: number) => setActiveId(shows[(activeIndex + delta + shows.length) % shows.length].id);

  return (
    <div className="font-mono text-white space-y-4">
      {/* Player: only once a show is chosen */}
      {active && (
      <div className="border border-[#99ccff]/30 rounded-lg p-3 bg-white/5 space-y-3">
        {(
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] text-[#99ccff] tracking-widest font-bold">
                  NOW PLAYING · {activeIndex + 1} / {shows.length}
                </span>
                <div className="text-xs font-bold truncate">{active.title}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => step(-1)} className="px-2.5 py-1 text-xs border border-white/20 rounded hover:border-[#99ccff] hover:text-[#99ccff]" aria-label="Previous show">
                  ◀
                </button>
                <button onClick={() => step(1)} className="px-2.5 py-1 text-xs border border-white/20 rounded hover:border-[#99ccff] hover:text-[#99ccff]" aria-label="Next show">
                  ▶
                </button>
              </div>
            </div>
            <iframe
              key={active.id}
              title={active.title}
              width="100%"
              height="120"
              src={mixcloudEmbedSrc(active.url, true)}
              allow="encrypted-media; fullscreen; autoplay; idle-detection; speaker-selection; web-share;"
              style={{ border: 'none' }}
            />
          </>
        )}
      </div>
      )}

      <ListControls
        search={query}
        onSearch={setQuery}
        editions={editionOptions}
        edition={edition}
        onEdition={setEdition}
        performers={performerOptions}
        performer={performer}
        onPerformer={setPerformer}
        sort={sort}
        onSort={setSort}
        shown={filtered.length}
        total={shows.length}
      />

      {/* Show list */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-xs text-white/40">No shows match.</p>}
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`w-full flex items-center gap-3 p-2.5 border rounded text-left transition-all group ${
              s.id === activeId ? 'bg-[#99ccff]/10 border-[#99ccff]/50' : 'bg-white/5 border-white/10 hover:border-[#99ccff]/40 hover:bg-[#99ccff]/5'
            }`}
          >
            {s.thumbnailUrl ? (
              <img src={s.thumbnailUrl} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
            ) : (
              <span className="w-12 h-12 rounded bg-black/40 flex items-center justify-center text-lg shrink-0">📻</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold truncate group-hover:text-[#99ccff]">{s.title}</span>
              <span className="block text-[10px] text-white/40 truncate">{[s.performerName, s.editionName].filter(Boolean).join(' · ') || s.author || 'OMNIVOID RADIO'}</span>
            </span>
            <span className="text-[10px] text-[#99ccff] font-bold shrink-0">{s.id === activeId ? '♪ PLAYING' : 'PLAY ▶'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
