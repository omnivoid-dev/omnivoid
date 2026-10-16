'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { uploadImage } from '@/lib/uploadClient';
import { ListControls } from '@/components/ui/ListControls';
import { matchesSearch, sortList, toTime, type SortMode } from '@/lib/listView';

interface GalleryRow {
  id: string;
  title: string;
  url: string | null;
  performerId: string | null;
  createdAt: string;
  sortOrder: number;
}

interface Props {
  editionId: string;
  performers: { id: string; name: string }[];
}

const fieldCls = 'bg-[#111] border border-[#333] rounded px-2 py-1 text-[11px] text-white outline-none focus:border-[#99ccff] w-full';

/**
 * Photos for one edition. Changes save immediately (each photo is its own record),
 * independent of the edition's Save button. Uploads are converted to WebP on the server.
 */
export default function EditionGalleryTab({ editionId, performers }: Props) {
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [performer, setPerformer] = useState('');
  const [sort, setSort] = useState<SortMode>('date-desc');

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
            performerId: performer || null,
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

  const remove = async (row: GalleryRow) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const res = await fetch(`/api/admin/resources/${row.id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (json.success) setRows((r) => r.filter((x) => x.id !== row.id));
    else setError(json.error || 'Could not delete');
  };

  const shown = useMemo(() => {
    const filtered = rows.filter((r) => (!performer || r.performerId === performer) && matchesSearch(search, r.title));
    return sortList(filtered, sort, (r) => r.title, (r) => toTime(r.createdAt));
  }, [rows, performer, search, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] text-white/40 max-w-md">
          Photos from this edition. They are converted to WebP, saved straight away, and appear in the Gallery on the site. Tag a photo with a performer to
          filter by them.
        </p>
        <label className="text-[10px] font-bold px-3 py-1.5 rounded border border-[#99ccff]/30 text-[#99ccff] bg-[#99ccff]/10 hover:bg-[#99ccff]/20 cursor-pointer">
          {busy ? 'UPLOADING...' : '⬆ ADD PHOTOS'}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            disabled={!!busy}
            onChange={(e) => {
              if (e.target.files?.length) upload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {busy && <div className="text-[10px] text-[#99ccff]">{busy}</div>}
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-[11px]">{error}</div>}

      <ListControls
        search={search}
        onSearch={setSearch}
        performers={performers.map((p) => ({ value: p.id, label: p.name }))}
        performer={performer}
        onPerformer={setPerformer}
        sort={sort}
        onSort={setSort}
        shown={shown.length}
        total={rows.length}
      />
      {performer && <p className="text-[10px] text-white/30">New uploads are tagged with the performer selected in the filter.</p>}

      {loading ? (
        <p className="text-xs text-white/30">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-xs text-white/30">{rows.length === 0 ? 'No photos yet.' : 'No photos match.'}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shown.map((r) => (
            <div key={r.id} className="bg-black/40 border border-white/10 rounded overflow-hidden">
              <div className="aspect-[4/3] bg-[#111]">
                {r.url && <img src={r.url} alt={r.title} loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <div className="p-2 space-y-1.5">
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
                <select
                  className={fieldCls}
                  value={r.performerId || ''}
                  onChange={(e) => patch(r.id, { performerId: e.target.value || null })}
                  aria-label="Performer"
                >
                  <option value="">No performer</option>
                  {performers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => remove(r)} className="text-[10px] text-red-400/70 hover:text-red-400">
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
