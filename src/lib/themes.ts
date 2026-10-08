/**
 * Edition themes. A theme is a preset id plus a three-colour palette:
 *   bg     - page background
 *   ink    - the agents / plexus
 *   accent - cursor lines and highlights
 * Only the background and the agents take the theme; windows stay constant.
 * Stored on Edition.themeColors as { preset, palette? }. Missing palette values fall back to the preset.
 * (Post-processing shaders will hook into the same preset ids later.)
 */

export interface ThemePalette {
  bg: string;
  ink: string;
  accent: string;
}

import { FX_SPECS } from './fx/presets';

export interface StoredTheme {
  preset?: string;
  palette?: Partial<ThemePalette>;
  /** Tuned post-effect parameters for this edition (see FX_SPECS for the keys). */
  params?: Record<string, number>;
}

export interface ThemePreset {
  id: string;
  label: string;
  palette: ThemePalette;
  /** True where the palette is a placeholder to be dialled in. */
  provisional?: boolean;
}

export const NEUTRAL_THEME: ThemePalette = { bg: '#050505', ink: '#99ccff', accent: '#99ccff' };

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'dither-yellow', label: 'Dither: yellow & black', palette: { bg: '#000000', ink: '#FFC400', accent: '#FFFFFF' } },
  { id: 'riso-blue', label: 'Riso: blue', palette: { bg: '#241A7A', ink: '#2F7FC1', accent: '#C0278E' } },
  { id: 'ascii-green', label: 'ASCII: green', palette: { bg: '#121212', ink: '#00FF30', accent: '#BBBBBB' } },
  { id: 'vanity', label: 'Vanity (La Nuit Blanche)', palette: { bg: '#8A0F26', ink: '#FFE6A0', accent: '#FFB347' } },
  { id: 'oscilloscope-red', label: 'Oscilloscope: red & black', palette: { bg: '#050505', ink: '#FF1A1A', accent: '#FFB3B3' } },
  { id: 'ai-goo-red-metallic', label: 'AI goo: red metallic', palette: { bg: '#05060A', ink: '#F23B0E', accent: '#C9D3DC' } },
  { id: 'dither-purple-green', label: 'Dither: purple & toxic green', palette: { bg: '#A924C6', ink: '#7DC15E', accent: '#FFFFFF' } },
  { id: 'glitch-print', label: 'Glitch: digital 3D print', palette: { bg: '#0A0A0A', ink: '#99CCFF', accent: '#FF3B6B' }, provisional: true },
  { id: 'cyanotype-blue', label: 'Cyanotype: blue', palette: { bg: '#0B2A5B', ink: '#E8F1FF', accent: '#2F6FD0' } },
  { id: 'mandelbrot', label: 'Mandelbrot', palette: { bg: '#02030A', ink: '#7FD0FF', accent: '#FF8A3D' }, provisional: true },
];

export const presetById = (id?: string | null) => THEME_PRESETS.find((p) => p.id === id);

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);

/** Stored theme (possibly partial or missing) merged over its preset; null means "use the neutral look". */
export function resolveTheme(stored: unknown): { id: string | null; label: string; palette: ThemePalette; params: Record<string, number> } | null {
  if (!stored || typeof stored !== 'object') return null;
  const s = stored as StoredTheme;
  const preset = presetById(s.preset);
  if (!preset && !s.palette) return null;

  const base = preset?.palette ?? NEUTRAL_THEME;
  const palette: ThemePalette = {
    bg: isHex(s.palette?.bg) ? s.palette!.bg! : base.bg,
    ink: isHex(s.palette?.ink) ? s.palette!.ink! : base.ink,
    accent: isHex(s.palette?.accent) ? s.palette!.accent! : base.accent,
  };
  return { id: preset?.id ?? null, label: preset?.label ?? 'Custom', palette, params: sanitizeParams(s.params) ?? {} };
}

/** Known parameter keys with the widest range any effect allows for them. */
const PARAM_RANGES = (() => {
  const ranges = new Map<string, { min: number; max: number }>();
  for (const spec of Object.values(FX_SPECS)) {
    for (const p of spec.params) {
      const r = ranges.get(p.key);
      ranges.set(p.key, { min: Math.min(r?.min ?? p.min, p.min), max: Math.max(r?.max ?? p.max, p.max) });
    }
  }
  return ranges;
})();

/** Keep finite numbers for known keys, clamped to their range. Undefined when there is nothing valid. */
export function sanitizeParams(input: unknown): Record<string, number> | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const range = PARAM_RANGES.get(key);
    if (range && typeof value === 'number' && Number.isFinite(value)) out[key] = Math.min(range.max, Math.max(range.min, value));
  }
  return Object.keys(out).length ? out : undefined;
}

/** Keep only known, valid fields before saving (server side). */
export function sanitizeStoredTheme(input: unknown, previous?: unknown): StoredTheme | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as StoredTheme;
  const out: StoredTheme = { ...(previous && typeof previous === 'object' ? (previous as StoredTheme) : {}) };
  out.preset = presetById(s.preset) ? s.preset : undefined;
  out.palette = {
    bg: isHex(s.palette?.bg) ? s.palette!.bg : undefined,
    ink: isHex(s.palette?.ink) ? s.palette!.ink : undefined,
    accent: isHex(s.palette?.accent) ? s.palette!.accent : undefined,
  };
  if (s.params !== undefined) out.params = sanitizeParams(s.params);
  return out.preset || out.palette.bg || out.palette.ink || out.palette.accent || out.params ? out : null;
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
