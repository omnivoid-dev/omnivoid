/**
 * OMNIVOID LABS - Admin Profiles API (performers, collaborators, affiliates)
 * GET  /api/admin/profiles?type=PERFORMER|COLLABORATOR|AFFILIATE
 * POST /api/admin/profiles
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { uniqueSlug, ProfileKind } from '@/lib/profiles';

const TYPES: ProfileKind[] = ['PERFORMER', 'COLLABORATOR', 'AFFILIATE'];
const clean = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

export async function GET(request: NextRequest) {
  try {
    const type = new URL(request.url).searchParams.get('type') as ProfileKind | null;
    const data = await prisma.profile.findMany({
      where: type && TYPES.includes(type) ? { type } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { performers: { select: { edition: { select: { id: true, name: true } } } } },
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch profiles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    if (!TYPES.includes(body.type)) return NextResponse.json({ success: false, error: 'Invalid profile type' }, { status: 400 });
    if (!body.name?.trim()) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });

    const data = await prisma.profile.create({
      data: {
        type: body.type,
        name: body.name.trim(),
        slug: await uniqueSlug(prisma, body.type, body.name),
        role: clean(body.role),
        bio: clean(body.bio),
        imageUrl: clean(body.imageUrl),
        website: clean(body.website),
        instagram: clean(body.instagram),
        youtube: clean(body.youtube),
        isActive: body.isActive ?? true,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    return NextResponse.json({ success: false, error: 'Failed to create profile', details: error?.message }, { status: 500 });
  }
}
