'use client';

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

export function GallerySection({ items }: { items: { id: string; title: string; path: string }[] }) {
  return (
    <div className="font-mono space-y-4">
      <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#99ccff]/30 pb-3">🖼️ GALLERY</h3>
      {items.length === 0 && <p className="text-white/40 text-xs">No images yet.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((img) => (
          <a key={img.id} href={img.path} target="_blank" rel="noopener noreferrer" className="group block">
            <div className="aspect-square bg-white/5 border border-white/10 rounded overflow-hidden group-hover:border-[#99ccff]/50 transition-all">
              <img src={img.path} alt={img.title} loading="lazy" className="w-full h-full object-cover" />
            </div>
            <span className="block mt-1 text-[9px] text-white/40 truncate group-hover:text-[#99ccff]">{img.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
