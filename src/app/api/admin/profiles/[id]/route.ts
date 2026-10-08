import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { uniqueSlug } from '@/lib/profiles';
import { deleteIfUnreferenced } from '@/lib/storage';

const clean = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    const before = await prisma.profile.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      data.name = String(body.name).trim();
      if (data.name !== before.name) data.slug = await uniqueSlug(prisma, before.type, data.name as string, before.id);
    }
    for (const k of ['role', 'bio', 'imageUrl', 'website', 'instagram', 'youtube']) {
      if (body[k] !== undefined) data[k] = clean(body[k]);
    }
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

    const updated = await prisma.profile.update({ where: { id: params.id }, data });
    await deleteIfUnreferenced([before.imageUrl]);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to update profile', details: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const before = await prisma.profile.findUnique({ where: { id: params.id }, select: { imageUrl: true } });
    await prisma.profile.delete({ where: { id: params.id } });
    await deleteIfUnreferenced([before?.imageUrl]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete profile' }, { status: 500 });
  }
}
