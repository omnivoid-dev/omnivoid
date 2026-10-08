'use client';

import { useMemo, useState } from 'react';
import { mixcloudEmbedSrc } from '@/lib/mixcloud';

export interface PublicRadioShow {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string | null;
  author?: string | null;
  editionName?: string | null;
  performerName?: string | null;
}

interface RadioWindowProps {
  shows: PublicRadioShow[];
}

export function RadioWindow({ shows }: RadioWindowProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const active = shows.find((s) => s.id === activeId) || null;
  const activeIndex = active ? shows.findIndex((s) => s.id === active.id) : -1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shows.filter((s) => !q || s.title.toLowerCase().includes(q) || s.performerName?.toLowerCase().includes(q) || s.editionName?.toLowerCase().includes(q));
  }, [shows, query]);

  if (shows.length === 0) return <p className="font-mono text-xs text-white/40">No radio shows published yet.</p>;

  const step = (delta: number) => setActiveId(shows[(activeIndex + delta + shows.length) % shows.length].id);

  return (
    <div className="font-mono text-white space-y-4">
      {/* Player */}
      <div className="border border-[#99ccff]/30 rounded-lg p-3 bg-white/5 space-y-3">
        {active ? (
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
        ) : (
          <p className="text-[11px] text-white/50 text-center py-3">Select a show to start listening.</p>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search shows or performers..."
        className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs outline-none focus:border-[#99ccff]"
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
