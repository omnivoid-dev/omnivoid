'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import ImageUploadField from './ImageUploadField';
import { NEUTRAL_THEME, THEME_PRESETS, isHex, presetById, resolveTheme, type ThemePalette } from '@/lib/themes';
import { EffectPreview } from '@/components/fx/EffectPreview';
import { FX_SPECS, defaultsFor, fxForPreset } from '@/lib/fx/presets';

interface PerformerEntry {
  key: string; // existing id or temp key; transmissions reference performers by this
  name: string;
  instagram: string;
  youtube: string;
}

interface TransmissionEntry {
  title: string;
  originalTitle: string;
  url: string;
  kind: 'SET' | 'WORKSHOP' | 'LABS' | 'OTHER';
  performerKey: string;
}

interface EditionEditorModalProps {
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

type TabId = 'details' | 'ritual' | 'workshop' | 'theme' | 'performers' | 'transmissions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'details', label: 'DETAILS' },
  { id: 'ritual', label: 'RITUAL' },
  { id: 'workshop', label: 'WORKSHOP' },
  { id: 'theme', label: 'THEME' },
  { id: 'performers', label: 'PERFORMERS' },
  { id: 'transmissions', label: 'TRANSMISSIONS' },
];

const inputCls =
  'w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]';
const labelCls = 'block text-[10px] font-bold text-white/40 uppercase mb-1';
const tempKey = () => `new-${Math.random().toString(36).slice(2, 9)}`;

const toDateInput = (v?: string | null) => (v ? new Date(v).toISOString().split('T')[0] : '');
const toDateTimeInput = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 16) : '');

export default function EditionEditorModal({ initialData, onClose, onSuccess }: EditionEditorModalProps) {
  const [tab, setTab] = useState<TabId>('details');

  // Details
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [eventDate, setEventDate] = useState(toDateInput(initialData?.eventDate));
  const [venue, setVenue] = useState(initialData?.venue || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder || 0);

  // Ritual
  const [isLatestRitual, setIsLatestRitual] = useState(initialData?.isLatestRitual || false);
  const [posterUrl, setPosterUrl] = useState(initialData?.posterUrl || '');
  const [ticketUrl, setTicketUrl] = useState(initialData?.ticketUrl || '');
  const [ticketLabel, setTicketLabel] = useState(initialData?.ticketLabel || 'GET TICKETS');

  // Workshop
  const [hasWorkshop, setHasWorkshop] = useState(initialData?.hasWorkshop || false);
  const [workshopTitle, setWorkshopTitle] = useState(initialData?.workshopTitle || '');
  const [workshopDescription, setWorkshopDescription] = useState(initialData?.workshopDescription || '');
  const [workshopDateTime, setWorkshopDateTime] = useState(toDateTimeInput(initialData?.workshopDateTime));
  const [workshopPosterUrl, setWorkshopPosterUrl] = useState(initialData?.workshopPosterUrl || '');
  const [workshopTicketUrl, setWorkshopTicketUrl] = useState(initialData?.workshopTicketUrl || '');

  // Theme: preset plus an editable palette (only agents and background take it)
  const initialTheme = resolveTheme(initialData?.themeColors);
  const [themePreset, setThemePreset] = useState<string>(initialData?.themeColors?.preset || '');
  const [palette, setPalette] = useState<ThemePalette>(initialTheme?.palette || NEUTRAL_THEME);

  const [themeParams, setThemeParams] = useState<Record<string, number>>(initialTheme?.params || {});

  const choosePreset = (id: string) => {
    setThemePreset(id);
    setThemeParams({});
    const preset = presetById(id);
    if (preset) setPalette(preset.palette);
    else setPalette(NEUTRAL_THEME);
  };

  // Performers
  const [performers, setPerformers] = useState<PerformerEntry[]>(
    (initialData?.performers || []).map((p: any) => ({
      key: p.id,
      name: p.name,
      instagram: p.instagram || '',
      youtube: p.youtube || '',
    }))
  );

  // Transmissions
  const [transmissions, setTransmissions] = useState<TransmissionEntry[]>(
    (initialData?.transmissions || []).map((t: any) => ({
      title: t.title,
      originalTitle: t.originalTitle || '',
      url: t.url,
      kind: t.kind || 'SET',
      performerKey: t.performerId || '',
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePerformer = (i: number, field: keyof PerformerEntry, value: string) =>
    setPerformers(performers.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));

  const updateTransmission = (i: number, patch: Partial<TransmissionEntry>) =>
    setTransmissions(transmissions.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  // On pasting a YouTube URL, remember the original title (and use it as the display name if empty)
  const fillYouTubeTitle = async (i: number) => {
    const t = transmissions[i];
    if (!t?.url || t.originalTitle) return;
    try {
      const res = await fetch(`/api/admin/youtube-meta?url=${encodeURIComponent(t.url)}`);
      const d = await res.json();
      if (d.success) {
        setTransmissions((prev) =>
          prev.map((x, idx) => (idx === i ? { ...x, originalTitle: d.data.title, title: x.title || d.data.title } : x))
        );
      }
    } catch {
      /* title stays manual */
    }
  };

  // The effect this preset uses (if any) and its values: defaults overridden by what is tuned for this edition
  const fxEffect = fxForPreset(themePreset);
  const fxParams = fxEffect ? { ...defaultsFor(fxEffect), ...themeParams } : {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

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
          eventDate: eventDate || null,
          venue,
          city,
          isActive,
          sortOrder,
          isLatestRitual,
          posterUrl,
          ticketUrl,
          ticketLabel,
          hasWorkshop,
          workshopTitle,
          workshopDescription,
          workshopDateTime: workshopDateTime ? new Date(workshopDateTime).toISOString() : null,
          workshopPosterUrl,
          workshopTicketUrl,
          themeColors: themePreset || palette.bg !== NEUTRAL_THEME.bg || palette.ink !== NEUTRAL_THEME.ink || palette.accent !== NEUTRAL_THEME.accent
            ? { preset: themePreset || undefined, palette, params: themeParams }
            : null,
          performers,
          transmissions: transmissions.map((t) => ({ ...t, performerKey: t.performerKey || null })),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save edition');
      onSuccess();
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
              {initialData ? '🏛️ EDIT EDITION' : '🏛️ CREATE NEW EDITION'}
            </h3>
            <p className="text-xs text-white/40">Everything for one edition lives here: ritual, workshop, roster, videos.</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-base">
            ✕
          </button>
        </div>

        <div className="flex border-b border-white/10 px-4 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-[10px] font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-[#99ccff] text-[#99ccff]' : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              {t.label}
              {t.id === 'performers' && performers.length > 0 && ` (${performers.length})`}
              {t.id === 'transmissions' && transmissions.length > 0 && ` (${transmissions.length})`}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">[ERROR] {error}</div>
          )}

          {/* ---------------- DETAILS ---------------- */}
          {tab === 'details' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Edition Title *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. OMNIVOID Edition 010" required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>URL Slug *</label>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. edition-010" required className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Event Date (1 day)</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Venue</label>
                  <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description / Overview</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Sort Order</label>
                  <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className={inputCls} />
                </div>
                <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded cursor-pointer">
                  <span className="text-[10px] font-bold text-white/60">VISIBLE ON SITE</span>
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-[#99ccff]" />
                </label>
              </div>
            </>
          )}

          {/* ---------------- RITUAL ---------------- */}
          {tab === 'ritual' && (
            <>
              <label className="flex items-center justify-between p-4 bg-[#99ccff]/5 border border-[#99ccff]/30 rounded cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[#99ccff] block">★ LATEST RITUAL</span>
                  <span className="text-[10px] text-white/40">
                    The upcoming edition. Only one at a time. Saving this clears the flag and ticket links on the previous one.
                  </span>
                </div>
                <input type="checkbox" checked={isLatestRitual} onChange={(e) => setIsLatestRitual(e.target.checked)} className="w-5 h-5 accent-[#99ccff]" />
              </label>

              <ImageUploadField label="Main Edition Poster" value={posterUrl} onChange={setPosterUrl} />

              {isLatestRitual ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className={labelCls}>Ticket Link</label>
                    <input type="url" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Button Label</label>
                    <input type="text" value={ticketLabel} onChange={(e) => setTicketLabel(e.target.value)} placeholder="GET TICKETS / SOLD OUT" className={inputCls} />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-white/30 border border-dashed border-white/10 rounded p-3">
                  Ticket links are only available on the Latest Ritual, so old links never linger. Any existing ticket link is cleared when this edition is saved without the flag.
                </p>
              )}
            </>
          )}

          {/* ---------------- WORKSHOP ---------------- */}
          {tab === 'workshop' && (
            <>
              <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded cursor-pointer">
                <span className="text-xs font-bold text-emerald-400">THIS EDITION HAS A WORKSHOP</span>
                <input type="checkbox" checked={hasWorkshop} onChange={(e) => setHasWorkshop(e.target.checked)} className="w-5 h-5 accent-emerald-400" />
              </label>

              {hasWorkshop && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Workshop Title</label>
                      <input type="text" value={workshopTitle} onChange={(e) => setWorkshopTitle(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Date & Time</label>
                      <input type="datetime-local" value={workshopDateTime} onChange={(e) => setWorkshopDateTime(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Workshop Description</label>
                    <textarea value={workshopDescription} onChange={(e) => setWorkshopDescription(e.target.value)} rows={4} className={inputCls} />
                  </div>
                  <ImageUploadField label="Workshop Poster" value={workshopPosterUrl} onChange={setWorkshopPosterUrl} />
                  {isLatestRitual ? (
                    <div>
                      <label className={labelCls}>Workshop Ticket Link</label>
                      <input type="url" value={workshopTicketUrl} onChange={(e) => setWorkshopTicketUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/30 border border-dashed border-white/10 rounded p-3">
                      Workshop ticket links are only kept on the Latest Ritual.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* ---------------- THEME ---------------- */}
          {tab === 'theme' && (
            <div className="space-y-5">
              <p className="text-[10px] text-white/40">
                Applied when a visitor selects this edition. Only the background and the agents take the colours; windows stay constant. The effect (dither, riso, glitch...) comes with the shader step.
              </p>

              <div>
                <label className={labelCls}>Preset</label>
                <select value={themePreset} onChange={(e) => choosePreset(e.target.value)} className={inputCls}>
                  <option value="">— None (neutral OMNIVOID look) —</option>
                  {THEME_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                      {p.provisional ? ' (placeholder colours)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    ['bg', 'Background'],
                    ['ink', 'Agents'],
                    ['accent', 'Accent'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={isHex(palette[key]) && palette[key].length === 7 ? palette[key] : '#000000'}
                        onChange={(e) => setPalette({ ...palette, [key]: e.target.value })}
                        className="w-9 h-9 bg-transparent border-0 cursor-pointer shrink-0"
                      />
                      <input
                        value={palette[key]}
                        onChange={(e) => setPalette({ ...palette, [key]: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => choosePreset(themePreset)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded border border-white/15 text-white/60 hover:text-white"
                >
                  RESET TO PRESET
                </button>
              </div>

              {fxEffect ? (
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-[#99ccff] tracking-widest">
                    {FX_SPECS[fxEffect].label.toUpperCase()} EFFECT (live preview)
                  </div>
                  <EffectPreview effect={fxEffect} palette={palette} params={fxParams} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {FX_SPECS[fxEffect].params.map((spec) => (
                      <label key={spec.key} className="flex items-center gap-2 text-[10px] text-white/70">
                        <span className="w-24 shrink-0">{spec.label}</span>
                        <input
                          type="range"
                          min={spec.min}
                          max={spec.max}
                          step={spec.step}
                          value={fxParams[spec.key]}
                          onChange={(e) => setThemeParams({ ...themeParams, [spec.key]: Number(e.target.value) })}
                          className="flex-1 min-w-0"
                        />
                        <span className="w-10 text-right">{fxParams[spec.key]}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setThemeParams({})}
                      className="text-[10px] font-bold px-3 py-1.5 rounded border border-white/15 text-white/60 hover:text-white"
                    >
                      RESET EFFECT VALUES
                    </button>
                    <span className="text-[10px] text-white/30">Saved with the edition.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40">
                    {themePreset ? 'No post-effect for this preset yet: the site shows the plain plexus in these colours.' : 'Choose a preset to see its effect.'}
                  </p>
              <div className="rounded-lg border border-white/10 overflow-hidden" style={{ background: palette.bg }}>
                <svg viewBox="0 0 320 110" className="w-full h-28">
                  {[
                    [30, 30, 90, 70],
                    [90, 70, 150, 25],
                    [150, 25, 215, 80],
                    [215, 80, 285, 35],
                    [90, 70, 215, 80],
                  ].map(([x1, y1, x2, y2], i) => (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={palette.ink} strokeOpacity={0.55} />
                  ))}
                  {[
                    [30, 30, 3],
                    [90, 70, 5],
                    [150, 25, 4],
                    [215, 80, 6],
                    [285, 35, 3],
                  ].map(([cx, cy, r], i) => (
                    <circle key={i} cx={cx} cy={cy} r={r} fill={palette.ink} />
                  ))}
                  <line x1="160" y1="55" x2="150" y2="25" stroke={palette.accent} strokeOpacity={0.7} />
                  <line x1="160" y1="55" x2="215" y2="80" stroke={palette.accent} strokeOpacity={0.7} />
                  <circle cx="160" cy="55" r="3" fill={palette.accent} />
                </svg>
              </div>
                </div>
              )}
            </div>
          )}

          {/* ---------------- PERFORMERS ---------------- */}
          {tab === 'performers' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#99ccff] uppercase">🎭 Roster</span>
                <button
                  type="button"
                  onClick={() => setPerformers([...performers, { key: tempKey(), name: '', instagram: '', youtube: '' }])}
                  className="text-[10px] bg-[#99ccff]/10 text-[#99ccff] px-3 py-1 rounded font-bold border border-[#99ccff]/20 hover:bg-[#99ccff]/20"
                >
                  + ADD PERFORMER
                </button>
              </div>
              {performers.length === 0 && <p className="text-xs text-white/30">No performers yet. Roster can be filled in later.</p>}
              {performers.map((p, i) => (
                <div key={p.key} className="grid grid-cols-12 gap-2 items-center bg-black/40 p-2.5 rounded border border-white/5">
                  <input className={`col-span-4 ${inputCls}`} value={p.name} onChange={(e) => updatePerformer(i, 'name', e.target.value)} placeholder="Name *" />
                  <input className={`col-span-3 ${inputCls}`} value={p.instagram} onChange={(e) => updatePerformer(i, 'instagram', e.target.value)} placeholder="@instagram" />
                  <input className={`col-span-4 ${inputCls}`} value={p.youtube} onChange={(e) => updatePerformer(i, 'youtube', e.target.value)} placeholder="YouTube handle / URL" />
                  <button
                    type="button"
                    onClick={() => {
                      setPerformers(performers.filter((_, idx) => idx !== i));
                      setTransmissions(transmissions.map((t) => (t.performerKey === p.key ? { ...t, performerKey: '' } : t)));
                    }}
                    className="col-span-1 text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ---------------- TRANSMISSIONS ---------------- */}
          {tab === 'transmissions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#99ccff] uppercase">📡 YouTube Transmissions</span>
                <button
                  type="button"
                  onClick={() => setTransmissions([...transmissions, { title: '', originalTitle: '', url: '', kind: 'SET', performerKey: '' }])}
                  className="text-[10px] bg-[#99ccff]/10 text-[#99ccff] px-3 py-1 rounded font-bold border border-[#99ccff]/20 hover:bg-[#99ccff]/20"
                >
                  + ADD VIDEO
                </button>
              </div>
              {transmissions.length === 0 && <p className="text-xs text-white/30">No videos for this edition yet.</p>}
              {transmissions.map((t, i) => (
                <div key={i} className="space-y-2 bg-black/40 p-3 rounded border border-white/5">
                  <div className="grid grid-cols-12 gap-2">
                    <input className={`col-span-5 ${inputCls}`} value={t.title} onChange={(e) => updateTransmission(i, { title: e.target.value })} placeholder="Display name (shown on site)" />
                    <input className={`col-span-6 ${inputCls}`} value={t.url} onChange={(e) => updateTransmission(i, { url: e.target.value })} onBlur={() => fillYouTubeTitle(i)} placeholder="https://www.youtube.com/watch?v=..." />
                    <button type="button" onClick={() => setTransmissions(transmissions.filter((_, idx) => idx !== i))} className="col-span-1 text-red-400 hover:text-red-300 text-xs">
                      ✕
                    </button>
                  </div>
                  {t.originalTitle && t.originalTitle !== t.title && (
                    <p className="text-[10px] text-white/30 truncate">YouTube title: {t.originalTitle}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <select className={inputCls} value={t.performerKey} onChange={(e) => updateTransmission(i, { performerKey: e.target.value })}>
                      <option value="">— No performer (edition-wide) —</option>
                      {performers.filter((p) => p.name.trim()).map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select className={inputCls} value={t.kind} onChange={(e) => updateTransmission(i, { kind: e.target.value as TransmissionEntry['kind'] })}>
                      <option value="SET">Live set</option>
                      <option value="WORKSHOP">Workshop</option>
                      <option value="LABS">Labs</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2 text-xs font-bold text-white/40 hover:text-white">
              CANCEL
            </button>
            <button type="submit" disabled={isSaving} className="bg-[#99ccff] text-[#050505] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] transition-all disabled:opacity-50">
              {isSaving ? 'SAVING...' : 'SAVE EDITION'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
