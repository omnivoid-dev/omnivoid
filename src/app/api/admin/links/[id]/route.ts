/**
 * OMNIVOID LABS - Admin Link Specific API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const link = await prisma.link.findUnique({
      where: { id: params.id },
    });

    if (!link) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    console.error('[api] Failed to fetch link:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch link' }, { status: 500 });
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
    const link = await prisma.link.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({ success: true, data: link, message: 'Link updated successfully' });
  } catch (error) {
    console.error('[api] Failed to update link:', error);
    return NextResponse.json({ success: false, error: 'Failed to update link' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    await prisma.link.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    console.error('[api] Failed to delete link:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete link' }, { status: 500 });
  }
}
