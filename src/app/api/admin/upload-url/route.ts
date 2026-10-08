/**
 * OMNIVOID LABS - Signed Upload URL Generator for Supabase Storage
 * 
 * Allows direct browser uploads to Supabase Storage, bypassing Vercel body limits.
 * POST /api/admin/upload-url
 * Body: { bucket?: string, filename: string, contentType?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bucket = 'media', filename, contentType = '', size } = body;

    // Size limits by file type. `size` is the size the browser declares; the browser checks it too.
    const MB = 1024 * 1024;
    const limit =
      contentType === 'application/pdf' ? 10 * MB
      : contentType === 'image/svg+xml' ? 1 * MB
      : contentType.startsWith('image/') ? 8 * MB
      : contentType.startsWith('audio/') ? 50 * MB
      : null;
    if (limit && typeof size === 'number' && size > limit) {
      return NextResponse.json(
        { success: false, error: `File too large. Max ${limit / MB}MB for this file type.` },
        { status: 413 }
      );
    }
    if (contentType === 'application/pdf' && typeof size !== 'number') {
      return NextResponse.json({ success: false, error: 'File size is required for PDF uploads' }, { status: 400 });
    }

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Ensure bucket exists or create if missing
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === bucket);
    
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(bucket, {
        public: true, // Allow public reads for media
      });
    }

    // Generate unique storage path
    // Keep a leading folder (so cleanup can find managed files); sanitise the rest
    const ALLOWED_FOLDERS = ['audio', 'research', 'posters', 'thumbnails', 'branding'];
    const [first, ...rest] = String(filename).split('/');
    const folder = rest.length > 0 && ALLOWED_FOLDERS.includes(first) ? `${first}/` : '';
    const cleanFilename = (folder ? rest.join('_') : String(filename)).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${folder}${Date.now()}_${cleanFilename}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error('Error creating signed upload URL:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create signed upload URL', details: error?.message },
        { status: 500 }
      );
    }

    // Get public URL for the file once uploaded
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      path: storagePath,
      bucket,
      publicUrl: publicUrlData.publicUrl,
      token: data.token,
    });
  } catch (error: any) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
