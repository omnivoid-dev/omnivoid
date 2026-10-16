/**
 * OMNIVOID LABS - Admin Playlists API (hand-made track lists for the audio player)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { cleanIds, playlistInclude } from '@/lib/playlists';

const clean = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

export async function GET() {
  try {
    const data = await prisma.playlist.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: playlistInclude,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[api] Failed to fetch playlists:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    const name = clean(body.name);
    if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    const ids = cleanIds(body.resourceIds);

    const data = await prisma.playlist.create({
      data: {
        name,
        description: clean(body.description),
        isActive: body.isActive ?? true,
        sortOrder: Number(body.sortOrder) || 0,
        items: { create: ids.map((resourceId, i) => ({ resourceId, sortOrder: i })) },
      },
      include: playlistInclude,
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[api] Failed to create playlist:', error);
    return NextResponse.json({ success: false, error: 'Failed to create playlist', details: error?.message }, { status: 500 });
  }
}
