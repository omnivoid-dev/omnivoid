/**
 * OMNIVOID LABS - Admin Performers API
 * GET  /api/admin/performers?editionId=   List performers (all editions if omitted)
 * POST /api/admin/performers              Add a performer to an edition
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const editionId = new URL(request.url).searchParams.get('editionId');
    const performers = await prisma.performer.findMany({
      where: editionId ? { editionId } : undefined,
      orderBy: [{ name: 'asc' }],
      include: { edition: { select: { name: true } } },
    });
    return NextResponse.json({ success: true, data: performers });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch performers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const { editionId, name, instagram, youtube } = await request.json();
    if (!editionId || !name?.trim()) {
      return NextResponse.json({ success: false, error: 'editionId and name are required' }, { status: 400 });
    }

    const count = await prisma.performer.count({ where: { editionId } });
    const performer = await prisma.performer.create({
      data: {
        editionId,
        name: name.trim(),
        instagram: instagram?.trim() || null,
        youtube: youtube?.trim() || null,
        sortOrder: count,
      },
    });
    return NextResponse.json({ success: true, data: performer });
  } catch (error: any) {
    console.error('Error creating performer:', error);
    return NextResponse.json({ success: false, error: 'Failed to create performer', details: error?.message }, { status: 500 });
  }
}
