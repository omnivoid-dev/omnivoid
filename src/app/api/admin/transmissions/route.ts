/**
 * OMNIVOID LABS - Admin Transmissions API (YouTube videos)
 * GET  /api/admin/transmissions   List all, with edition + performer
 * POST /api/admin/transmissions   Create one
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { getYouTubeId, youtubeThumbnail } from '@/lib/youtube';

export async function GET() {
  try {
    const data = await prisma.transmission.findMany({
      orderBy: [{ edition: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      include: {
        edition: { select: { id: true, name: true } },
        performer: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch transmissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    if (!body.editionId || !body.url) {
      return NextResponse.json({ success: false, error: 'Edition and URL are required' }, { status: 400 });
    }

    const youtubeId = getYouTubeId(body.url);
    const data = await prisma.transmission.create({
      data: {
        editionId: body.editionId,
        performerId: body.performerId || null,
        title: body.title?.trim() || body.originalTitle?.trim() || 'YouTube Transmission',
        originalTitle: body.originalTitle?.trim() || null,
        url: body.url.trim(),
        youtubeId,
        thumbnailUrl: youtubeThumbnail(youtubeId),
        kind: body.kind || 'SET',
        isActive: body.isActive ?? true,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating transmission:', error);
    return NextResponse.json({ success: false, error: 'Failed to create transmission', details: error?.message }, { status: 500 });
  }
}
