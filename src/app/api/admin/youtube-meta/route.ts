/**
 * GET /api/admin/youtube-meta?url=...  Fetch the original YouTube title via oEmbed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { getYouTubeId } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminToken(request);
  if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

  const url = new URL(request.url).searchParams.get('url') || '';
  const id = getYouTubeId(url);
  if (!id) return NextResponse.json({ success: false, error: 'Not a YouTube URL' }, { status: 400 });

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`
    );
    if (!res.ok) throw new Error(`oEmbed ${res.status}`);
    const meta = await res.json();
    return NextResponse.json({ success: true, data: { title: meta.title, author: meta.author_name, youtubeId: id } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Could not fetch video title', details: error?.message }, { status: 502 });
  }
}
