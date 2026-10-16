/**
 * OMNIVOID LABS - Automatic link-preview picture
 *
 * GET /api/share-image  ->  1200x630 PNG: the current logo (with its tint) on the chosen background.
 * Built fresh from the branding settings, so changing the logo or its colour in the admin changes
 * what gets shared, with no one having to make a picture by hand.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BRANDING_KEY, resolveBranding } from '@/lib/branding';
import { renderShareImage } from '@/lib/shareImage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const row = await prisma.siteSettings.findUnique({ where: { key: BRANDING_KEY } }).catch(() => null);
    const png = await renderShareImage(resolveBranding(row?.value));

    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        // The page links here with ?v=<settings version>, so a long cache is safe
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('[api] Share image failed:', error);
    return NextResponse.redirect(new URL('/share-image.png', request.url), 302);
  }
}
