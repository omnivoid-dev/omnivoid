'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface Mp3UploadModalProps {
  editions: { label: string; value: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function Mp3UploadModal({ editions, onClose, onSuccess }: Mp3UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [editionId, setEditionId] = useState(editions[0]?.value || '');
  const [duration, setDuration] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.includes('audio') && !selectedFile.name.endsWith('.mp3')) {
      setError('Please select a valid MP3 or audio file.');
      return;
    }

    setError(null);
    setFile(selectedFile);

    // Auto fill title if empty
    if (!title) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName);
    }

    // Measure audio duration using HTMLAudioElement
    const tempAudio = new Audio();
    const objectUrl = URL.createObjectURL(selectedFile);
    tempAudio.src = objectUrl;
    tempAudio.onloadedmetadata = () => {
      setDuration(Math.round(tempAudio.duration));
      URL.revokeObjectURL(objectUrl);
    };
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an MP3 file to upload.');
      return;
    }
    if (!editionId) {
      setError('Please select an edition.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      // 1. Get signed upload URL
      const filename = `audio/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const urlRes = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: 'media',
          filename,
          contentType: file.type || 'audio/mpeg',
        }),
      });

      const urlData = await urlRes.json();
      if (!urlData.success || !urlData.signedUrl) {
        throw new Error(urlData.error || 'Failed to generate signed upload URL');
      }

      setUploadProgress(30);

      // 2. Upload directly to Supabase Storage via signed URL
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'audio/mpeg',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }

      setUploadProgress(80);

      // 3. Create Resource record in Prisma via API
      const publicUrl = urlData.publicUrl;
      const resourceRes = await fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type: 'AUDIO',
          editionId,
          url: publicUrl,
          filePath: urlData.path,
          description: artist ? `Artist: ${artist}` : undefined,
          metadata: {
            artist,
            duration,
            format: 'mp3',
            fileSize: file.size,
          },
          sortOrder,
          isActive,
        }),
      });

      const resourceData = await resourceRes.json();
      if (!resourceData.success) {
        throw new Error(resourceData.error || 'Failed to save audio resource');
      }

      setUploadProgress(100);
      onSuccess();
    } catch (err: any) {
      console.error('MP3 Upload error:', err);
      setError(err.message || 'Failed to upload audio file');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
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
            <h3 className="text-xl font-bold text-[#99ccff] tracking-tight">🎵 UPLOAD MP3 AUDIO TRACK</h3>
            <p className="text-xs text-white/40 font-mono mt-0.5">Direct signed URL upload to Supabase Storage</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-mono">
              [ERROR] {error}
            </div>
          )}

          {/* File Selector */}
          <div>
            <label className="block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-2">
              MP3 Audio File *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                file ? 'border-[#99ccff]/60 bg-[#99ccff]/5' : 'border-white/20 hover:border-[#99ccff]/40 bg-white/2'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mp3,audio/mpeg,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-3xl mb-2">{file ? '🎧' : '📁'}</span>
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-bold text-[#99ccff] truncate max-w-xs">{file.name}</p>
                  <p className="text-[10px] text-white/40 font-mono mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB {duration > 0 && `• ${formatDuration(duration)}`}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-bold text-white/70">Click to select MP3 file</p>
                  <p className="text-[10px] text-white/30 font-mono mt-1">Supports .mp3 files up to 50MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5">
                Track Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. OMNIVOID Transmission 01"
                className="w-full bg-[#111111] border border-[#333333] rounded-lg px-4 py-2 text-sm focus:border-[#99ccff]/50 outline-none text-white"
              />
            </div>

            {/* Artist */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5">
                Artist / Project
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. OMNIVOID LABS"
                className="w-full bg-[#111111] border border-[#333333] rounded-lg px-4 py-2 text-sm focus:border-[#99ccff]/50 outline-none text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Edition */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5">
                Edition *
              </label>
              <select
                value={editionId}
                onChange={(e) => setEditionId(e.target.value)}
                required
                className="w-full bg-[#111111] border border-[#333333] rounded-lg px-3 py-2 text-xs focus:border-[#99ccff]/50 outline-none text-white"
              >
                {editions.map((ed) => (
                  <option key={ed.value} value={ed.value}>{ed.label}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5">
                Duration (sec)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                className="w-full bg-[#111111] border border-[#333333] rounded-lg px-3 py-2 text-xs focus:border-[#99ccff]/50 outline-none text-white font-mono"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5">
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full bg-[#111111] border border-[#333333] rounded-lg px-3 py-2 text-xs focus:border-[#99ccff]/50 outline-none text-white font-mono"
              />
            </div>
          </div>

          {/* Progress bar if uploading */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-[#99ccff]">
                <span>UPLOADING TO SUPABASE...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#99ccff] h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2 text-xs font-bold text-white/40 hover:text-white transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="bg-[#99ccff] text-[#080808] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#99ccff]/10"
            >
              {isUploading ? 'UPLOADING...' : 'UPLOAD & SAVE AUDIO'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
