'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ArtistEntry {
  name: string;
  instagram?: string;
  youtube?: string;
}

interface YouTubeLinkEntry {
  title: string;
  url: string;
}

interface EditionEditorModalProps {
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditionEditorModal({ initialData, onClose, onSuccess }: EditionEditorModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [eventDate, setEventDate] = useState(
    initialData?.eventDate ? new Date(initialData.eventDate).toISOString().split('T')[0] : ''
  );
  const [posterUrl, setPosterUrl] = useState(initialData?.posterUrl || '');
  const [workshopPosterUrl, setWorkshopPosterUrl] = useState(initialData?.workshopPosterUrl || '');
  const [isLatestRitual, setIsLatestRitual] = useState(initialData?.isLatestRitual || false);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder || 0);

  // Parse Artists JSON
  const [artists, setArtists] = useState<ArtistEntry[]>(() => {
    if (!initialData?.artists) return [{ name: '', instagram: '', youtube: '' }];
    try {
      return typeof initialData.artists === 'string'
        ? JSON.parse(initialData.artists)
        : initialData.artists;
    } catch {
      return [{ name: '', instagram: '', youtube: '' }];
    }
  });

  // Parse YouTube Links JSON
  const [youtubeLinks, setYoutubeLinks] = useState<YouTubeLinkEntry[]>(() => {
    if (!initialData?.youtubeLinks) return [{ title: '', url: '' }];
    try {
      return typeof initialData.youtubeLinks === 'string'
        ? JSON.parse(initialData.youtubeLinks)
        : initialData.youtubeLinks;
    } catch {
      return [{ title: '', url: '' }];
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Artist list management
  const addArtist = () => setArtists([...artists, { name: '', instagram: '', youtube: '' }]);
  const updateArtist = (index: number, field: keyof ArtistEntry, value: string) => {
    const updated = [...artists];
    updated[index][field] = value;
    setArtists(updated);
  };
  const removeArtist = (index: number) => {
    setArtists(artists.filter((_, i) => i !== index));
  };

  // YouTube Links management
  const addLink = () => setYoutubeLinks([...youtubeLinks, { title: '', url: '' }]);
  const updateLink = (index: number, field: keyof YouTubeLinkEntry, value: string) => {
    const updated = [...youtubeLinks];
    updated[index][field] = value;
    setYoutubeLinks(updated);
  };
  const removeLink = (index: number) => {
    setYoutubeLinks(youtubeLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const cleanArtists = artists.filter((a) => a.name.trim() !== '');
    const cleanLinks = youtubeLinks.filter((l) => l.url.trim() !== '');

    const method = initialData?.id ? 'PUT' : 'POST';
    const url = initialData?.id ? `/api/admin/editions/${initialData.id}` : '/api/admin/editions';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description,
          eventDate: eventDate ? new Date(eventDate).toISOString() : null,
          posterUrl,
          workshopPosterUrl,
          isLatestRitual,
          isActive,
          sortOrder,
          artists: cleanArtists,
          youtubeLinks: cleanLinks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        throw new Error(data.error || 'Failed to save edition');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving edition');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0a] border border-[#99ccff]/30 rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl font-mono text-white"
      >
        <div className="px-8 py-5 border-b border-white/10 bg-[#99ccff]/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#99ccff]">
              {initialData ? '🏛️ EDIT EDITION & RITUAL' : '🏛️ CREATE NEW EDITION'}
            </h3>
            <p className="text-xs text-white/40">Configure event details, posters, artists, and links</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-base">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
              [ERROR] {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Edition Name */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                Edition Title *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. OMNIVOID Edition 010"
                required
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]"
              />
            </div>

            {/* URL Slug */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. edition-010"
                required
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Single Event Date */}
            <div>
              <label className="block text-[10px] font-bold text-[#99ccff] uppercase mb-1">
                Event Date (1 Day) *
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]"
              />
            </div>

            {/* Set as Latest Ritual Toggle */}
            <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded">
              <div>
                <span className="text-[10px] font-bold text-[#99ccff] block">LATEST RITUAL</span>
                <span className="text-[9px] text-white/40">Set as active ritual</span>
              </div>
              <input
                type="checkbox"
                checked={isLatestRitual}
                onChange={(e) => setIsLatestRitual(e.target.checked)}
                className="w-4 h-4 accent-[#99ccff] cursor-pointer"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
              Description / Overview
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Overview of this edition..."
              className="w-full bg-[#111] border border-[#333] rounded p-3 text-xs text-white outline-none focus:border-[#99ccff]"
            />
          </div>

          {/* Posters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                Main Edition Poster URL
              </label>
              <input
                type="text"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://... or Supabase storage path"
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                Workshop Poster URL
              </label>
              <input
                type="text"
                value={workshopPosterUrl}
                onChange={(e) => setWorkshopPosterUrl(e.target.value)}
                placeholder="https://... or Supabase storage path"
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]"
              />
            </div>
          </div>

          {/* Artists / Performers Section */}
          <div className="p-4 bg-white/2 border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-[#99ccff] uppercase">
                🎭 ARTISTS & PERFORMERS (INSTAGRAM & YOUTUBE HANDLES)
              </span>
              <button
                type="button"
                onClick={addArtist}
                className="text-[10px] bg-[#99ccff]/10 text-[#99ccff] px-3 py-1 rounded font-bold border border-[#99ccff]/20 hover:bg-[#99ccff]/20"
              >
                + ADD ARTIST
              </button>
            </div>

            {artists.map((artist, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-black/40 p-2.5 rounded border border-white/5">
                <div className="col-span-4">
                  <input
                    type="text"
                    value={artist.name}
                    onChange={(e) => updateArtist(idx, 'name', e.target.value)}
                    placeholder="Artist Name *"
                    className="w-full bg-[#111] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={artist.instagram || ''}
                    onChange={(e) => updateArtist(idx, 'instagram', e.target.value)}
                    placeholder="Instagram (@handle)"
                    className="w-full bg-[#111] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    value={artist.youtube || ''}
                    onChange={(e) => updateArtist(idx, 'youtube', e.target.value)}
                    placeholder="YouTube Handle / URL"
                    className="w-full bg-[#111] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeArtist(idx)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* YouTube Transmission Links per Edition */}
          <div className="p-4 bg-white/2 border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-[#99ccff] uppercase">
                📡 EDITION YOUTUBE TRANSMISSIONS
              </span>
              <button
                type="button"
                onClick={addLink}
                className="text-[10px] bg-[#99ccff]/10 text-[#99ccff] px-3 py-1 rounded font-bold border border-[#99ccff]/20 hover:bg-[#99ccff]/20"
              >
                + ADD YOUTUBE LINK
              </button>
            </div>

            {youtubeLinks.map((link, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-black/40 p-2.5 rounded border border-white/5">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLink(idx, 'title', e.target.value)}
                    placeholder="Video Title"
                    className="w-full bg-[#111] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLink(idx, 'url', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-[#111] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeLink(idx)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white/40 hover:text-white"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-[#99ccff] text-[#050505] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] transition-all disabled:opacity-50"
            >
              {isSaving ? 'SAVING...' : 'SAVE EDITION'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
