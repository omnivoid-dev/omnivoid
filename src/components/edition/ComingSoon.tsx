'use client';

import type { PublicEdition } from './types';

/** Shown in place of empty poster / lineup / ticket slots for an upcoming edition with nothing announced yet. */
export function ComingSoon({ edition }: { edition: PublicEdition }) {
  const date = edition.eventDate
    ? new Date(edition.eventDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
    : null;
  const where = [edition.venue, edition.city].filter(Boolean).join(', ').toUpperCase();

  return (
    <div className="font-mono text-center py-14 px-4 border border-dashed border-[#99ccff]/30 rounded-lg bg-[#99ccff]/5">
      <div className="text-2xl sm:text-3xl font-bold tracking-[0.3em] text-[#99ccff] animate-pulse">COMING SOON</div>
      {(date || where) && <div className="mt-4 text-xs text-white/60 tracking-widest">{[date, where].filter(Boolean).join(' · ')}</div>}
      <div className="mt-3 text-[10px] text-white/30 tracking-widest">POSTER, LINEUP AND TICKETS TO BE ANNOUNCED</div>
    </div>
  );
}
