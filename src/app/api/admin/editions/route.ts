/**
 * OMNIVOID LABS - Admin Editions API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { saveEdition, editionInclude } from '@/lib/editions';

export async function GET(request: NextRequest) {
  try {
    const editions = await prisma.edition.findMany({
      include: editionInclude,
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
    if (!body.name || !body.slug) {
      return NextResponse.json({ success: false, error: 'Name and Slug are required' }, { status: 400 });
    }

    const edition = await saveEdition(null, body);
    return NextResponse.json({ success: true, data: edition, message: 'Edition created successfully' });
  } catch (error: any) {
    console.error('Error creating edition:', error);
    return NextResponse.json({ success: false, error: 'Failed to create edition', details: error?.message || String(error) }, { status: 500 });
  }
}
