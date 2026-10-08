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

export interface StoredTheme {
  preset?: string;
  palette?: Partial<ThemePalette>;
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
export function resolveTheme(stored: unknown): { id: string | null; label: string; palette: ThemePalette } | null {
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
  return { id: preset?.id ?? null, label: preset?.label ?? 'Custom', palette };
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
  return out.preset || out.palette.bg || out.palette.ink || out.palette.accent ? out : null;
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
