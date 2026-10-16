/**
 * Browser-side upload to Supabase Storage via the signed-URL route.
 * The server enforces per-type size limits (PDF 10MB, SVG 1MB, images 8MB, audio 50MB).
 */

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function uploadToStorage(
  file: File,
  folder: string,
  contentTypeOverride?: string
): Promise<{ publicUrl: string; path: string }> {
  const contentType = contentTypeOverride || file.type || 'application/octet-stream';
  const filename = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const urlRes = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket: 'media', filename, contentType, size: file.size }),
  });
  const urlData = await urlRes.json();
  if (!urlData.success || !urlData.signedUrl) throw new Error(urlData.error || 'Could not get upload URL');

  const up = await fetch(urlData.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!up.ok) throw new Error(`Upload failed (${up.status})`);

  return { publicUrl: urlData.publicUrl, path: urlData.path };
}

export const MAX_THUMBNAIL_BYTES = 3 * 1024 * 1024;
export const MAX_POSTER_BYTES = 4 * 1024 * 1024;

export interface ImageUploadResult {
  publicUrl: string;
  path: string;
  originalBytes: number;
  bytes: number;
}

const MAX_GALLERY_BYTES = 4 * 1024 * 1024;

/**
 * Phone photos are often 5-10MB, over the request cap of the serverless optimiser.
 * Shrink them in the browser first (longest side 2400px, WebP) so any normal photo uploads.
 */
async function shrinkForUpload(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes * 0.8 || !file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    let side = 2400;
    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.85));
      if (blob && blob.size <= maxBytes * 0.9) {
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
      }
      side = Math.round(side * 0.75);
    }
  } catch {
    /* fall through: the original is sent and the limit check reports it */
  }
  return file;
}

/**
 * Upload a raster image through the serverless optimiser (/api/admin/images):
 * the server enforces the size limit and stores an optimised WebP.
 */
export async function uploadImage(file: File, kind: 'thumbnail' | 'poster' | 'gallery' = 'thumbnail'): Promise<ImageUploadResult> {
  const limit = kind === 'thumbnail' ? MAX_THUMBNAIL_BYTES : kind === 'gallery' ? MAX_GALLERY_BYTES : MAX_POSTER_BYTES;
  const originalBytes = file.size;
  if (kind === 'gallery') file = await shrinkForUpload(file, limit);
  if (file.size > limit) {
    throw new Error(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${limit / 1024 / 1024}MB.`);
  }

  const body = new FormData();
  body.append('file', file);
  body.append('kind', kind);

  const res = await fetch('/api/admin/images', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || `Image upload failed (${res.status})`);
  return { ...(data as ImageUploadResult), originalBytes };
}
