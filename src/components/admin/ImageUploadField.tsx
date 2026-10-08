'use client';

import { useState } from 'react';
import { uploadImage } from '@/lib/uploadClient';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind?: 'thumbnail' | 'poster';
  hint?: string;
}

/** Poster slot: uploads straight to Supabase Storage via a signed URL, or accepts a pasted URL. */
export default function ImageUploadField({ label, value, onChange, kind = 'poster', hint }: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ before: number; after: number } | null>(null);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadImage(file, kind);
      setStats({ before: result.originalBytes, after: result.bytes });
      onChange(result.publicUrl);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">{label}</label>
      <div className="flex gap-3 items-start">
        <div className="w-20 h-28 shrink-0 bg-[#111] border border-[#333] rounded overflow-hidden flex items-center justify-center text-white/20 text-xl">
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : '🖼️'}
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... (or upload below)"
            className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]"
          />
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold px-3 py-1.5 rounded border border-[#99ccff]/30 text-[#99ccff] bg-[#99ccff]/10 hover:bg-[#99ccff]/20 cursor-pointer">
              {isUploading ? 'UPLOADING...' : '⬆ UPLOAD IMAGE'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
            </label>
            {value && (
              <button type="button" onClick={() => { onChange(''); setStats(null); }} className="text-[10px] text-red-400 hover:text-red-300">
                REMOVE
              </button>
            )}
          </div>
          {stats && (
            <p className="text-[10px] text-emerald-400">
              Optimised to WebP: {(stats.before / 1024).toFixed(0)}KB → {(stats.after / 1024).toFixed(0)}KB. Save to keep it; unsaved uploads are purged.
            </p>
          )}
          {hint && !stats && <p className="text-[10px] text-white/30">{hint}</p>}
          {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
