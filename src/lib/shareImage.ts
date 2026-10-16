/**
 * Renders the automatic link-preview picture: the logo (with its tint) centred on a background colour, 1200x630.
 * Pure function of the branding settings, so it can be tested without the database.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { DEFAULT_LOGO_URL, type SiteBranding, type Tint } from '@/lib/branding';

const W = 1200;
const H = 630;
// The logo fills at most this much of the picture, leaving a clear margin
const LOGO_BOX = { w: 760, h: 400 };

async function loadLogo(url: string | null): Promise<Buffer> {
  if (url && /^https?:\/\//.test(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Logo fetch failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(process.cwd(), 'public', (url || DEFAULT_LOGO_URL).replace(/^\//, '')));
}

/** A solid or gradient fill the size of the logo, as an SVG (angle follows the CSS convention). */
function fillSvg(tint: Tint, w: number, h: number): string {
  if (tint.mode === 'gradient') {
    const a = (tint.angle * Math.PI) / 180;
    const dx = Math.sin(a) / 2;
    const dy = -Math.cos(a) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="${0.5 - dx}" y1="${0.5 - dy}" x2="${0.5 + dx}" y2="${0.5 + dy}"><stop offset="0" stop-color="${tint.color}"/><stop offset="1" stop-color="${tint.color2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${tint.color}"/></svg>`;
}

export async function renderShareImage(branding: SiteBranding): Promise<Buffer> {
  const { tint } = branding.logo;
  const source = await loadLogo(branding.logo.url);
  // Rasterise at a high density so SVG logos stay sharp, then fit inside the box
  const logo = await sharp(source, { density: 300 })
    .resize({ width: LOGO_BOX.w, height: LOGO_BOX.h, fit: 'inside' })
    .ensureAlpha()
    .png()
    .toBuffer({ resolveWithObject: true });

  let mark = logo.data;
  if (tint.mode !== 'none') {
    // Same idea as the site: the logo's alpha is the shape, filled with the tint
    mark = await sharp(Buffer.from(fillSvg(tint, logo.info.width, logo.info.height)))
      .composite([{ input: logo.data, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  return sharp({ create: { width: W, height: H, channels: 3, background: branding.share.background } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
