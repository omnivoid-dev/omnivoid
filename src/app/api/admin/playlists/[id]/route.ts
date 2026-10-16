import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { cleanIds, playlistInclude } from '@/lib/playlists';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
      data.name = name;
    }
    if (body.description !== undefined) data.description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

    // When resourceIds is sent, it is the full ordered track list
    const ids = body.resourceIds !== undefined ? cleanIds(body.resourceIds) : null;

    const saved = await prisma.$transaction(
      async (tx) => {
        await tx.playlist.update({ where: { id: params.id }, data });
        if (ids) {
          await tx.playlistItem.deleteMany({ where: { playlistId: params.id } });
          if (ids.length) await tx.playlistItem.createMany({ data: ids.map((resourceId, i) => ({ playlistId: params.id, resourceId, sortOrder: i })) });
        }
        return tx.playlist.findUniqueOrThrow({ where: { id: params.id }, include: playlistInclude });
      },
      { maxWait: 10_000, timeout: 60_000 }
    );
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    console.error('[api] Failed to update playlist:', error);
    return NextResponse.json({ success: false, error: 'Failed to update playlist', details: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    await prisma.playlist.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api] Failed to delete playlist:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete playlist' }, { status: 500 });
  }
}
