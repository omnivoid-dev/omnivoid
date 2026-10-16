'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ListControls } from '@/components/ui/ListControls';
import { matchesSearch, nameOptions, sameName, sortList, toTime, type SortMode } from '@/lib/listView';

export interface AudioRow {
  id: string;
  title: string;
  editionId: string;
  createdAt?: string;
  metadata?: { duration?: number; artist?: string } | null;
  isActive: boolean;
  edition?: { name: string } | null;
  performer?: { name: string } | null;
}

interface EditionRow {
  id: string;
  name: string;
  eventDate?: string | null;
}

interface PlaylistEditorModalProps {
  initialData?: { id: string; name: string; description?: string | null; isActive: boolean; sortOrder: number; items: { resourceId: string }[] } | null;
  tracks: AudioRow[];
  editions: EditionRow[];
  onClose: () => void;
  onSuccess: () => void;
}

const inputCls = 'w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]/50';
const labelCls = 'block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5';

const fmt = (s?: number) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');

/**
 * Build a playlist by hand: pick tracks (filterable by edition or performer only), then order them.
 */
export default function PlaylistEditorModal({ initialData, tracks, editions, onClose, onSuccess }: PlaylistEditorModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder || 0);
  const [ids, setIds] = useState<string[]>(initialData?.items.map((i) => i.resourceId) || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Picker filters
  const [search, setSearch] = useState('');
  const [editionFilter, setEditionFilter] = useState('');
  const [performerFilter, setPerformerFilter] = useState('');
  const [sort, setSort] = useState<SortMode>('az');

  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const dateByEdition = useMemo(() => new Map(editions.map((e) => [e.id, toTime(e.eventDate)])), [editions]);
  const editionOptions = useMemo(
    () => sortList(editions, 'date-desc', (e) => e.name, (e) => toTime(e.eventDate)).map((e) => ({ value: e.id, label: e.name })),
    [editions]
  );
  const performerOptions = useMemo(() => nameOptions(tracks.map((t) => t.performer?.name || t.metadata?.artist)), [tracks]);

  const available = useMemo(() => {
    const inList = new Set(ids);
    const list = tracks.filter(
      (t) =>
        !inList.has(t.id) &&
        (!editionFilter || t.editionId === editionFilter) &&
        (!performerFilter || sameName(t.performer?.name || t.metadata?.artist, performerFilter)) &&
        matchesSearch(search, t.title, t.performer?.name, t.metadata?.artist)
    );
    return sortList(list, sort, (t) => t.title, (t) => dateByEdition.get(t.editionId) ?? toTime(t.createdAt));
  }, [tracks, ids, editionFilter, performerFilter, search, sort, dateByEdition]);

  const add = (id: string) => setIds((l) => [...l, id]);
  const addAll = () => setIds((l) => [...l, ...available.map((t) => t.id)]);
  const remove = (id: string) => setIds((l) => l.filter((x) => x !== id));
  const move = (i: number, d: -1 | 1) =>
    setIds((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const copy = [...l];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const totalSeconds = ids.reduce((sum, id) => sum + (byId.get(id)?.metadata?.duration || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Give the playlist a name.');
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(initialData ? `/api/admin/playlists/${initialData.id}` : '/api/admin/playlists', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, isActive, sortOrder, resourceIds: ids }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.details || data.error || 'Failed to save playlist');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save playlist');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0a] border border-[#99ccff]/30 rounded-2xl w-full max-w-5xl my-8 overflow-hidden shadow-2xl font-mono text-white"
      >
        <div className="px-8 py-5 border-b border-white/10 bg-[#99ccff]/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#99ccff]">🎧 {initialData ? 'EDIT PLAYLIST' : 'NEW PLAYLIST'}</h3>
            <p className="text-xs text-white/40">Pick tracks from the left, order them on the right.</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">[ERROR] {error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_90px_auto] gap-4 items-end">
            <div>
              <label className={labelCls}>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 47K at Edition 001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <label className="flex items-center gap-2 text-xs text-white/70 pb-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#99ccff]" />
              Visible on site
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Picker */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-[#99ccff] tracking-widest">ALL TRACKS</div>
              <ListControls
                search={search}
                onSearch={setSearch}
                editions={editionOptions}
                edition={editionFilter}
                onEdition={setEditionFilter}
                performers={performerOptions}
                performer={performerFilter}
                onPerformer={setPerformerFilter}
                sort={sort}
                onSort={setSort}
                shown={available.length}
                total={tracks.length - ids.length}
              />
              <div className="border border-white/10 rounded-lg bg-black/40 max-h-[48vh] overflow-y-auto divide-y divide-white/5">
                {available.length === 0 && <p className="p-4 text-xs text-white/30">{tracks.length === 0 ? 'No audio tracks uploaded yet.' : 'Nothing left to add with these filters.'}</p>}
                {available.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => add(t.id)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#99ccff]/10 group"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs truncate">{t.title}</span>
                      <span className="block text-[10px] text-white/30 truncate">
                        {[t.performer?.name || t.metadata?.artist, t.edition?.name, fmt(t.metadata?.duration)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="text-[#99ccff] text-sm shrink-0 opacity-50 group-hover:opacity-100">＋</span>
                  </button>
                ))}
              </div>
              {available.length > 1 && (
                <button type="button" onClick={addAll} className="text-[10px] font-bold px-3 py-1.5 rounded border border-white/15 text-white/60 hover:text-white">
                  ADD ALL {available.length} SHOWN
                </button>
              )}
            </div>

            {/* Playlist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#99ccff] tracking-widest">IN THIS PLAYLIST ({ids.length})</span>
                <span className="text-[10px] text-white/30">{totalSeconds ? `${Math.floor(totalSeconds / 60)} min` : ''}</span>
              </div>
              <div className="border border-white/10 rounded-lg bg-black/40 max-h-[56vh] overflow-y-auto divide-y divide-white/5">
                {ids.length === 0 && <p className="p-4 text-xs text-white/30">Empty. Click tracks on the left to add them.</p>}
                {ids.map((id, i) => {
                  const t = byId.get(id);
                  return (
                    <div key={id} className="flex items-center gap-2 px-3 py-2">
                      <span className="text-[10px] text-white/30 w-5 shrink-0">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs truncate">{t?.title || '(track removed)'}</span>
                        <span className="block text-[10px] text-white/30 truncate">
                          {[t?.performer?.name || t?.metadata?.artist, t?.edition?.name, fmt(t?.metadata?.duration)].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-white/40 hover:text-white disabled:opacity-20 px-1" aria-label="Move up">
                        ▲
                      </button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === ids.length - 1} className="text-white/40 hover:text-white disabled:opacity-20 px-1" aria-label="Move down">
                        ▼
                      </button>
                      <button type="button" onClick={() => remove(id)} className="text-red-400/70 hover:text-red-400 px-1" aria-label="Remove">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
              {ids.length > 0 && (
                <button type="button" onClick={() => setIds([])} className="text-[10px] text-white/40 hover:text-white underline">
                  clear playlist
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2 text-xs font-bold text-white/40 hover:text-white">
              CANCEL
            </button>
            <button type="submit" disabled={isSaving} className="bg-[#99ccff] text-[#080808] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] disabled:opacity-50">
              {isSaving ? 'SAVING...' : initialData ? 'SAVE PLAYLIST' : 'CREATE PLAYLIST'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
