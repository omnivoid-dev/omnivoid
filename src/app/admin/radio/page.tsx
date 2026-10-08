'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';

interface RadioShow {
  id: string;
  title: string;
  originalTitle?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  author?: string | null;
  editionId?: string | null;
  performerId?: string | null;
  sortOrder: number;
  isActive: boolean;
  edition?: { id: string; name: string } | null;
  performer?: { id: string; name: string } | null;
}

interface Edition {
  id: string;
  name: string;
  performers: { id: string; name: string }[];
}

const inputCls = 'w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]/50';
const labelCls = 'block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5';

export default function RadioPage() {
  const [items, setItems] = useState<RadioShow[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<RadioShow | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rRes, eRes] = await Promise.all([fetch('/api/admin/radio'), fetch('/api/admin/editions')]);
      const [r, e] = await Promise.all([rRes.json(), eRes.json()]);
      if (r.success) setItems(r.data);
      if (e.success) setEditions(e.data);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) => !q || i.title.toLowerCase().includes(q) || i.originalTitle?.toLowerCase().includes(q) || i.performer?.name.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleDelete = async (s: RadioShow) => {
    if (!confirm(`Delete "${s.title}"?`)) return;
    const res = await fetch(`/api/admin/radio/${s.id}`, { method: 'DELETE' });
    if ((await res.json()).success) fetchData();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Radio (Mixcloud)</h1>
          <p className="text-sm text-white/40 font-mono">Shows for the RADIO window. Paste a Mixcloud URL and the cover art and title are fetched for you.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          📻 + ADD SHOW
        </button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shows..." className={`${inputCls} max-w-xs mb-4`} />

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No radio shows yet."
        columns={[
          {
            header: 'Show',
            accessor: (s) => (
              <div className="flex items-center gap-3 max-w-md">
                {s.thumbnailUrl ? (
                  <img src={s.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                ) : (
                  <span className="w-10 h-10 rounded bg-white/5 flex items-center justify-center shrink-0">📻</span>
                )}
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{s.title}</div>
                  {s.originalTitle && s.originalTitle !== s.title && <div className="text-[10px] text-white/30 truncate">Mixcloud: {s.originalTitle}</div>}
                </div>
              </div>
            ),
          },
          { header: 'Edition', accessor: (s) => <span className="text-xs text-white/60">{s.edition?.name || '—'}</span> },
          { header: 'Performer', accessor: (s) => <span className="text-xs text-white/60">{s.performer?.name || '—'}</span> },
          { header: 'Order', accessor: 'sortOrder' },
          {
            header: 'Status',
            accessor: (s) => (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                {s.isActive ? 'ACTIVE' : 'HIDDEN'}
              </span>
            ),
          },
        ]}
        onEdit={(s) => {
          setEditing(s);
          setShowModal(true);
        }}
        onDelete={handleDelete}
      />

      {showModal && (
        <RadioModal
          initialData={editing}
          editions={editions}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setEditing(null);
            fetchData();
          }}
        />
      )}
    </AdminLayout>
  );
}

function RadioModal({
  initialData,
  editions,
  onClose,
  onSuccess,
}: {
  initialData: RadioShow | null;
  editions: Edition[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!initialData;
  const [url, setUrl] = useState(initialData?.url || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [originalTitle, setOriginalTitle] = useState(initialData?.originalTitle || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl || '');
  const [author, setAuthor] = useState(initialData?.author || '');
  const [editionId, setEditionId] = useState(initialData?.editionId || '');
  const [performerId, setPerformerId] = useState(initialData?.performerId || '');
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder || 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performers = editions.find((e) => e.id === editionId)?.performers || [];

  const fetchMeta = async () => {
    setIsFetching(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mixcloud-meta?url=${encodeURIComponent(url)}`);
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setOriginalTitle(d.data.title);
      setThumbnailUrl(d.data.thumbnailUrl || '');
      setAuthor(d.data.author || '');
      if (!title.trim()) setTitle(d.data.title);
    } catch (err: any) {
      setError(err.message || 'Could not fetch show details');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/admin/radio/${initialData!.id}` : '/api/admin/radio', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title,
          originalTitle,
          thumbnailUrl,
          author,
          editionId: editionId || null,
          performerId: performerId || null,
          sortOrder,
          isActive,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Failed to save');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0a] border border-[#99ccff]/30 rounded-2xl w-full max-w-xl my-8 overflow-hidden shadow-2xl font-mono text-white"
      >
        <div className="px-8 py-5 border-b border-white/10 bg-[#99ccff]/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#99ccff]">📻 {isEdit ? 'EDIT' : 'ADD'} RADIO SHOW</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">[ERROR] {error}</div>}

          <div>
            <label className={labelCls}>Mixcloud URL *</label>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://www.mixcloud.com/omnivoidlabs/..." className={inputCls} />
              <button
                type="button"
                onClick={fetchMeta}
                disabled={!url || isFetching}
                className="shrink-0 px-3 text-[10px] font-bold rounded-lg border border-[#99ccff]/30 text-[#99ccff] bg-[#99ccff]/10 hover:bg-[#99ccff]/20 disabled:opacity-40"
              >
                {isFetching ? '...' : 'FETCH DETAILS'}
              </button>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 shrink-0 bg-[#111] border border-[#333] rounded overflow-hidden flex items-center justify-center text-white/20 text-2xl">
              {thumbnailUrl ? <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" /> : '📻'}
            </div>
            <div className="flex-1">
              <label className={labelCls}>Display name * (shown on the site)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
              {originalTitle && (
                <div className="mt-1.5 flex items-start justify-between gap-3 text-[10px] text-white/30">
                  <span className="truncate">Mixcloud title: {originalTitle}</span>
                  {title !== originalTitle && (
                    <button type="button" onClick={() => setTitle(originalTitle)} className="shrink-0 text-[#99ccff] hover:underline">
                      use original
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Cover image URL (auto-filled; override if needed)</label>
            <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Edition (optional)</label>
              <select
                value={editionId}
                onChange={(e) => {
                  setEditionId(e.target.value);
                  setPerformerId('');
                }}
                className={inputCls}
              >
                <option value="">— None —</option>
                {editions.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Performer (optional)</label>
              <select value={performerId} onChange={(e) => setPerformerId(e.target.value)} disabled={!editionId} className={`${inputCls} disabled:opacity-40`}>
                <option value="">— None —</option>
                {performers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Playlist order</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <label className="flex items-end pb-2 gap-2 cursor-pointer text-[10px] font-bold text-white/60">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-[#99ccff]" />
              VISIBLE ON SITE
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-white/40 hover:text-white">
              CANCEL
            </button>
            <button type="submit" disabled={isSaving} className="bg-[#99ccff] text-[#050505] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] disabled:opacity-50">
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
