/**
 * OMNIVOID LABS - Admin Edition Specific API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const edition = await prisma.edition.findUnique({
      where: { id: params.id },
    });

    if (!edition) {
      return NextResponse.json({ success: false, error: 'Edition not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: edition });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch edition' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();

    if (body.eventDate) {
      body.eventDate = new Date(body.eventDate);
    }

    // If setting as Latest Ritual, unset other editions first
    if (body.isLatestRitual) {
      await prisma.edition.updateMany({
        where: { id: { not: params.id } },
        data: { isLatestRitual: false },
      });
    }

    const edition = await prisma.edition.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({ success: true, data: edition, message: 'Edition updated successfully' });
  } catch (error: any) {
    console.error('Error updating edition:', error);
    return NextResponse.json({ success: false, error: 'Failed to update edition', details: error?.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    await prisma.edition.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: 'Edition deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete edition' }, { status: 500 });
  }
}
