'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { uploadImage } from '@/lib/uploadClient';
import { ListControls } from '@/components/ui/ListControls';
import { matchesSearch, sortList, toTime, type SortMode } from '@/lib/listView';

type Tag = 'event' | 'performer';

interface GalleryRow {
  id: string;
  title: string;
  url: string | null;
  performerId: string | null;
  metadata?: { tag?: Tag } | null;
  createdAt: string;
  sortOrder: number;
}

interface Props {
  editionId: string;
  performers: { id: string; name: string }[];
  /** Jump to the edition's Performers tab */
  onGoToPerformers: () => void;
}

const EVENT_ONLY = '__event__';
const fieldCls = 'bg-[#111] border border-[#333] rounded px-2 py-1 text-[11px] text-white outline-none focus:border-[#99ccff] w-full';

const tagOf = (r: GalleryRow): Tag => r.metadata?.tag ?? (r.performerId ? 'performer' : 'event');

/** Event | Performer switch */
function TagToggle({ value, onChange, disabled }: { value: Tag; onChange: (t: Tag) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex rounded border border-[#333] overflow-hidden text-[10px] font-bold">
      {(['event', 'performer'] as const).map((t) => (
        <button
          key={t}
          type="button"
          disabled={disabled}
          onClick={() => onChange(t)}
          className={`px-3 py-1 uppercase tracking-widest ${value === t ? 'bg-[#99ccff]/20 text-[#99ccff]' : 'text-white/40 hover:text-white'}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function NoPerformersHint({ onGo }: { onGo: () => void }) {
  return (
    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-300 flex flex-wrap items-center gap-3">
      <span>No performers in this edition yet. Add performers first and save the edition, then tag photos with them.</span>
      <button type="button" onClick={onGo} className="text-[10px] font-bold px-3 py-1 rounded border border-amber-400/40 hover:bg-amber-400/10">
        GO TO PERFORMERS →
      </button>
    </div>
  );
}

/**
 * Photos for one edition. Each photo is either an EVENT photo (crowd, venue, general)
 * or a PERFORMER photo. Changes save immediately (each photo is its own record),
 * independent of the edition's Save button. Uploads are converted to WebP on the server.
 */
export default function EditionGalleryTab({ editionId, performers, onGoToPerformers }: Props) {
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortMode>('date-desc');
  // How the next uploads are tagged
  const [uploadTag, setUploadTag] = useState<Tag>('event');
  const [uploadPerformer, setUploadPerformer] = useState('');
  const hasPerformers = performers.length > 0;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/resources?editionId=${editionId}&type=GALLERY`);
      const data = await res.json();
      if (data.success) setRows(data.data);
      else setError(data.error || 'Could not load photos');
    } catch {
      setError('Could not load photos');
    } finally {
      setLoading(false);
    }
  }, [editionId]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadBlocked = uploadTag === 'performer' && (!hasPerformers || !uploadPerformer);

  const upload = async (files: FileList) => {
    setError(null);
    const list = Array.from(files);
    for (const [i, file] of list.entries()) {
      setBusy(`Uploading ${i + 1} of ${list.length}: ${file.name}`);
      try {
        const img = await uploadImage(file, 'gallery');
        const res = await fetch('/api/admin/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editionId,
            type: 'GALLERY',
            title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Photo',
            url: img.publicUrl,
            thumbnailUrl: img.publicUrl,
            performerId: uploadTag === 'performer' ? uploadPerformer : null,
            metadata: { tag: uploadTag },
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Could not save photo');
        setRows((r) => [...r, data.data]);
      } catch (e: any) {
        setError(`${file.name}: ${e?.message || 'upload failed'}`);
      }
    }
    setBusy(null);
  };

  const patch = async (id: string, data: Partial<GalleryRow>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...data } : x)));
    const res = await fetch(`/api/admin/resources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!json.success) {
      setError(json.error || 'Could not save change');
      load();
    }
  };

  const setTag = (row: GalleryRow, tag: Tag) =>
    patch(row.id, { metadata: { ...(row.metadata || {}), tag }, performerId: tag === 'event' ? null : row.performerId });

  const remove = async (row: GalleryRow) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const res = await fetch(`/api/admin/resources/${row.id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (json.success) setRows((r) => r.filter((x) => x.id !== row.id));
    else setError(json.error || 'Could not delete');
  };

  const shown = useMemo(() => {
    const filtered = rows.filter(
      (r) => (!filter || (filter === EVENT_ONLY ? tagOf(r) === 'event' : r.performerId === filter)) && matchesSearch(search, r.title)
    );
    return sortList(filtered, sort, (r) => r.title, (r) => toTime(r.createdAt));
  }, [rows, filter, search, sort]);

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-white/40 max-w-xl">
        Photos from this edition, converted to WebP and saved straight away. Tag each as an <b>event</b> photo (crowd, venue, general) or a <b>performer</b>{' '}
        photo.
      </p>

      <div className="p-3 bg-black/40 border border-white/10 rounded space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] text-white/50 uppercase tracking-widest">New photos are</span>
          <TagToggle value={uploadTag} onChange={setUploadTag} disabled={!!busy} />
          {uploadTag === 'performer' && hasPerformers && (
            <select value={uploadPerformer} onChange={(e) => setUploadPerformer(e.target.value)} className={`${fieldCls} !w-48`} aria-label="Performer for new photos">
              <option value="">Choose performer...</option>
              {performers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <label
            className={`ml-auto text-[10px] font-bold px-3 py-1.5 rounded border ${
              uploadBlocked || busy
                ? 'border-white/10 text-white/25 cursor-not-allowed'
                : 'border-[#99ccff]/30 text-[#99ccff] bg-[#99ccff]/10 hover:bg-[#99ccff]/20 cursor-pointer'
            }`}
          >
            {busy ? 'UPLOADING...' : '⬆ ADD PHOTOS'}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              disabled={!!busy || uploadBlocked}
              onChange={(e) => {
                if (e.target.files?.length) upload(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {uploadTag === 'performer' && !hasPerformers && <NoPerformersHint onGo={onGoToPerformers} />}
        {uploadTag === 'performer' && hasPerformers && !uploadPerformer && <p className="text-[10px] text-white/40">Choose which performer these photos show.</p>}
      </div>

      {busy && <div className="text-[10px] text-[#99ccff]">{busy}</div>}
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-[11px]">{error}</div>}

      <ListControls
        search={search}
        onSearch={setSearch}
        performers={[{ value: EVENT_ONLY, label: 'Event photos' }, ...performers.map((p) => ({ value: p.id, label: p.name }))]}
        performer={filter}
        onPerformer={setFilter}
        sort={sort}
        onSort={setSort}
        shown={shown.length}
        total={rows.length}
      />

      {loading ? (
        <p className="text-xs text-white/30">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-xs text-white/30">{rows.length === 0 ? 'No photos yet.' : 'No photos match.'}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shown.map((r) => {
            const tag = tagOf(r);
            return (
              <div key={r.id} className="bg-black/40 border border-white/10 rounded overflow-hidden">
                <div className="aspect-[4/3] bg-[#111]">
                  {r.url && <img src={r.url} alt={r.title} loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="p-2 space-y-2">
                  <input
                    className={fieldCls}
                    defaultValue={r.title}
                    onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== r.title && patch(r.id, { title: e.target.value.trim() })}
                    onKeyDown={(e) => {
                      // Enter must not submit the surrounding edition form
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    aria-label="Caption"
                  />
                  <TagToggle value={tag} onChange={(t) => setTag(r, t)} />
                  {tag === 'performer' &&
                    (hasPerformers ? (
                      <select
                        className={`${fieldCls} ${r.performerId ? '' : 'border-amber-400/50'}`}
                        value={r.performerId || ''}
                        onChange={(e) => patch(r.id, { performerId: e.target.value || null })}
                        aria-label="Performer"
                      >
                        <option value="">Choose performer...</option>
                        {performers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <NoPerformersHint onGo={onGoToPerformers} />
                    ))}
                  <button type="button" onClick={() => remove(r)} className="text-[10px] text-red-400/70 hover:text-red-400">
                    delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
