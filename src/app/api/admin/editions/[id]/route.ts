/**
 * OMNIVOID LABS - Admin Edition Specific API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { saveEdition, editionInclude } from '@/lib/editions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const edition = await prisma.edition.findUnique({
      where: { id: params.id },
      include: editionInclude,
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
    const edition = await saveEdition(params.id, body);

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
