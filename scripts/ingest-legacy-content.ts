/**
 * OMNIVOID LABS - Comprehensive Legacy Content Ingestion
 * 
 * Ingests text documents, YouTube links, research papers, and media assets
 * from the legacy site directory (K:\H DRIVE\Quantum Climb\APPS\OMNIVOID\LABSNEW)
 * into Supabase Postgres database & Supabase Storage.
 * 
 * Usage: npx tsx --env-file=.env scripts/ingest-legacy-content.ts
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { createAdminClient } from '../src/lib/supabase/admin';

const LEGACY_DIR = 'K:\\H DRIVE\\Quantum Climb\\APPS\\OMNIVOID\\LABSNEW';

async function main() {
  console.log('🚀 Starting legacy content ingestion from:', LEGACY_DIR);

  if (!fs.existsSync(LEGACY_DIR)) {
    console.error('❌ Legacy directory not found at:', LEGACY_DIR);
    process.exit(1);
  }

  // 1. Ensure primary Edition exists
  let edition = await prisma.edition.findFirst({
    where: { slug: '2024' },
  });

  if (!edition) {
    console.log('📦 Creating default Edition "OMNIVOID 2024"...');
    edition = await prisma.edition.create({
      data: {
        name: 'OMNIVOID 2024',
        slug: '2024',
        description: 'Omnivoid 2024 Edition',
        isActive: true,
        sortOrder: 1,
      },
    });
  }
  console.log('✅ Using Edition:', edition.name, `(${edition.id})`);

  // 2. Ingest Conundrum & Contact documents
  console.log('\n📄 Ingesting core Documents (Conundrum & Contact)...');
  const conundrumPath = path.join(LEGACY_DIR, 'public', 'links', 'conundrum.txt');
  if (fs.existsSync(conundrumPath)) {
    const content = fs.readFileSync(conundrumPath, 'utf8');
    await prisma.document.upsert({
      where: { slug: 'conundrum' },
      update: { content, editionId: edition.id, isActive: true },
      create: {
        title: 'CONUNDRUM',
        slug: 'conundrum',
        type: 'CONUNDRUM',
        content,
        editionId: edition.id,
        isActive: true,
      },
    });
    console.log('  ✅ Ingested: CONUNDRUM');
  }

  const contactPath = path.join(LEGACY_DIR, 'public', 'links', 'contact.txt');
  if (fs.existsSync(contactPath)) {
    const content = fs.readFileSync(contactPath, 'utf8');
    await prisma.document.upsert({
      where: { slug: 'contact' },
      update: { content, editionId: edition.id, isActive: true },
      create: {
        title: 'CONTACT',
        slug: 'contact',
        type: 'CONTACT',
        content,
        editionId: edition.id,
        isActive: true,
      },
    });
    console.log('  ✅ Ingested: CONTACT');
  }

  // 3. Ingest Research Text Papers from public/docs/*.txt
  console.log('\n📑 Ingesting Research Papers (Text)...');
  const docsDir = path.join(LEGACY_DIR, 'public', 'docs');
  if (fs.existsSync(docsDir)) {
    const textFiles = fs.readdirSync(docsDir).filter((f) => f.endsWith('.txt'));
    for (const file of textFiles) {
      const filePath = path.join(docsDir, file);
      const rawContent = fs.readFileSync(filePath, 'utf8');
      
      const lines = rawContent.split('\n').map((l) => l.trim()).filter(Boolean);
      const title = lines[0] || file.replace('.txt', '').replace(/^\d+_\s*/, '').replace(/_/g, ' ');
      const content = lines.join('\n\n');
      const slug = file.replace('.txt', '').toLowerCase().replace(/[^a-z0-9]/g, '-');

      await prisma.document.upsert({
        where: { slug },
        update: { title, content, type: 'RESEARCH', editionId: edition.id, isActive: true },
        create: {
          title,
          slug,
          type: 'RESEARCH',
          content,
          excerpt: lines[1] ? lines[1].substring(0, 150) + '...' : null,
          editionId: edition.id,
          isActive: true,
        },
      });
      console.log(`  ✅ Ingested Research Paper: "${title}"`);
    }
  }

  // 4. Ingest YouTube Links from live_transmissions.txt and labs.txt
  console.log('\n🔗 Ingesting Links (Live Transmissions & Labs)...');
  const liveTransPath = path.join(LEGACY_DIR, 'public', 'links', 'live_transmissions.txt');
  if (fs.existsSync(liveTransPath)) {
    const lines = fs.readFileSync(liveTransPath, 'utf8').split('\n');
    let lastArtist = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('http://') || line.startsWith('https://')) {
        const title = lastArtist ? `Live Transmission - ${lastArtist}` : 'Live Transmission';
        
        const existing = await prisma.link.findFirst({
          where: { url: line, category: 'live_transmissions' },
        });

        if (!existing) {
          await prisma.link.create({
            data: {
              editionId: edition.id,
              title,
              type: 'YOUTUBE',
              url: line,
              category: 'live_transmissions',
              description: lastArtist ? `Performance by ${lastArtist}` : null,
              isActive: true,
            },
          });
          console.log(`  ✅ Ingested Transmission Link: ${title} (${line})`);
        }
        lastArtist = '';
      } else {
        lastArtist = line;
      }
    }
  }

  const labsPath = path.join(LEGACY_DIR, 'public', 'links', 'labs.txt');
  if (fs.existsSync(labsPath)) {
    const lines = fs.readFileSync(labsPath, 'utf8').split('\n');
    let index = 1;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('http://') || line.startsWith('https://')) {
        const title = `Lab Session #${index++}`;
        const existing = await prisma.link.findFirst({
          where: { url: line, category: 'labs' },
        });

        if (!existing) {
          await prisma.link.create({
            data: {
              editionId: edition.id,
              title,
              type: 'YOUTUBE',
              url: line,
              category: 'labs',
              isActive: true,
            },
          });
          console.log(`  ✅ Ingested Lab Link: ${title} (${line})`);
        }
      }
    }
  }

  // 5. Upload PDFs & Media Files to Supabase Storage
  console.log('\n☁️  Uploading PDF Documents & Media to Supabase Storage...');
  const supabaseAdmin = createAdminClient();

  // Ensure 'media' bucket exists
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === 'media')) {
    await supabaseAdmin.storage.createBucket('media', { public: true });
    console.log('  ✅ Created Supabase Storage bucket: media');
  }

  // Upload PDFs
  if (fs.existsSync(docsDir)) {
    const pdfFiles = fs.readdirSync(docsDir).filter((f) => f.endsWith('.pdf'));
    for (const pdf of pdfFiles) {
      const filePath = path.join(docsDir, pdf);
      const fileBuffer = fs.readFileSync(filePath);
      const storagePath = `docs/${pdf}`;

      console.log(`  Uploading PDF: ${storagePath}...`);
      const { error } = await supabaseAdmin.storage
        .from('media')
        .upload(storagePath, fileBuffer, { upsert: true });

      if (error) {
        console.error(`  ❌ Failed to upload ${pdf}:`, error.message);
      } else {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('media')
          .getPublicUrl(storagePath);
        
        const title = pdf.replace('.pdf', '');
        const slug = pdf.replace('.pdf', '').toLowerCase().replace(/[^a-z0-9]/g, '-');

        await prisma.document.upsert({
          where: { slug },
          update: { fileUrl: publicUrlData.publicUrl, fileName: pdf },
          create: {
            title,
            slug,
            type: 'RESEARCH',
            content: `Attached Research Document: ${title}`,
            fileUrl: publicUrlData.publicUrl,
            fileName: pdf,
            editionId: edition.id,
            isActive: true,
          },
        });
        console.log(`  ✅ Uploaded and linked PDF Document: "${title}"`);
      }
    }
  }

  // Upload Gallery Images
  const galleryDir = path.join(LEGACY_DIR, 'public', 'gallery');
  if (fs.existsSync(galleryDir)) {
    const images = fs.readdirSync(galleryDir).filter((f) => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
    for (const img of images) {
      const filePath = path.join(galleryDir, img);
      const fileBuffer = fs.readFileSync(filePath);
      const storagePath = `gallery/${img}`;

      console.log(`  Uploading Gallery Image: ${storagePath}...`);
      const { error } = await supabaseAdmin.storage
        .from('media')
        .upload(storagePath, fileBuffer, { upsert: true });

      if (!error) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('media')
          .getPublicUrl(storagePath);

        const existing = await prisma.resource.findFirst({
          where: { editionId: edition.id, title: img },
        });

        if (!existing) {
          await prisma.resource.create({
            data: {
              editionId: edition.id,
              type: 'GALLERY',
              title: img.replace(/\.[^/.]+$/, ''),
              url: publicUrlData.publicUrl,
              filePath: storagePath,
              isActive: true,
            },
          });
        }
        console.log(`  ✅ Uploaded Gallery Image: ${img}`);
      }
    }
  }

  console.log('\n🎉 Legacy content ingestion completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during legacy content ingestion:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
