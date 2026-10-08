/**
 * Site branding: the main logo and the menu icons, each replaceable and tintable.
 * Stored as one SiteSettings row (key "siteBranding"); the defaults live here.
 */

export interface Tint {
  mode: 'none' | 'solid' | 'gradient';
  color: string;
  color2: string;
  angle: number; // degrees, gradient only
}

export interface SiteBranding {
  logo: { url: string | null; tint: Tint };
  /** Per-section icon overrides (section id -> image URL). Missing = built-in icon. */
  icons: Record<string, string>;
  /** One tint applied to every menu icon. */
  iconTint: Tint;
  /** Per-section menu names (section id -> label). Missing = built-in name. */
  labels: Record<string, string>;
}

export const BRANDING_KEY = 'siteBranding';

export const DEFAULT_LOGO_URL = '/logo.svg';
export const LOGO_ASPECT = 878.75 / 739.99;

export const DEFAULT_TINT: Tint = { mode: 'none', color: '#99ccff', color2: '#336699', angle: 135 };

export const DEFAULT_BRANDING: SiteBranding = {
  logo: { url: null, tint: DEFAULT_TINT },
  icons: {},
  iconTint: DEFAULT_TINT,
  labels: {},
};

/** Menu sections that carry an icon, with the built-in image (if the original project had one). */
export const MENU_ICON_SLOTS: { id: string; label: string; defaultUrl: string | null; fallback: string }[] = [
  { id: 'research', label: 'Research', defaultUrl: '/menuicons/research.png', fallback: '📚' },
  { id: 'rituals', label: 'Rituals', defaultUrl: '/menuicons/gigs.png', fallback: '🎸' },
  { id: 'transmissions', label: 'Transmissions', defaultUrl: '/menuicons/livetransmissions.png', fallback: '📡' },
  { id: 'radio', label: 'Radio', defaultUrl: '/menuicons/radio.png', fallback: '📻' },
  { id: 'gallery', label: 'Gallery', defaultUrl: '/menuicons/gallery.png', fallback: '🖼️' },
  { id: 'labs', label: 'Labs', defaultUrl: null, fallback: '🧪' },
  { id: 'performers', label: 'Performers', defaultUrl: null, fallback: '🎤' },
  { id: 'collaborators', label: 'Collaborators', defaultUrl: null, fallback: '🤝' },
  { id: 'affiliates', label: 'Affiliates', defaultUrl: null, fallback: '🏢' },
  { id: 'conundrum', label: 'Conundrum', defaultUrl: '/menuicons/conundrum.png', fallback: '🧩' },
  { id: 'contact', label: 'Contact', defaultUrl: '/menuicons/contact.png', fallback: '📧' },
];

const tintDefaults = (t?: Partial<Tint> | null): Tint => ({ ...DEFAULT_TINT, ...(t || {}) });

/** Merge a stored (possibly partial or missing) value over the defaults. */
export function resolveBranding(stored: unknown): SiteBranding {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<SiteBranding>;
  return {
    logo: { url: s.logo?.url || null, tint: tintDefaults(s.logo?.tint) },
    icons: s.icons || {},
    iconTint: tintDefaults(s.iconTint),
    labels: s.labels || {},
  };
}

/** CSS `background` value for a tint, or undefined when no tint is set. */
export function tintBackground(t: Tint): string | undefined {
  if (t.mode === 'solid') return t.color;
  if (t.mode === 'gradient') return `linear-gradient(${t.angle}deg, ${t.color}, ${t.color2})`;
  return undefined;
}

export function iconUrlFor(branding: SiteBranding, sectionId: string): string | null {
  return branding.icons[sectionId] || MENU_ICON_SLOTS.find((s) => s.id === sectionId)?.defaultUrl || null;
}

/** Menu name for a section: the admin override, else the built-in label. */
export function menuLabelFor(branding: SiteBranding, sectionId: string): string {
  const custom = branding.labels[sectionId]?.trim();
  return custom || MENU_ICON_SLOTS.find((s) => s.id === sectionId)?.label.toUpperCase() || sectionId.toUpperCase();
}
