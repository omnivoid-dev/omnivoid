'use client';

import { motion } from 'framer-motion';
import type { ThemePalette } from '@/lib/themes';

export interface ThemeOption {
  /** Edition id the theme belongs to */
  id: string;
  name: string;
  /** Effect / preset name, e.g. "Dither: purple & toxic green" */
  subtitle: string;
  palette: ThemePalette;
}

interface ThemePickerProps {
  options: ThemeOption[];
  /** The chosen theme's edition id, or null for the neutral OMNIVOID look */
  activeId: string | null;
  fxEnabled: boolean;
  onSelect: (id: string | null) => void;
  onToggleFx: () => void;
  onClose: () => void;
  /** The edition data has not arrived yet */
  loading?: boolean;
  /** Phone: a bottom sheet above the taskbar instead of a popover over the desktop taskbar */
  mobile?: boolean;
}

function Swatch({ palette }: { palette: ThemePalette }) {
  return (
    <span className="flex shrink-0 overflow-hidden rounded border border-white/20" aria-hidden>
      {[palette.bg, palette.ink, palette.accent].map((c, i) => (
        <span key={i} className="w-3.5 h-7" style={{ background: c }} />
      ))}
    </span>
  );
}

/**
 * Picks one of the edition themes for the whole site. The FX switch turns the chosen theme on or off
 * (off = the plain OMNIVOID look, with the choice remembered for when it is switched back on).
 */
export function ThemePicker({ options, activeId, fxEnabled, onSelect, onToggleFx, onClose, mobile, loading }: ThemePickerProps) {
  const rowCls = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors border ${
      active ? 'bg-[#99ccff]/15 border-[#99ccff]/50 text-[#99ccff]' : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <>
      {/* Click-away layer */}
      <div className={`fixed inset-0 ${mobile ? 'z-[190] bg-black/50' : 'z-[199]'}`} onClick={onClose} aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.16 }}
        role="dialog"
        aria-label="Themes"
        className={`fixed bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl overflow-hidden backdrop-blur-2xl font-mono flex flex-col ${
          mobile ? 'z-[195] left-3 right-3 max-h-[62dvh]' : 'z-[201] left-4 w-72 max-h-[70vh]'
        }`}
        style={{ bottom: mobile ? 'calc(3.5rem + env(safe-area-inset-bottom) + 8px)' : '3.5rem' }}
      >
        <div className="flex items-center justify-between gap-3 p-3 bg-[#99ccff]/10 border-b border-white/5 shrink-0">
          <span className="text-[10px] text-[#99ccff] font-bold tracking-[0.3em]">THEMES</span>
          <button
            type="button"
            role="switch"
            aria-checked={fxEnabled}
            onClick={onToggleFx}
            title={fxEnabled ? 'Turn the theme off (plain OMNIVOID look)' : 'Turn the theme on'}
            className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-white/70"
          >
            FX
            <span className={`relative w-9 h-5 rounded-full border transition-colors ${fxEnabled ? 'bg-[#99ccff]/30 border-[#99ccff]/60' : 'bg-white/5 border-white/20'}`}>
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${fxEnabled ? 'left-[18px] bg-[#99ccff]' : 'left-0.5 bg-white/40'}`} />
            </span>
            <span className={fxEnabled ? 'text-[#99ccff]' : 'text-white/40'}>{fxEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className={`p-2 space-y-1 overflow-y-auto transition-opacity ${fxEnabled ? '' : 'opacity-50'}`}>
          <button type="button" onClick={() => onSelect(null)} className={rowCls(activeId === null)}>
            <span className="w-[42px] h-7 rounded border border-white/20 bg-[#050505] flex items-center justify-center text-[10px] text-[#99ccff]/70 shrink-0" aria-hidden>
              ◌
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold tracking-wider">NEUTRAL</span>
              <span className="block text-[9px] text-white/40 truncate">The plain OMNIVOID look</span>
            </span>
            {activeId === null && <span className="ml-auto text-xs">✓</span>}
          </button>

          {options.map((o) => (
            <button key={o.id} type="button" onClick={() => onSelect(o.id)} className={rowCls(activeId === o.id)}>
              <Swatch palette={o.palette} />
              <span className="min-w-0">
                <span className="block text-[11px] font-bold tracking-wider truncate">{o.name.toUpperCase()}</span>
                <span className="block text-[9px] text-white/40 truncate">{o.subtitle}</span>
              </span>
              {activeId === o.id && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
          {options.length === 0 && <p className="p-3 text-[10px] text-white/40">{loading ? 'Loading themes...' : 'No edition has a theme yet.'}</p>}
        </div>

        {!fxEnabled && <p className="px-3 py-2 text-[9px] text-white/40 border-t border-white/5 shrink-0">FX is off. Pick a theme to switch it back on.</p>}
      </motion.div>
    </>
  );
}
