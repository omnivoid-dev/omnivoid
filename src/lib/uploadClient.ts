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
