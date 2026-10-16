/**
 * OMNIVOID LABS - Image upload with server-side WebP optimisation
 *
 * POST /api/admin/images   multipart/form-data: file, kind = "thumbnail" | "poster"
 *
 * The file passes through this serverless function, so the size limit is enforced
 * here (not just trusted from the browser). The image is auto-rotated, resized,
 * converted to WebP and stored in Supabase Storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { verifyAdminToken } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MB = 1024 * 1024;

// Posters stay under Vercel's 4.5MB request-body cap.
type Kind = { folder: string; maxBytes: number; maxSide: number; quality: number; format?: 'webp' | 'jpeg'; cover?: [number, number] };
const KINDS: Record<string, Kind> = {
  thumbnail: { folder: 'thumbnails', maxBytes: 3 * MB, maxSide: 800, quality: 80 },
  poster: { folder: 'posters', maxBytes: 4 * MB, maxSide: 1600, quality: 82 },
  gallery: { folder: 'edition-gallery', maxBytes: 4 * MB, maxSide: 2000, quality: 80 },
  // Link-preview picture: exactly 1200x630, and JPEG because not every platform shows WebP
  share: { folder: 'branding', maxBytes: 4 * MB, maxSide: 1200, quality: 85, format: 'jpeg', cover: [1200, 630] },
};

const ALLOWED_FORMATS = ['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'heif'];

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });

    const form = await request.formData();
    const file = form.get('file');
    const kind = (form.get('kind') as string) || 'thumbnail';
    const cfg = KINDS[kind];

    if (!cfg) return NextResponse.json({ success: false, error: 'Unknown image kind' }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    if (file.size > cfg.maxBytes) {
      return NextResponse.json(
        { success: false, error: `Image is ${(file.size / MB).toFixed(1)}MB. The limit is ${cfg.maxBytes / MB}MB.` },
        { status: 413 }
      );
    }

    const input = Buffer.from(await file.arrayBuffer());

    // Trust the bytes, not the declared type
    let format: string | undefined;
    try {
      format = (await sharp(input).metadata()).format;
    } catch {
      /* handled below */
    }
    if (!format || !ALLOWED_FORMATS.includes(format)) {
      return NextResponse.json({ success: false, error: 'That file is not a supported image (JPG, PNG, WebP, GIF, AVIF).' }, { status: 415 });
    }

    const pipeline = sharp(input).rotate();
    if (cfg.cover) pipeline.resize({ width: cfg.cover[0], height: cfg.cover[1], fit: 'cover', position: 'centre' });
    else pipeline.resize({ width: cfg.maxSide, height: cfg.maxSide, fit: 'inside', withoutEnlargement: true });
    const isJpeg = cfg.format === 'jpeg';
    if (isJpeg) pipeline.flatten({ background: '#050505' }); // JPEG has no transparency
    const output = await (isJpeg ? pipeline.jpeg({ quality: cfg.quality, mozjpeg: true }) : pipeline.webp({ quality: cfg.quality })).toBuffer();

    const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'image';
    const ext = isJpeg ? 'jpg' : 'webp';
    const path = `${cfg.folder}/${Date.now()}_${base}.${ext}`;

    const storage = createAdminClient().storage.from(BUCKET);
    const { error } = await storage.upload(path, output, { contentType: isJpeg ? 'image/jpeg' : 'image/webp', upsert: false });
    if (error) {
      return NextResponse.json({ success: false, error: 'Upload to storage failed', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      publicUrl: storage.getPublicUrl(path).data.publicUrl,
      path,
      originalBytes: file.size,
      bytes: output.length,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json({ success: false, error: 'Image processing failed', details: error?.message }, { status: 500 });
  }
}
