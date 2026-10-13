'use client';

import { useEffect, useState } from 'react';
import { PublicEdition, PublicProfile } from './types';

interface LatestRitualWindowProps {
  /** The edition flagged "Latest Ritual" in the CMS, or null when none is. */
  edition: PublicEdition | null;
  profiles?: PublicProfile[];
  onOpenProfile?: (profileId: string) => void;
}

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null;
const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : null;

function Poster({ url, alt, fallback }: { url?: string | null; alt: string; fallback: string }) {
  return (
    <div className="w-full aspect-[3/4] bg-white/5 rounded border border-white/10 overflow-hidden flex items-center justify-center">
      {url ? <img src={url} alt={alt} className="w-full h-full object-cover" /> : <span className="text-[10px] text-white/30 tracking-widest">{fallback}</span>}
    </div>
  );
}

function TicketButton({ href, label, tone }: { href?: string | null; label: string; tone: 'live' | 'workshop' }) {
  if (!href) {
    return <div className="text-[10px] text-white/35 border border-dashed border-white/15 rounded px-4 py-2.5 text-center tracking-wider">TICKET LINK COMING SOON</div>;
  }
  const cls =
    tone === 'live'
      ? 'bg-[#99ccff] text-[#050505] border-[#99ccff] hover:bg-white hover:border-white'
      : 'bg-transparent text-emerald-400 border-emerald-400/60 hover:bg-emerald-400/10';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`block text-center text-xs font-bold tracking-wider px-4 py-2.5 rounded border transition-colors ${cls}`}
    >
      🎫 {label} ↗
    </a>
  );
}

/**
 * The upcoming edition at a glance: the main poster and the workshop poster, each with its own
 * ticket link. Everything comes from the edition flagged "Latest Ritual" in the CMS.
 */
export function LatestRitualWindow({ edition, profiles = [], onOpenProfile }: LatestRitualWindowProps) {
  const [tab, setTab] = useState<'live' | 'workshop'>('live');

  // A new latest ritual starts on the live tab
  useEffect(() => setTab('live'), [edition?.id]);

  if (!edition) {
    return (
      <div className="font-mono space-y-2">
        <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#99ccff]/30 pb-3">★ LATEST RITUAL</h3>
        <p className="text-xs text-white/40">The next ritual has not been announced yet. Check back soon.</p>
      </div>
    );
  }

  const showWorkshop = !!edition.hasWorkshop && tab === 'workshop';
  const where = [edition.venue, edition.city].filter(Boolean).join(', ');
  const lineup = edition.performers.filter((p) => !/visuals/i.test(profiles.find((x) => x.type === 'PERFORMER' && x.name.toLowerCase() === p.name.toLowerCase())?.role || ''));
  const visuals = edition.performers.filter((p) => !lineup.includes(p));

  const personLink = (name: string) => {
    const profile = profiles.find((x) => x.type === 'PERFORMER' && x.name.toLowerCase() === name.toLowerCase());
    return profile && onOpenProfile ? (
      <button onClick={() => onOpenProfile(profile.id)} className="text-left hover:text-[#99ccff] underline decoration-dotted underline-offset-4">
        {name}
      </button>
    ) : (
      <span>{name}</span>
    );
  };

  return (
    <div className="font-mono text-white space-y-4">
      <div className="p-4 bg-[#99ccff]/10 border border-[#99ccff]/30 rounded-lg">
        <span className="text-[10px] text-[#99ccff] tracking-widest font-bold">★ LATEST RITUAL // UPCOMING</span>
        <h3 className="text-lg font-bold">{edition.name}</h3>
        <p className="text-xs text-white/60">{[fmtDate(edition.eventDate), where].filter(Boolean).join(' · ') || 'DATE TO BE ANNOUNCED'}</p>
      </div>

      {edition.hasWorkshop && (
        <div className="flex border border-[#333] rounded overflow-hidden" role="tablist">
          {(
            [
              ['live', '🎵 LIVE'],
              ['workshop', '🔬 WORKSHOP'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 text-[10px] font-bold tracking-widest transition-colors ${
                tab === id ? 'bg-[#99ccff] text-[#050505]' : 'bg-[#1a1a1a] text-[#99ccff] hover:bg-[#99ccff]/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!showWorkshop ? (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,300px)_1fr] gap-5">
          <Poster url={edition.posterUrl} alt={`${edition.name} poster`} fallback="POSTER COMING SOON" />
          <div className="space-y-4 min-w-0">
            {edition.description && <p className="text-xs text-white/75 leading-relaxed whitespace-pre-wrap">{edition.description}</p>}

            {lineup.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-[#99ccff] font-bold tracking-widest block">🎭 LINEUP</span>
                <ul className="text-xs font-bold space-y-1">
                  {lineup.map((p) => (
                    <li key={p.id}>{personLink(p.name)}</li>
                  ))}
                </ul>
              </div>
            )}
            {visuals.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-[#99ccff] font-bold tracking-widest block">VISUALS</span>
                <ul className="text-xs space-y-1 text-white/80">
                  {visuals.map((p) => (
                    <li key={p.id}>{personLink(p.name)}</li>
                  ))}
                </ul>
              </div>
            )}
            {lineup.length === 0 && visuals.length === 0 && <p className="text-[11px] text-white/35">Lineup to be announced.</p>}

            <TicketButton href={edition.ticketUrl} label={edition.ticketLabel || 'GET TICKETS'} tone="live" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,300px)_1fr] gap-5">
          <Poster url={edition.workshopPosterUrl} alt="Workshop poster" fallback="WORKSHOP POSTER COMING SOON" />
          <div className="space-y-4 min-w-0">
            <div>
              <span className="text-[10px] text-emerald-400 font-bold tracking-widest block">🔬 WORKSHOP</span>
              {edition.workshopTitle && <h4 className="text-sm font-bold mt-1">{edition.workshopTitle}</h4>}
              {edition.workshopDateTime && <p className="text-[11px] text-white/55 mt-0.5">{fmtDateTime(edition.workshopDateTime)}</p>}
            </div>
            {edition.workshopDescription && <p className="text-xs text-white/75 leading-relaxed whitespace-pre-wrap">{edition.workshopDescription}</p>}
            <TicketButton href={edition.workshopTicketUrl} label="WORKSHOP TICKETS" tone="workshop" />
          </div>
        </div>
      )}
    </div>
  );
}
