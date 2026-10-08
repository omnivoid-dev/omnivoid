/**
 * OMNIVOID LABS - Admin Resources API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const editionId = searchParams.get('editionId');

    const where: any = {};
    if (type) where.type = type;
    if (editionId) where.editionId = editionId;

    const resources = await prisma.resource.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        edition: { select: { name: true } },
        performer: { select: { name: true } }
      }
    });

    return NextResponse.json({ success: true, data: resources });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch resources' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    const { editionId, performerId, type, title, description, url, filePath, thumbnailUrl, metadata, sortOrder, isFeatured, isActive } = body;

    if (!editionId || !type || !title) {
      return NextResponse.json({ success: false, error: 'EditionId, Type, and Title are required' }, { status: 400 });
    }

    const resource = await prisma.resource.create({
      data: {
        editionId,
        performerId: performerId || null,
        type,
        title,
        description,
        url,
        filePath,
        thumbnailUrl,
        metadata: metadata || {},
        sortOrder: sortOrder || 0,
        isFeatured: isFeatured || false,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ success: true, data: resource, message: 'Resource created successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create resource' }, { status: 500 });
  }
}
