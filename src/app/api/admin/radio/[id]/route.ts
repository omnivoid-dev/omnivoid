import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'originalTitle', 'url', 'thumbnailUrl', 'author', 'isActive']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
    if (body.editionId !== undefined) data.editionId = body.editionId || null;
    if (body.performerId !== undefined) data.performerId = body.performerId || null;

    const updated = await prisma.radioShow.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to update radio show', details: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    await prisma.radioShow.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete radio show' }, { status: 500 });
  }
}
