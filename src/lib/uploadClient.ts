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

/**
 * Upload a raster image through the serverless optimiser (/api/admin/images):
 * the server enforces the size limit and stores an optimised WebP.
 */
export async function uploadImage(file: File, kind: 'thumbnail' | 'poster' = 'thumbnail'): Promise<ImageUploadResult> {
  const limit = kind === 'thumbnail' ? MAX_THUMBNAIL_BYTES : MAX_POSTER_BYTES;
  if (file.size > limit) {
    throw new Error(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${limit / 1024 / 1024}MB.`);
  }

  const body = new FormData();
  body.append('file', file);
  body.append('kind', kind);

  const res = await fetch('/api/admin/images', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || `Image upload failed (${res.status})`);
  return data as ImageUploadResult;
}
