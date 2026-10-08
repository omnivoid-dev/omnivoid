'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { uploadToStorage } from '@/lib/uploadClient';
import { BITRATE_OPTIONS, compressMp3 } from '@/lib/audioCompress';

interface Mp3UploadModalProps {
  editions: { label: string; value: string }[];
  initialData?: any; // existing AUDIO resource when editing
  onClose: () => void;
  onSuccess: () => void;
}

interface PerformerOption {
  id: string;
  name: string;
}

const inputCls =
  'w-full bg-[#111111] border border-[#333333] rounded-lg px-4 py-2 text-sm focus:border-[#99ccff]/50 outline-none text-white';
const labelCls = 'block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5';

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Mp3UploadModal({ editions, initialData, onClose, onSuccess }: Mp3UploadModalProps) {
  const isEdit = !!initialData?.id;

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(initialData?.title || '');
  const [editionId, setEditionId] = useState(initialData?.editionId || editions[0]?.value || '');
  const [performerId, setPerformerId] = useState(initialData?.performerId || '');
  const [duration, setDuration] = useState<number>(initialData?.metadata?.duration || 0);
  const [sortOrder, setSortOrder] = useState<number>(initialData?.sortOrder || 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const [performers, setPerformers] = useState<PerformerOption[]>([]);
  const [addingPerformer, setAddingPerformer] = useState(false);
  const [newPerformerName, setNewPerformerName] = useState('');
  const [newPerformerInstagram, setNewPerformerInstagram] = useState('');
  const [newPerformerYoutube, setNewPerformerYoutube] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [bitrate, setBitrate] = useState(128);
  const [compressProgress, setCompressProgress] = useState<number | null>(null);
  const [compressNote, setCompressNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Performers belong to an edition, so reload the list when the edition changes
  useEffect(() => {
    if (!editionId) return setPerformers([]);
    fetch(`/api/admin/performers?editionId=${editionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setPerformers(d.data.map((p: any) => ({ id: p.id, name: p.name })));
        setPerformerId((cur: string) => (d.data.some((p: any) => p.id === cur) ? cur : ''));
      })
      .catch(() => setPerformers([]));
  }, [editionId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.includes('audio') && !selected.name.toLowerCase().endsWith('.mp3')) {
      setError('Please select a valid MP3 or audio file.');
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      setError('That file is over 50MB.');
      return;
    }

    setError(null);
    setFile(selected);

    // The filename is only a starting point; the title stays editable
    if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));

    const tempAudio = new Audio();
    const objectUrl = URL.createObjectURL(selected);
    tempAudio.src = objectUrl;
    tempAudio.onloadedmetadata = () => {
      setDuration(Math.round(tempAudio.duration));
      URL.revokeObjectURL(objectUrl);
    };
  };

  const handleAddPerformer = async () => {
    if (!newPerformerName.trim()) return;
    setError(null);
    try {
      const res = await fetch('/api/admin/performers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editionId,
          name: newPerformerName,
          instagram: newPerformerInstagram,
          youtube: newPerformerYoutube,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setPerformers((prev) => [...prev, { id: d.data.id, name: d.data.name }]);
      setPerformerId(d.data.id);
      setAddingPerformer(false);
      setNewPerformerName('');
      setNewPerformerInstagram('');
      setNewPerformerYoutube('');
    } catch (err: any) {
      setError(err.message || 'Failed to add performer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !file) return setError('Please select an MP3 file to upload.');
    if (!editionId) return setError('Please select an edition.');

    setIsSaving(true);
    setError(null);

    try {
      let url: string | undefined;
      let filePath: string | undefined;
      if (file) {
        // Compress first (browser-side), then upload the smaller file
        setCompressProgress(0);
        const prepared = await compressMp3(file, bitrate, duration, setCompressProgress);
        setCompressProgress(null);
        const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
        setCompressNote(
          prepared.compressed
            ? `Compressed ${mb(prepared.before)}MB to ${mb(prepared.after)}MB.`
            : prepared.reason || null
        );
        if (prepared.file.size > 50 * 1024 * 1024) throw new Error('Even after compression this file is over 50MB.');

        const up = await uploadToStorage(prepared.file, 'audio', 'audio/mpeg');
        url = up.publicUrl;
        filePath = up.path;
      }

      const artist = performers.find((p) => p.id === performerId)?.name || '';
      const payload: any = {
        title,
        editionId,
        performerId: performerId || null,
        sortOrder,
        isActive,
        metadata: {
          ...(initialData?.metadata || {}),
          artist,
          duration,
          format: 'mp3',
          ...(file ? { fileSize: file.size } : {}),
        },
        ...(url ? { url, filePath } : {}),
      };

      const res = await fetch(isEdit ? `/api/admin/resources/${initialData.id}` : '/api/admin/resources', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? payload : { ...payload, type: 'AUDIO' }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Failed to save audio track');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save audio track');
    } finally {
      setIsSaving(false);
      setCompressProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#99ccff]/30 rounded-2xl w-full max-w-xl my-8 overflow-hidden shadow-2xl shadow-black/80"
      >
        <div className="px-8 py-6 border-b border-white/10 bg-[#99ccff]/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#99ccff] tracking-tight">🎧 {isEdit ? 'EDIT' : 'UPLOAD'} AUDIO TRACK</h3>
            <p className="text-xs text-white/40 font-mono mt-0.5">MP3 · max 50MB · appears in the site's audio player</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-mono">[ERROR] {error}</div>}

          <div>
            <label className={labelCls}>MP3 File {isEdit ? '(leave empty to keep current)' : '*'}</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                file ? 'border-[#99ccff]/60 bg-[#99ccff]/5' : 'border-white/20 hover:border-[#99ccff]/40'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="audio/mp3,audio/mpeg,audio/*" onChange={handleFileChange} className="hidden" />
              <span className="text-3xl mb-2">{file ? '🎧' : '📁'}</span>
              {file ? (
                <p className="text-sm font-bold text-[#99ccff] truncate max-w-xs">
                  {file.name}{' '}
                  <span className="text-white/40 font-normal font-mono text-[10px]">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB {duration > 0 && `• ${formatDuration(duration)}`}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-white/60">{isEdit ? 'Click to replace the audio file' : 'Click to select an MP3'}</p>
              )}
            </div>
          </div>

          {(file || !isEdit) && (
            <div>
              <label className={labelCls}>Compression</label>
              <select value={bitrate} onChange={(e) => setBitrate(parseInt(e.target.value))} className={inputCls}>
                {BITRATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-white/30 mt-1">Re-encoded in your browser before upload. Tracks already at or below the chosen bitrate are left as they are.</p>
            </div>
          )}

          <div>
            <label className={labelCls}>Track Name * (shown in the player; edit freely)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Live at OMNIVOID 010" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Edition *</label>
              <select value={editionId} onChange={(e) => setEditionId(e.target.value)} required className={inputCls}>
                {editions.map((ed) => (
                  <option key={ed.value} value={ed.value}>
                    {ed.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Performer</label>
              <div className="flex gap-2">
                <select value={performerId} onChange={(e) => setPerformerId(e.target.value)} className={inputCls}>
                  <option value="">— None —</option>
                  {performers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddingPerformer((v) => !v)}
                  title="Add a performer to this edition"
                  className="shrink-0 px-3 rounded-lg border border-[#99ccff]/30 text-[#99ccff] bg-[#99ccff]/10 hover:bg-[#99ccff]/20 text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {addingPerformer && (
            <div className="p-4 border border-[#99ccff]/20 bg-[#99ccff]/5 rounded-lg space-y-3">
              <span className="text-[10px] font-bold text-[#99ccff] tracking-widest">
                NEW PERFORMER → {editions.find((e) => e.value === editionId)?.label}
              </span>
              <input value={newPerformerName} onChange={(e) => setNewPerformerName(e.target.value)} placeholder="Performer name *" className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <input value={newPerformerInstagram} onChange={(e) => setNewPerformerInstagram(e.target.value)} placeholder="@instagram (optional)" className={inputCls} />
                <input value={newPerformerYoutube} onChange={(e) => setNewPerformerYoutube(e.target.value)} placeholder="YouTube (optional)" className={inputCls} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAddingPerformer(false)} className="text-[10px] text-white/40 hover:text-white px-3 py-1.5">
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleAddPerformer}
                  disabled={!newPerformerName.trim()}
                  className="text-[10px] font-bold bg-[#99ccff] text-[#050505] px-4 py-1.5 rounded disabled:opacity-40"
                >
                  ADD PERFORMER
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Duration (sec)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Playlist Order</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>

          <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded cursor-pointer">
            <span className="text-[10px] font-bold text-white/60">VISIBLE IN PLAYER</span>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-[#99ccff]" />
          </label>

          {compressProgress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-[#99ccff]">
                <span>COMPRESSING...</span>
                <span>{Math.round(compressProgress * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-[#99ccff] h-full transition-all duration-200" style={{ width: `${compressProgress * 100}%` }} />
              </div>
            </div>
          )}
          {compressNote && compressProgress === null && <p className="text-[10px] text-emerald-400">{compressNote}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2 text-xs font-bold text-white/40 hover:text-white">
              CANCEL
            </button>
            <button type="submit" disabled={isSaving} className="bg-[#99ccff] text-[#080808] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] disabled:opacity-50">
              {isSaving ? 'SAVING...' : isEdit ? 'SAVE CHANGES' : 'UPLOAD & SAVE'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
