'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';

interface Transmission {
  id: string;
  title: string;
  originalTitle?: string | null;
  url: string;
  kind: 'SET' | 'WORKSHOP' | 'LABS' | 'OTHER';
  editionId: string;
  performerId?: string | null;
  sortOrder: number;
  isActive: boolean;
  thumbnailUrl?: string | null;
  edition?: { id: string; name: string };
  performer?: { id: string; name: string } | null;
}

interface Edition {
  id: string;
  name: string;
  performers: { id: string; name: string }[];
}

const inputCls = 'w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]/50';
const labelCls = 'block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5';

export default function TransmissionsPage() {
  const [items, setItems] = useState<Transmission[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Transmission | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editionFilter, setEditionFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, eRes] = await Promise.all([fetch('/api/admin/transmissions'), fetch('/api/admin/editions')]);
      const [t, e] = await Promise.all([tRes.json(), eRes.json()]);
      if (t.success) setItems(t.data);
      if (e.success) setEditions(e.data);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!editionFilter || i.editionId === editionFilter) &&
        (!q || i.title.toLowerCase().includes(q) || i.originalTitle?.toLowerCase().includes(q) || i.performer?.name.toLowerCase().includes(q))
    );
  }, [items, editionFilter, search]);

  const handleDelete = async (t: Transmission) => {
    if (!confirm(`Delete "${t.title}"?`)) return;
    const res = await fetch(`/api/admin/transmissions/${t.id}`, { method: 'DELETE' });
    if ((await res.json()).success) fetchData();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">YouTube Transmissions</h1>
          <p className="text-sm text-white/40 font-mono">
            The display name is what visitors see. Shorten long YouTube titles without touching the video.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          📡 + ADD VIDEO
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or performer..." className={`${inputCls} max-w-xs`} />
        <select value={editionFilter} onChange={(e) => setEditionFilter(e.target.value)} className={`${inputCls} max-w-[200px]`}>
          <option value="">All editions</option>
          {editions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No transmissions found."
        columns={[
          {
            header: 'Display name',
            accessor: (t) => (
              <div className="max-w-md">
                <div className="text-sm text-white truncate">{t.title}</div>
                {t.originalTitle && t.originalTitle !== t.title && (
                  <div className="text-[10px] text-white/30 truncate">YouTube: {t.originalTitle}</div>
                )}
              </div>
            ),
          },
          { header: 'Edition', accessor: (t) => <span className="text-xs text-white/60">{t.edition?.name}</span> },
          { header: 'Performer', accessor: (t) => <span className="text-xs text-white/60">{t.performer?.name || '—'}</span> },
          { header: 'Kind', accessor: (t) => <span className="text-[10px] text-[#99ccff] font-bold">{t.kind}</span> },
          {
            header: 'Status',
            accessor: (t) => (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                {t.isActive ? 'ACTIVE' : 'HIDDEN'}
              </span>
            ),
          },
        ]}
        onEdit={(t) => {
          setEditing(t);
          setShowModal(true);
        }}
        onDelete={handleDelete}
      />

      {showModal && (
        <TransmissionModal
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

function TransmissionModal({
  initialData,
  editions,
  onClose,
  onSuccess,
}: {
  initialData: Transmission | null;
  editions: Edition[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!initialData;
  const [url, setUrl] = useState(initialData?.url || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [originalTitle, setOriginalTitle] = useState(initialData?.originalTitle || '');
  const [editionId, setEditionId] = useState(initialData?.editionId || editions[0]?.id || '');
  const [performerId, setPerformerId] = useState(initialData?.performerId || '');
  const [kind, setKind] = useState<Transmission['kind']>(initialData?.kind || 'SET');
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder || 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performers = editions.find((e) => e.id === editionId)?.performers || [];

  const fetchTitle = async () => {
    setIsFetching(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/youtube-meta?url=${encodeURIComponent(url)}`);
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setOriginalTitle(d.data.title);
      if (!title.trim()) setTitle(d.data.title);
    } catch (err: any) {
      setError(err.message || 'Could not fetch title');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/admin/transmissions/${initialData!.id}` : '/api/admin/transmissions', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, originalTitle, editionId, performerId: performerId || null, kind, sortOrder, isActive }),
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
          <h3 className="text-lg font-bold text-[#99ccff]">📡 {isEdit ? 'EDIT' : 'ADD'} TRANSMISSION</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">[ERROR] {error}</div>}

          <div>
            <label className={labelCls}>YouTube URL *</label>
            <div className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://www.youtube.com/watch?v=..." className={inputCls} />
              <button
                type="button"
                onClick={fetchTitle}
                disabled={!url || isFetching}
                className="shrink-0 px-3 text-[10px] font-bold rounded-lg border border-[#99ccff]/30 text-[#99ccff] bg-[#99ccff]/10 hover:bg-[#99ccff]/20 disabled:opacity-40"
              >
                {isFetching ? '...' : 'FETCH TITLE'}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Display name * (shown on the site)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
            {originalTitle && (
              <div className="mt-1.5 flex items-start justify-between gap-3 text-[10px] text-white/30">
                <span className="truncate">YouTube title: {originalTitle}</span>
                {title !== originalTitle && (
                  <button type="button" onClick={() => setTitle(originalTitle)} className="shrink-0 text-[#99ccff] hover:underline">
                    use original
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Edition *</label>
              <select
                value={editionId}
                onChange={(e) => {
                  setEditionId(e.target.value);
                  setPerformerId('');
                }}
                required
                className={inputCls}
              >
                {editions.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Performer</label>
              <select value={performerId} onChange={(e) => setPerformerId(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {performers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Kind</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as Transmission['kind'])} className={inputCls}>
                <option value="SET">Live set</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="LABS">Labs</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <label className="flex items-end pb-2 gap-2 cursor-pointer text-[10px] font-bold text-white/60">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-[#99ccff]" />
              VISIBLE
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
