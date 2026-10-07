/**
 * OMNIVOID LABS - Admin Editions API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const editions = await prisma.edition.findMany({
      orderBy: [{ isLatestRitual: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: editions });
  } catch (error: any) {
    console.error('Error fetching editions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch editions', details: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    const {
      name,
      slug,
      description,
      posterUrl,
      workshopPosterUrl,
      eventDate,
      artists,
      youtubeLinks,
      isLatestRitual,
      isActive,
      sortOrder,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'Name and Slug are required' }, { status: 400 });
    }

    // If marked as Latest Ritual, unset other editions
    if (isLatestRitual) {
      await prisma.edition.updateMany({
        data: { isLatestRitual: false },
      });
    }

    const edition = await prisma.edition.create({
      data: {
        name,
        slug,
        description,
        posterUrl,
        workshopPosterUrl,
        eventDate: eventDate ? new Date(eventDate) : null,
        artists: artists || [],
        youtubeLinks: youtubeLinks || [],
        isLatestRitual: !!isLatestRitual,
        isActive: isActive ?? true,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({ success: true, data: edition, message: 'Edition created successfully' });
  } catch (error: any) {
    console.error('Error creating edition:', error);
    return NextResponse.json({ success: false, error: 'Failed to create edition', details: error?.message || String(error) }, { status: 500 });
  }
}
