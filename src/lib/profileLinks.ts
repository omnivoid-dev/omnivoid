/**
 * Socials and related links for profiles (performers, collaborators, affiliates).
 *
 * Instagram, YouTube and Website are real columns on Profile; the other networks live in the `socials` JSON
 * (key -> handle or URL). `links` is a JSON array of related links ({ label, url }).
 * Every URL is validated to http(s) before it is stored or rendered, so profile data can never inject a
 * `javascript:` link.
 */

export interface RelatedLink {
  label: string;
  url: string;
}

export interface SocialNetwork {
  key: string;
  label: string;
  placeholder: string;
  /** Accepts "@handle" and turns it into a URL on this network. */
  handleBase?: string;
  /** Stored in a column rather than the `socials` JSON. */
  column?: boolean;
}

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { key: 'website', label: 'Website', placeholder: 'https://...', column: true },
  { key: 'instagram', label: 'Instagram', placeholder: '@handle', handleBase: 'https://instagram.com/', column: true },
  { key: 'youtube', label: 'YouTube', placeholder: '@handle or URL', handleBase: 'https://youtube.com/@', column: true },
  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
  { key: 'bandcamp', label: 'Bandcamp', placeholder: 'https://name.bandcamp.com' },
  { key: 'mixcloud', label: 'Mixcloud', placeholder: 'https://mixcloud.com/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'x', label: 'X / Twitter', placeholder: '@handle', handleBase: 'https://x.com/' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@handle', handleBase: 'https://tiktok.com/@' },
];

/** The extra networks stored in the socials JSON (everything that is not a column). */
export const JSON_SOCIAL_KEYS = SOCIAL_NETWORKS.filter((n) => !n.column).map((n) => n.key);

/** A safe absolute http(s) URL, or null. Bare domains ("foo.com/bar") get https://. */
export function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > 500) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(value) ? `https://${value}` : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Turn what an admin typed for a network ("@handle" or a URL) into a link. */
export function socialUrl(network: SocialNetwork, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const url = safeUrl(value);
  if (url) return url;
  if (network.handleBase && /^@?[A-Za-z0-9._-]+$/.test(value)) return `${network.handleBase}${value.replace(/^@/, '')}`;
  return null;
}

export interface SocialLink {
  key: string;
  label: string;
  url: string;
}

/** All of a profile's valid social links, in a fixed order, from the columns plus the socials JSON. */
export function profileSocials(profile: {
  website?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  socials?: unknown;
}): SocialLink[] {
  const extra = (profile.socials && typeof profile.socials === 'object' ? profile.socials : {}) as Record<string, unknown>;
  const out: SocialLink[] = [];
  for (const network of SOCIAL_NETWORKS) {
    const raw = network.column ? (profile as Record<string, unknown>)[network.key] : extra[network.key];
    if (typeof raw !== 'string') continue;
    const url = socialUrl(network, raw);
    if (url) out.push({ key: network.key, label: network.label, url });
  }
  return out;
}

/** Valid related links only, trimmed and capped. */
export function sanitizeLinks(input: unknown): RelatedLink[] {
  if (!Array.isArray(input)) return [];
  const out: RelatedLink[] = [];
  for (const item of input) {
    const url = safeUrl((item as RelatedLink)?.url);
    const label = typeof (item as RelatedLink)?.label === 'string' ? (item as RelatedLink).label.trim().slice(0, 80) : '';
    if (url) out.push({ label: label || new URL(url).hostname.replace(/^www\./, ''), url });
    if (out.length >= 12) break;
  }
  return out;
}

/** Only the extra networks, each kept only if it resolves to a valid link. Stored as typed (handle or URL). */
export function sanitizeSocials(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, string> = {};
  for (const network of SOCIAL_NETWORKS) {
    if (network.column) continue;
    const raw = (input as Record<string, unknown>)[network.key];
    if (typeof raw === 'string' && socialUrl(network, raw)) out[network.key] = raw.trim();
  }
  return out;
}

/** Public path of a profile page (the crawlable one). */
export function profilePath(type: 'PERFORMER' | 'COLLABORATOR' | 'AFFILIATE', slug: string): string {
  const segment = type === 'PERFORMER' ? 'performers' : type === 'COLLABORATOR' ? 'collaborators' : 'affiliates';
  return `/${segment}/${slug}`;
}
