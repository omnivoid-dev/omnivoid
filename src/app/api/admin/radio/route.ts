/**
 * OMNIVOID LABS - Admin Radio API (Mixcloud shows)
 * GET  /api/admin/radio   List all
 * POST /api/admin/radio   Create one (thumbnail/author are fetched from Mixcloud when not supplied)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { fetchMixcloudMeta, isMixcloudUrl } from '@/lib/mixcloud';

export async function GET() {
  try {
    const data = await prisma.radioShow.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        edition: { select: { id: true, name: true } },
        performer: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch radio shows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    if (!body.url || !isMixcloudUrl(body.url)) {
      return NextResponse.json({ success: false, error: 'A Mixcloud URL is required' }, { status: 400 });
    }

    let { originalTitle, thumbnailUrl, author } = body;
    if (!thumbnailUrl || !originalTitle) {
      try {
        const meta = await fetchMixcloudMeta(body.url);
        originalTitle = originalTitle || meta.title;
        thumbnailUrl = thumbnailUrl || meta.thumbnailUrl;
        author = author || meta.author;
      } catch {
        /* the admin can still save with a manual name */
      }
    }

    const data = await prisma.radioShow.create({
      data: {
        title: body.title?.trim() || originalTitle || 'Radio Show',
        originalTitle: originalTitle || null,
        url: body.url.trim(),
        thumbnailUrl: thumbnailUrl || null,
        author: author || null,
        editionId: body.editionId || null,
        performerId: body.performerId || null,
        isActive: body.isActive ?? true,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating radio show:', error);
    return NextResponse.json({ success: false, error: 'Failed to create radio show', details: error?.message }, { status: 500 });
  }
}
