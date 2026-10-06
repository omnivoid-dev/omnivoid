/**
 * OMNIVOID LABS - Upload Local Media to Supabase Storage
 * 
 * Uploads files from public/audio and public/gallery to Supabase Storage.
 * Run with: npx tsx scripts/upload-local-media.ts
 */

import fs from 'fs';
import path from 'path';
import { createAdminClient } from '../src/lib/supabase/admin';

async function uploadDirectory(bucket: string, dirPath: string, prefix: string) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory ${dirPath} does not exist. Skipping.`);
    return;
  }

  const supabaseAdmin = createAdminClient();

  // Ensure bucket exists
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === bucket);
  if (!bucketExists) {
    console.log(`Creating bucket ${bucket}...`);
    await supabaseAdmin.storage.createBucket(bucket, { public: true });
  }

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) continue;

    const fileBuffer = fs.readFileSync(fullPath);
    const storagePath = `${prefix}/${file}`;

    console.log(`Uploading ${storagePath} to bucket '${bucket}'...`);
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        upsert: true,
      });

    if (error) {
      console.error(`❌ Failed to upload ${storagePath}:`, error.message);
    } else {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(storagePath);
      console.log(`✅ Uploaded: ${publicUrlData.publicUrl}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting local media migration to Supabase Storage...');
  const basePublic = path.join(process.cwd(), 'public');
  
  await uploadDirectory('media', path.join(basePublic, 'audio'), 'audio');
  await uploadDirectory('media', path.join(basePublic, 'gallery'), 'gallery');

  console.log('\n🎉 Media migration finished!');
}

main().catch(console.error);
