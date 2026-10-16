/**
 * OMNIVOID LABS - Public branding (logo, tint, menu names)
 *
 * A tiny read of one settings row, so the splash screen can show the right logo
 * straight away instead of waiting for the full /api/content payload.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BRANDING_KEY, resolveBranding } from '@/lib/branding';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const row = await prisma.siteSettings.findUnique({ where: { key: BRANDING_KEY } });
    return NextResponse.json(
      { success: true, data: resolveBranding(row?.value) },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } }
    );
  } catch (error) {
    console.error('[api] Failed to read branding:', error);
    return NextResponse.json({ success: false, error: 'Failed to read branding' }, { status: 500 });
  }
}
