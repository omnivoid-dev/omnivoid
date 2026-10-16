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

/** How the site looks when a link is shared (WhatsApp, Facebook, X, Google...). */
export interface ShareSettings {
  /** Empty = the default title below */
  title: string;
  /** Empty = the default description below */
  description: string;
  /** auto = the logo (with its tint) on a plain background, made fresh whenever the logo changes; custom = an uploaded picture */
  imageMode: 'auto' | 'custom';
  imageUrl: string | null;
  /** Background colour of the automatic image */
  background: string;
}

export interface SiteBranding {
  logo: { url: string | null; tint: Tint };
  share: ShareSettings;
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

export const SHARE_DEFAULT_TITLE = 'OMNIVOID LABS - Experimental Sound & Visual Art Platform';
export const SHARE_DEFAULT_DESCRIPTION =
  'Explore the intersection of sound science, technology, and consciousness through immersive audio-visual experiences. Discover research papers, live transmissions, and experimental art at OMNIVOID LABS.';

export const DEFAULT_SHARE: ShareSettings = { title: '', description: '', imageMode: 'auto', imageUrl: null, background: '#050505' };

export const DEFAULT_BRANDING: SiteBranding = {
  logo: { url: null, tint: DEFAULT_TINT },
  share: DEFAULT_SHARE,
  icons: {},
  iconTint: DEFAULT_TINT,
  labels: {},
};

/** Menu sections that carry an icon, with the built-in image (if the original project had one). */
export const MENU_ICON_SLOTS: { id: string; label: string; defaultUrl: string | null; fallback: string }[] = [
  { id: 'research', label: 'Research', defaultUrl: '/menuicons/research.png', fallback: '📚' },
  { id: 'latest', label: 'Latest Ritual', defaultUrl: '/menuicons/gigs.png', fallback: '★' },
  { id: 'rituals', label: 'Editions', defaultUrl: '/menuicons/gigs.png', fallback: '🎸' },
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
    share: {
      title: typeof s.share?.title === 'string' ? s.share.title : '',
      description: typeof s.share?.description === 'string' ? s.share.description : '',
      imageMode: s.share?.imageMode === 'custom' && s.share.imageUrl ? 'custom' : 'auto',
      imageUrl: s.share?.imageUrl || null,
      background: /^#[0-9a-fA-F]{6}$/.test(s.share?.background || '') ? (s.share!.background as string) : DEFAULT_SHARE.background,
    },
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
