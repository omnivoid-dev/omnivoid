/**
 * OMNIVOID LABS - Unified Content API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { editionInclude } from '@/lib/editions';
import { BRANDING_KEY, resolveBranding } from '@/lib/branding';
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

function serializeEdition(e: any) {
  return {
    id: e.id,
    name: e.name,
    slug: e.slug,
    description: e.description,
    eventDate: e.eventDate,
    venue: e.venue,
    city: e.city,
    posterUrl: e.posterUrl,
    isLatestRitual: e.isLatestRitual,
    ticketUrl: e.isLatestRitual ? e.ticketUrl : null,
    ticketLabel: e.isLatestRitual ? e.ticketLabel : null,
    hasWorkshop: e.hasWorkshop,
    workshopTitle: e.workshopTitle,
    workshopDescription: e.workshopDescription,
    workshopDateTime: e.workshopDateTime,
    workshopPosterUrl: e.workshopPosterUrl,
    workshopTicketUrl: e.isLatestRitual ? e.workshopTicketUrl : null,
    themeColors: e.themeColors,
    isActive: e.isActive,
    sortOrder: e.sortOrder,
    performers: (e.performers || []).map((p: any) => ({
      id: p.id, name: p.name, instagram: p.instagram, youtube: p.youtube,
    })),
    transmissions: (e.transmissions || []).filter((t: any) => t.isActive).map((t: any) => ({
      id: t.id, title: t.title, url: t.url, youtubeId: t.youtubeId, thumbnailUrl: t.thumbnailUrl,
      kind: t.kind, performerId: t.performerId,
    })),
  };
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
        where: { isActive: true },
        include: editionInclude,
        orderBy: [{ isLatestRitual: 'desc' }, { sortOrder: 'asc' }],
      }).catch(() => []),
      prisma.resource.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }).catch(() => []),
    ]);

    const radioShows = await prisma.radioShow
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: { edition: { select: { name: true } }, performer: { select: { name: true } } },
      })
      .catch(() => []);

    const brandingRow = await prisma.siteSettings.findUnique({ where: { key: BRANDING_KEY } }).catch(() => null);

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
      performerId: res.performerId,
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
      thumbnailUrl: doc.thumbnailUrl,
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
        radioShows: radioShows.map(r => ({
          id: r.id,
          title: r.title,
          url: r.url,
          thumbnailUrl: r.thumbnailUrl,
          author: r.author,
          editionName: r.edition?.name ?? null,
          performerName: r.performer?.name ?? null,
        })),
        branding: resolveBranding(brandingRow?.value),
        conundrumText: conundrumDoc?.content || 'OMNIVOID is an autonomous sonic & visual research lab.',
        contactInfo: contactData,
        editions: editions.map(serializeEdition),
        currentEdition: activeEdition ? serializeEdition(activeEdition) : null,
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