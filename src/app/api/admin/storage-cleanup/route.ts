/**
 * OMNIVOID LABS - Unused file cleanup
 *
 * GET  /api/admin/storage-cleanup   Dry run: list files nothing references (older than 24h)
 * POST /api/admin/storage-cleanup   Delete them
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { purgeOrphans, scanOrphans } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

  try {
    const orphans = await scanOrphans();
    return NextResponse.json({
      success: true,
      data: { count: orphans.length, bytes: orphans.reduce((n, o) => n + o.size, 0), files: orphans },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Scan failed', details: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

  try {
    return NextResponse.json({ success: true, data: await purgeOrphans() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Purge failed', details: error?.message }, { status: 500 });
  }
}
