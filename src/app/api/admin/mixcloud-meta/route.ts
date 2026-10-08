/** GET /api/admin/mixcloud-meta?url=...  Title, author and cover art for a Mixcloud show. */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { fetchMixcloudMeta, isMixcloudUrl } from '@/lib/mixcloud';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

  const url = new URL(request.url).searchParams.get('url') || '';
  if (!isMixcloudUrl(url)) return NextResponse.json({ success: false, error: 'Not a Mixcloud URL' }, { status: 400 });

  try {
    return NextResponse.json({ success: true, data: await fetchMixcloudMeta(url) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Could not fetch show details', details: error?.message }, { status: 502 });
  }
}
