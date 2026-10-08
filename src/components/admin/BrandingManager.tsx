'use client';

import { useEffect, useState } from 'react';
import { TintedImage } from '@/components/TintedImage';
import {
  BRANDING_KEY,
  DEFAULT_LOGO_URL,
  LOGO_ASPECT,
  MENU_ICON_SLOTS,
  SiteBranding,
  Tint,
  iconUrlFor,
  resolveBranding,
} from '@/lib/branding';
import { uploadToStorage } from '@/lib/uploadClient';

function TintControls({ tint, onChange }: { tint: Tint; onChange: (t: Tint) => void }) {
  const set = (patch: Partial<Tint>) => onChange({ ...tint, ...patch });
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['none', 'solid', 'gradient'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => set({ mode: m })}
            className={`px-3 py-1.5 text-[10px] font-bold tracking-widest rounded border transition-colors ${
              tint.mode === m
                ? 'bg-[#99ccff]/20 text-[#99ccff] border-[#99ccff]/50'
                : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
            }`}
          >
            {m === 'none' ? 'ORIGINAL' : m.toUpperCase()}
          </button>
        ))}
      </div>
      {tint.mode !== 'none' && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-[10px] text-white/50">
            {tint.mode === 'gradient' ? 'FROM' : 'COLOUR'}
            <input type="color" value={tint.color} onChange={(e) => set({ color: e.target.value })} className="w-8 h-8 bg-transparent border-0 cursor-pointer" />
          </label>
          {tint.mode === 'gradient' && (
            <>
              <label className="flex items-center gap-2 text-[10px] text-white/50">
                TO
                <input type="color" value={tint.color2} onChange={(e) => set({ color2: e.target.value })} className="w-8 h-8 bg-transparent border-0 cursor-pointer" />
              </label>
              <label className="flex items-center gap-2 text-[10px] text-white/50">
                ANGLE
                <input type="range" min={0} max={360} value={tint.angle} onChange={(e) => set({ angle: Number(e.target.value) })} />
                <span className="w-8 text-white/70">{tint.angle}°</span>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UploadButton({ label, onUploaded, onError }: { label: string; onUploaded: (url: string) => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="text-[10px] font-bold px-3 py-1.5 rounded border border-[#99ccff]/30 text-[#99ccff] bg-[#99ccff]/10 hover:bg-[#99ccff]/20 cursor-pointer whitespace-nowrap">
      {busy ? 'UPLOADING...' : label}
      <input
        type="file"
        accept=".svg,image/svg+xml,image/png"
        className="hidden"
        disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          const isSvg = f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg');
          if (!isSvg && f.type !== 'image/png') return onError('Use an SVG (preferred) or PNG file.');
          if (f.size > 1024 * 1024) return onError('File too large. Max 1MB.');
          setBusy(true);
          try {
            const { publicUrl } = await uploadToStorage(f, 'branding', isSvg ? 'image/svg+xml' : 'image/png');
            onUploaded(publicUrl);
          } catch (err: any) {
            onError(err.message || 'Upload failed');
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}

export default function BrandingManager() {
  const [branding, setBranding] = useState<SiteBranding>(resolveBranding(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        const row = d.success ? d.data.find((s: any) => s.key === BRANDING_KEY) : null;
        setBranding(resolveBranding(row?.value));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const save = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: BRANDING_KEY, value: branding }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setMessage({ type: 'success', text: 'Branding saved.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save branding.' });
    } finally {
      setIsSaving(false);
    }
  };

  const logoSrc = branding.logo.url || DEFAULT_LOGO_URL;
  const setLabel = (id: string, label: string) => {
    const labels = { ...branding.labels };
    if (label.trim()) labels[id] = label;
    else delete labels[id];
    setBranding({ ...branding, labels });
  };
  const setIcon = (id: string, url: string | null) => {
    const icons = { ...branding.icons };
    if (url) icons[id] = url;
    else delete icons[id];
    setBranding({ ...branding, icons });
  };

  if (isLoading) return <div className="text-xs text-white/40">Loading branding...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">🎨 BRANDING — LOGO, MENU ICONS & MENU NAMES</h2>
          <p className="text-[11px] text-white/40">Upload an SVG (or PNG with transparency) to replace, then tint it with a solid colour or gradient.</p>
        </div>
        <button
          onClick={save}
          disabled={isSaving}
          className="bg-[#99ccff] text-[#050505] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] disabled:opacity-50"
        >
          {isSaving ? 'SAVING...' : 'SAVE BRANDING'}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded text-xs font-bold border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Logo */}
      <div className="p-5 bg-white/5 border border-white/10 rounded-xl grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        <div className="bg-black border border-white/10 rounded-lg p-6 flex items-center justify-center">
          <TintedImage src={logoSrc} tint={branding.logo.tint} aspect={LOGO_ASPECT} alt="Main logo" style={{ width: '100%' }} />
        </div>
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-[#99ccff] tracking-widest">MAIN LOGO</span>
          <div className="flex items-center gap-2">
            <UploadButton label="⬆ REPLACE LOGO" onUploaded={(url) => setBranding({ ...branding, logo: { ...branding.logo, url } })} onError={(t) => setMessage({ type: 'error', text: t })} />
            {branding.logo.url && (
              <button type="button" onClick={() => setBranding({ ...branding, logo: { ...branding.logo, url: null } })} className="text-[10px] text-white/50 hover:text-white">
                RESET TO DEFAULT
              </button>
            )}
          </div>
          <TintControls tint={branding.logo.tint} onChange={(tint) => setBranding({ ...branding, logo: { ...branding.logo, tint } })} />
        </div>
      </div>

      {/* Menu icons */}
      <div className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-5">
        <div>
          <span className="text-[10px] font-bold text-[#99ccff] tracking-widest block mb-3">MENU ICON TINT (ALL ICONS)</span>
          <TintControls tint={branding.iconTint} onChange={(iconTint) => setBranding({ ...branding, iconTint })} />
        </div>

        <p className="text-[10px] text-white/40">
          Each card sets one menu entry: type a name to rename it (leave empty for the default shown in grey), or replace its icon.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MENU_ICON_SLOTS.map((slot) => {
            const url = iconUrlFor(branding, slot.id);
            return (
              <div key={slot.id} className="bg-black border border-white/10 rounded-lg p-3 space-y-3 text-center">
                <div className="h-16 flex items-center justify-center">
                  {url ? (
                    <TintedImage src={url} tint={branding.iconTint} alt={slot.label} style={{ width: 56, height: 56 }} />
                  ) : (
                    <span className="text-3xl">{slot.fallback}</span>
                  )}
                </div>
                <input
                  value={branding.labels[slot.id] ?? ''}
                  onChange={(e) => setLabel(slot.id, e.target.value)}
                  placeholder={slot.label.toUpperCase()}
                  maxLength={24}
                  aria-label={`Menu name for ${slot.label}`}
                  className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-[10px] font-bold tracking-widest text-center text-white placeholder:text-white/30 outline-none focus:border-[#99ccff]"
                />
                <div className="flex flex-col gap-1.5 items-center">
                  <UploadButton label="⬆ REPLACE" onUploaded={(u) => setIcon(slot.id, u)} onError={(t) => setMessage({ type: 'error', text: t })} />
                  {branding.icons[slot.id] && (
                    <button type="button" onClick={() => setIcon(slot.id, null)} className="text-[9px] text-white/40 hover:text-white">
                      RESET
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
