/** Mixcloud helpers shared by the admin, API and public widget. */

export function isMixcloudUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('mixcloud.com');
  } catch {
    return false;
  }
}

/** "/omnivoidlabs/show-slug/" - the path the widget feed parameter expects. */
export function mixcloudFeedPath(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.endsWith('/') ? path : `${path}/`;
  } catch {
    return url;
  }
}

export function mixcloudEmbedSrc(url: string, autoplay = false): string {
  const feed = encodeURIComponent(mixcloudFeedPath(url));
  return `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=0${autoplay ? '&autoplay=1' : ''}&feed=${feed}`;
}

export interface MixcloudMeta {
  title: string;
  author: string | null;
  thumbnailUrl: string | null;
}

/** Server-side: title, author and cover art via the Mixcloud oEmbed endpoint. */
export async function fetchMixcloudMeta(url: string): Promise<MixcloudMeta> {
  const res = await fetch(`https://app.mixcloud.com/oembed/?url=${encodeURIComponent(url)}&format=json`);
  if (!res.ok) throw new Error(`Mixcloud oEmbed ${res.status}`);
  const m = await res.json();
  return { title: m.title, author: m.author_name ?? null, thumbnailUrl: m.image ?? null };
}
