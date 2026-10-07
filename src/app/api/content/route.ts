/**
 * OMNIVOID LABS - Unified Content API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readdir } from 'fs/promises';
import { join } from 'path';

async function scanDirectory(dirPath: string, baseUrl: string): Promise<{ id: string; title: string; path: string; type: string }[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      if (entry.isFile() && !entry.name.startsWith('.')) {
        const ext = entry.name.split('.').pop()?.toLowerCase();
        let type = 'unknown';
        
        if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) type = 'audio';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) type = 'image';
        else if (['pdf', 'doc', 'docx'].includes(ext || '')) type = 'doc';
        else if (['txt', 'md'].includes(ext || '')) type = 'text';

        const name = entry.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        items.push({
          id: entry.name,
          title: name.charAt(0).toUpperCase() + name.slice(1),
          path: `${baseUrl}/${entry.name}`,
          type,
        });
      }
    }

    return items.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const publicDir = join(process.cwd(), 'public');

    const [docs, audio, gallery] = await Promise.all([
      scanDirectory(join(publicDir, 'docs'), '/docs'),
      scanDirectory(join(publicDir, 'audio'), '/audio'),
      scanDirectory(join(publicDir, 'gallery'), '/gallery'),
    ]);

    const [dbLinks, dbDocuments, editions, dbResources] = await Promise.all([
      prisma.link.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }).catch(() => []),
      prisma.document.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }).catch(() => []),
      prisma.edition.findMany({
        orderBy: [{ isLatestRitual: 'desc' }, { sortOrder: 'asc' }],
      }).catch(() => []),
      prisma.resource.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }).catch(() => []),
    ]);

    const activeEdition = editions.find(e => e.isLatestRitual) || editions.find(e => e.isActive) || editions[0];

    // Extract Conundrum & Contact Info documents cleanly
    const conundrumDoc = dbDocuments.find(d => d.type === 'CONUNDRUM');
    const contactDoc = dbDocuments.find(d => d.type === 'CONTACT');

    let contactData = { contactEmail: 'contact@omnivoid.dev', submissionsEmail: 'submissions@omnivoid.dev' };
    if (contactDoc) {
      try {
        const parsed = JSON.parse(contactDoc.content);
        contactData = {
          contactEmail: parsed.contactEmail || 'contact@omnivoid.dev',
          submissionsEmail: parsed.submissionsEmail || 'submissions@omnivoid.dev',
        };
      } catch {
        contactData = { contactEmail: contactDoc.content, submissionsEmail: contactDoc.content };
      }
    }

    const resources = dbResources.map(res => ({
      id: res.id,
      title: res.title,
      path: res.url || res.filePath || '',
      type: res.type.toLowerCase(),
      editionId: res.editionId,
      metadata: res.metadata,
    }));

    const links = dbLinks.map(link => ({
      id: link.id,
      title: link.title,
      path: link.url,
      type: 'link' as const,
      linkType: link.type,
      category: link.category,
      metadata: link.metadata,
      editionId: (link.metadata as any)?.editionId || link.editionId,
    }));

    const documents = dbDocuments.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      type: doc.type,
      excerpt: doc.excerpt,
      fileUrl: doc.fileUrl,
      editionId: doc.editionId,
    }));

    return NextResponse.json({
      success: true,
      data: {
        audio,
        gallery,
        links,
        documents,
        resources,
        conundrumText: conundrumDoc?.content || 'OMNIVOID is an autonomous sonic & visual research lab.',
        contactInfo: contactData,
        editions: editions.map(e => ({
          id: e.id,
          name: e.name,
          slug: e.slug,
          description: e.description,
          posterUrl: e.posterUrl,
          workshopPosterUrl: e.workshopPosterUrl,
          eventDate: e.eventDate,
          artists: e.artists,
          youtubeLinks: e.youtubeLinks,
          isLatestRitual: e.isLatestRitual,
          isActive: e.isActive,
          sortOrder: e.sortOrder,
        })),
        currentEdition: activeEdition ? {
          id: activeEdition.id,
          name: activeEdition.name,
          slug: activeEdition.slug,
          description: activeEdition.description,
          posterUrl: activeEdition.posterUrl,
          workshopPosterUrl: activeEdition.workshopPosterUrl,
          eventDate: activeEdition.eventDate,
          artists: activeEdition.artists,
          youtubeLinks: activeEdition.youtubeLinks,
          isLatestRitual: activeEdition.isLatestRitual,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load content'
      },
      { status: 500 }
    );
  }
}