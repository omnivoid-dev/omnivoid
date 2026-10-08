'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MAX_PDF_BYTES, uploadToStorage } from '@/lib/uploadClient';
import ImageUploadField from './ImageUploadField';

interface ResearchUploadModalProps {
  editions: { label: string; value: string }[];
  initialData?: any; // existing RESEARCH document when editing
  onClose: () => void;
  onSuccess: () => void;
}

const inputCls =
  'w-full bg-[#111] border border-[#333] rounded-lg px-4 py-2 text-sm focus:border-[#99ccff]/50 outline-none text-white';
const labelCls = 'block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5';

export default function ResearchUploadModal({ editions, initialData, onClose, onSuccess }: ResearchUploadModalProps) {
  const isEdit = !!initialData?.id;
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(initialData?.title || '');
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
  const [editionId, setEditionId] = useState(initialData?.editionId || '');
  const [sortOrder, setSortOrder] = useState<number>(initialData?.sortOrder || 0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(initialData?.thumbnailUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed.');
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setError(`That file is ${(f.size / 1024 / 1024).toFixed(1)}MB. The limit is 10MB.`);
      return;
    }
    setError(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && !file) {
      setError('Please select a PDF to upload.');
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      if (file) {
        const up = await uploadToStorage(file, 'research', 'application/pdf');
        fileUrl = up.publicUrl;
        fileName = file.name;
      }

      const payload: any = {
        title,
        excerpt: excerpt || null,
        editionId: editionId || null,
        sortOrder,
        thumbnailUrl: thumbnailUrl || null,
        ...(fileUrl ? { fileUrl, fileName } : {}),
      };

      const res = await fetch(isEdit ? `/api/admin/documents/${initialData.id}` : '/api/admin/documents', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? payload : { ...payload, type: 'RESEARCH', content: excerpt || title }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save paper');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save paper');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-[#99ccff]/30 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl shadow-black/80"
      >
        <div className="px-8 py-6 border-b border-white/10 bg-[#99ccff]/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#99ccff] tracking-tight">📚 {isEdit ? 'EDIT' : 'UPLOAD'} RESEARCH PAPER</h3>
            <p className="text-xs text-white/40 font-mono mt-0.5">PDF only · max 10MB · thumbnail max 3MB</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 font-mono">
          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">[ERROR] {error}</div>}

          <div>
            <label className={labelCls}>PDF File {isEdit ? '(leave empty to keep current)' : '*'}</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center cursor-pointer transition-all ${
                file ? 'border-[#99ccff]/60 bg-[#99ccff]/5' : 'border-white/20 hover:border-[#99ccff]/40'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              <span className="text-3xl mb-2">{file ? '📄' : '📁'}</span>
              {file ? (
                <p className="text-sm font-bold text-[#99ccff] truncate max-w-xs">
                  {file.name} <span className="text-white/40 font-normal">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </p>
              ) : (
                <p className="text-xs text-white/60">
                  {isEdit && initialData?.fileName ? `Current: ${initialData.fileName}. Click to replace.` : 'Click to select a PDF'}
                </p>
              )}
            </div>
          </div>

          <ImageUploadField
            label="Thumbnail (optional)"
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            kind="thumbnail"
            hint="JPG, PNG or WebP up to 3MB. Converted to an optimised WebP."
          />

          <div>
            <label className={labelCls}>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Short description</label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Edition (optional)</label>
              <select value={editionId} onChange={(e) => setEditionId(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {editions.map((ed) => (
                  <option key={ed.value} value={ed.value}>
                    {ed.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sort Order</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} disabled={isUploading} className="px-5 py-2 text-xs font-bold text-white/40 hover:text-white">
              CANCEL
            </button>
            <button type="submit" disabled={isUploading} className="bg-[#99ccff] text-[#080808] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] disabled:opacity-50">
              {isUploading ? 'SAVING...' : isEdit ? 'SAVE CHANGES' : 'UPLOAD & SAVE'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
