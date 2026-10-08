'use client';

import { useState } from 'react';
import { PublicEdition, PublicProfile, instagramUrl, youtubeChannelUrl } from './types';

interface RitualsWindowProps {
  editions: PublicEdition[];
  selectedEditionId: string | null;
  onSelectEdition: (id: string) => void;
  onPlayVideo: (url: string) => void;
  /** Shared performer profiles; lineup names with a profile open it in the window. */
  profiles?: PublicProfile[];
  onOpenProfile?: (profileId: string) => void;
}

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : null;

function Poster({ url, alt, fallback }: { url?: string | null; alt: string; fallback: string }) {
  return (
    <div className="w-full aspect-[3/4] bg-white/5 rounded border border-white/10 flex items-center justify-center overflow-hidden">
      {url ? (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[10px] text-white/30 tracking-widest">{fallback}</span>
      )}
    </div>
  );
}

export function RitualsWindow({ editions, selectedEditionId, onSelectEdition, onPlayVideo, profiles = [], onOpenProfile }: RitualsWindowProps) {
  const [listOpen, setListOpen] = useState(false);

  const edition =
    editions.find((e) => e.id === selectedEditionId) || editions.find((e) => e.isLatestRitual) || editions[0];

  if (!edition) return <p className="font-mono text-xs text-white/40">No editions published yet.</p>;

  const performerName = (id?: string | null) => edition.performers.find((p) => p.id === id)?.name;
  const where = [edition.venue, edition.city].filter(Boolean).join(', ');

  return (
    <div className="font-mono space-y-5 text-white">
      {/* Collapsible edition list */}
      <div className="border border-[#99ccff]/30 rounded">
        <button
          onClick={() => setListOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] tracking-widest text-[#99ccff] hover:bg-[#99ccff]/10"
        >
          <span>EDITIONS // {edition.name.toUpperCase()}</span>
          <span>{listOpen ? '▲' : '▼'}</span>
        </button>
        {listOpen && (
          <div className="border-t border-[#99ccff]/20 max-h-48 overflow-y-auto">
            {editions.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  onSelectEdition(e.id);
                  setListOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs text-left hover:bg-white/5 ${
                  e.id === edition.id ? 'text-[#99ccff] bg-[#99ccff]/10' : 'text-white/70'
                }`}
              >
                <span>{e.name}</span>
                <span className="flex items-center gap-3 text-[10px] text-white/40">
                  {e.isLatestRitual && <span className="text-[#99ccff] font-bold">★ LATEST</span>}
                  {fmtDate(e.eventDate)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="p-4 bg-[#99ccff]/10 border border-[#99ccff]/30 rounded-lg flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] text-[#99ccff] tracking-widest font-bold">
            {edition.isLatestRitual ? '★ LATEST RITUAL // UPCOMING' : 'ARCHIVED EDITION'}
          </span>
          <h3 className="text-lg font-bold">{edition.name}</h3>
          <p className="text-xs text-white/50">{[fmtDate(edition.eventDate), where].filter(Boolean).join(' · ') || 'DATE TBA'}</p>
        </div>
        {edition.isLatestRitual && edition.ticketUrl && (
          <a
            href={edition.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs px-4 py-2 bg-[#99ccff] text-[#050505] font-bold rounded hover:bg-white transition-colors"
          >
            {edition.ticketLabel || 'GET TICKETS'} ↗
          </a>
        )}
      </div>

      {edition.description && <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{edition.description}</p>}

      {/* Posters */}
      <div className={`grid gap-4 ${edition.hasWorkshop ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
        <div className="space-y-2">
          <Poster url={edition.posterUrl} alt={`${edition.name} poster`} fallback="POSTER" />
          <span className="block text-center text-[10px] text-[#99ccff] font-bold tracking-wider">MAIN EVENT</span>
        </div>
        {edition.hasWorkshop && (
          <div className="space-y-2">
            <Poster url={edition.workshopPosterUrl} alt="Workshop poster" fallback="WORKSHOP" />
            <span className="block text-center text-[10px] text-emerald-400 font-bold tracking-wider">WORKSHOP</span>
          </div>
        )}
      </div>

      {/* Workshop details */}
      {edition.hasWorkshop && (
        <div className="p-4 bg-white/5 border border-emerald-400/20 rounded-lg space-y-2">
          <span className="text-[10px] text-emerald-400 font-bold tracking-widest">🛠 WORKSHOP</span>
          {edition.workshopTitle && <h4 className="text-sm font-bold">{edition.workshopTitle}</h4>}
          {edition.workshopDateTime && <p className="text-[11px] text-white/50">{fmtDateTime(edition.workshopDateTime)}</p>}
          {edition.workshopDescription && (
            <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{edition.workshopDescription}</p>
          )}
          {edition.isLatestRitual && edition.workshopTicketUrl && (
            <a
              href={edition.workshopTicketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[11px] px-3 py-1.5 border border-emerald-400/50 text-emerald-400 font-bold rounded hover:bg-emerald-400/10"
            >
              WORKSHOP TICKETS ↗
            </a>
          )}
        </div>
      )}

      {/* Lineup */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-3">
        <span className="text-[10px] text-[#99ccff] font-bold tracking-widest block border-b border-white/10 pb-2">🎭 LINEUP</span>
        {edition.performers.length === 0 ? (
          <p className="text-xs text-white/40">Lineup to be announced.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {edition.performers.map((p) => (
              <div key={p.id} className="p-3 bg-black/50 border border-white/10 rounded space-y-1">
                {(() => {
                  const profile = profiles.find((x) => x.type === 'PERFORMER' && x.name.toLowerCase() === p.name.toLowerCase());
                  return profile && onOpenProfile ? (
                    <button onClick={() => onOpenProfile(profile.id)} className="text-xs font-bold text-left hover:text-[#99ccff] underline decoration-dotted underline-offset-4">
                      {p.name}
                    </button>
                  ) : (
                    <span className="text-xs font-bold">{p.name}</span>
                  );
                })()}
                <div className="flex items-center gap-3 text-[10px]">
                  {p.instagram && (
                    <a href={instagramUrl(p.instagram)} target="_blank" rel="noopener noreferrer" className="text-[#99ccff] hover:underline">
                      📷 {p.instagram}
                    </a>
                  )}
                  {p.youtube && (
                    <a href={youtubeChannelUrl(p.youtube)} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">
                      📺 YouTube
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Videos */}
      {edition.transmissions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#99ccff] tracking-widest">📡 TRANSMISSIONS ({edition.transmissions.length})</h4>
          {edition.transmissions.map((t) => (
            <button
              key={t.id}
              onClick={() => onPlayVideo(t.url)}
              className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded hover:border-[#99ccff]/50 text-left transition-all group"
            >
              <span className="text-xs font-bold group-hover:text-[#99ccff]">
                {t.title}
                {performerName(t.performerId) && <span className="text-white/40 font-normal"> — {performerName(t.performerId)}</span>}
              </span>
              <span className="text-[10px] px-2 py-1 bg-[#99ccff]/10 text-[#99ccff] border border-[#99ccff]/20 rounded">WATCH ▶</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
