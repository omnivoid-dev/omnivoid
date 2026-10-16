'use client';

import { useMemo, useState } from 'react';
import { ListControls } from '@/components/ui/ListControls';
import { matchesSearch, sortList, toTime, type SortMode } from '@/lib/listView';

/** Research, Conundrum, Contact and Gallery, as React (replacing the old HTML-string windows). */

interface ResearchDoc {
  id: string;
  title: string;
  excerpt?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
}

export function ResearchSection({ documents }: { documents: ResearchDoc[] }) {
  return (
    <div className="space-y-4 font-mono">
      <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#99ccff]/30 pb-3">📚 RESEARCH PAPERS</h3>
      {documents.length === 0 && <p className="text-white/40 text-xs">No research papers available yet.</p>}
      {documents.map((doc) => (
        <div key={doc.id} className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-[#99ccff]/50 transition-all flex gap-4">
          {doc.thumbnailUrl && <img src={doc.thumbnailUrl} alt="" className="w-20 h-28 object-cover rounded border border-white/10 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="text-[#99ccff] font-bold text-xs">{doc.title}</h4>
              <span className="text-[9px] px-2 py-0.5 rounded bg-white/10 text-white/60 font-bold shrink-0">PDF</span>
            </div>
            <p className="text-[10px] text-white/50 mb-3 whitespace-pre-wrap">{doc.excerpt || 'Research artifact from the OMNIVOID repository.'}</p>
            {doc.fileUrl && (
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] px-3 py-1 bg-[#99ccff] text-[#050505] font-bold rounded hover:bg-[#7ab8e6]">
                DOWNLOAD PDF ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConundrumSection({ text }: { text: string }) {
  return (
    <div className="font-mono text-xs leading-relaxed">
      <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#99ccff]/30 pb-3 mb-4">🧩 ABOUT OMNIVOID (CONUNDRUM)</h3>
      <div className="whitespace-pre-wrap text-white/90 bg-white/5 p-4 rounded-lg border border-white/10">{text}</div>
    </div>
  );
}

export function ContactSection({ info }: { info: { contactEmail: string; submissionsEmail: string } }) {
  return (
    <div className="font-mono space-y-6">
      <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#99ccff]/30 pb-3">📧 CONTACT & SUBMISSIONS</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-2 hover:border-[#99ccff]/40 transition-all">
          <span className="text-[10px] text-[#99ccff] font-bold tracking-widest block">GENERAL ENQUIRIES</span>
          <a href={`mailto:${info.contactEmail}`} className="text-sm font-bold text-white hover:text-[#99ccff] transition-colors break-all">
            {info.contactEmail}
          </a>
          <p className="text-[10px] text-white/40 pt-1">For general inquiries, collaborations, and media access.</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-2 hover:border-emerald-400/40 transition-all">
          <span className="text-[10px] text-emerald-400 font-bold tracking-widest block">TRACK & DEMO SUBMISSIONS</span>
          <a href={`mailto:${info.submissionsEmail}`} className="text-sm font-bold text-white hover:text-emerald-400 transition-colors break-all">
            {info.submissionsEmail}
          </a>
          <p className="text-[10px] text-white/40 pt-1">For audio submissions, stems, and mix proposals.</p>
        </div>
      </div>
    </div>
  );
}

export interface GalleryItem {
  id: string;
  title: string;
  url: string;
  editionId?: string | null;
  editionName?: string | null;
  /** Event date of the edition (ISO), used for newest/oldest */
  eventDate?: string | null;
  performerName?: string | null;
}

const EVENT_ONLY = '__event__';

export function GallerySection({ items, editions }: { items: GalleryItem[]; editions: { id: string; name: string }[] }) {
  const [edition, setEdition] = useState('');
  const [performer, setPerformer] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('date-desc');
  const [open, setOpen] = useState<GalleryItem | null>(null);

  const performers = useMemo(() => {
    const names = new Map<string, string>();
    for (const i of items) if (i.performerName) names.set(i.performerName.trim().toLowerCase(), i.performerName.trim());
    const named = [...names.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }));
    return items.some((i) => !i.performerName) ? [{ value: EVENT_ONLY, label: 'Event photos' }, ...named] : named;
  }, [items]);

  const editionOptions = useMemo(() => {
    const used = new Set(items.map((i) => i.editionId).filter(Boolean));
    return editions.filter((e) => used.has(e.id)).map((e) => ({ value: e.id, label: e.name }));
  }, [items, editions]);

  const shown = useMemo(() => {
    const filtered = items.filter(
      (i) =>
        (!edition || i.editionId === edition) &&
        (!performer || (performer === EVENT_ONLY ? !i.performerName : i.performerName?.trim().toLowerCase() === performer)) &&
        matchesSearch(search, i.title, i.editionName, i.performerName)
    );
    return sortList(filtered, sort, (i) => i.title, (i) => toTime(i.eventDate));
  }, [items, edition, performer, search, sort]);

  return (
    <div className="font-mono space-y-4">
      <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#99ccff]/30 pb-3">🖼️ GALLERY</h3>
      <ListControls
        search={search}
        onSearch={setSearch}
        editions={editionOptions}
        edition={edition}
        onEdition={setEdition}
        performers={performers}
        performer={performer}
        onPerformer={setPerformer}
        sort={sort}
        onSort={setSort}
        shown={shown.length}
        total={items.length}
      />
      {shown.length === 0 && <p className="text-white/40 text-xs">{items.length === 0 ? 'No images yet.' : 'No images match.'}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {shown.map((img) => (
          <button key={img.id} type="button" onClick={() => setOpen(img)} className="group block text-left">
            <div className="aspect-square bg-white/5 border border-white/10 rounded overflow-hidden group-hover:border-[#99ccff]/50 transition-all">
              <img src={img.url} alt={img.title} loading="lazy" className="w-full h-full object-cover" />
            </div>
            <span className="block mt-1 text-[9px] text-white/40 truncate group-hover:text-[#99ccff]">{img.title}</span>
            {(img.editionName || img.performerName) && (
              <span className="block text-[8px] text-white/25 truncate">{[img.editionName, img.performerName].filter(Boolean).join(' · ')}</span>
            )}
          </button>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center p-4 cursor-zoom-out" onClick={() => setOpen(null)}>
          <img src={open.url} alt={open.title} className="max-w-full max-h-[85vh] object-contain" />
          <p className="mt-3 text-xs text-white/70">
            {open.title}
            {(open.editionName || open.performerName) && <span className="text-white/40"> · {[open.editionName, open.performerName].filter(Boolean).join(' · ')}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
