/**
 * PATCH /api/admin/editions/[id]/theme
 * Update only an edition's theme (preset, palette, tuned effect parameters), merged into what is stored.
 * Everything else on the edition (performers, videos, posters...) is left alone, unlike the full save.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { sanitizeStoredTheme, type StoredTheme } from '@/lib/themes';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const patch = (await request.json()) as StoredTheme;
    const edition = await prisma.edition.findUnique({ where: { id: params.id }, select: { themeColors: true } });
    if (!edition) return NextResponse.json({ success: false, error: 'Edition not found' }, { status: 404 });

    const existing = (edition.themeColors && typeof edition.themeColors === 'object' ? edition.themeColors : {}) as StoredTheme;
    const merged: StoredTheme = {
      ...existing,
      ...patch,
      palette: { ...(existing.palette || {}), ...(patch.palette || {}) },
    };

    const theme = sanitizeStoredTheme(merged, existing);
    const saved = await prisma.edition.update({
      where: { id: params.id },
      data: { themeColors: theme ? (theme as Prisma.InputJsonValue) : Prisma.DbNull },
      select: { themeColors: true },
    });
    return NextResponse.json({ success: true, data: saved.themeColors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to save theme', details: error?.message }, { status: 500 });
  }
}
