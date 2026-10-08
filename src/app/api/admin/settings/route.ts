/**
 * OMNIVOID LABS - Admin Site Settings API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';
import { deleteIfUnreferenced, pathsInValue } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.siteSettings.findMany();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const body = await request.json();
    const { key, value } = body;

    const before = await prisma.siteSettings.findUnique({ where: { key } });
    const setting = await prisma.siteSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    // Branding files that were replaced or reset are purged once unreferenced
    await deleteIfUnreferenced(pathsInValue(before?.value));
    return NextResponse.json({ success: true, data: setting, message: 'Setting saved successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save setting' }, { status: 500 });
  }
}
