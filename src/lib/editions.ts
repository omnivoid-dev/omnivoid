/**
 * OMNIVOID LABS - Edition persistence
 *
 * One transactional save for an edition and its nested performers + transmissions.
 * Rules enforced here (not in the UI):
 *  - Only one edition can be the Latest Ritual.
 *  - Ticket links only exist on the Latest Ritual, so they never go stale.
 */

import { prisma } from '@/lib/prisma';
import { getYouTubeId, youtubeThumbnail } from '@/lib/youtube';
import { deleteIfUnreferenced } from '@/lib/storage';
import { findOrCreatePerformerProfile } from '@/lib/profiles';
import { sanitizeStoredTheme } from '@/lib/themes';
import { Prisma } from '@prisma/client';

export interface PerformerInput {
  key: string; // existing id or a client-side temp key
  name: string;
  instagram?: string | null;
  youtube?: string | null;
}

export interface TransmissionInput {
  title: string;
  originalTitle?: string | null;
  url: string;
  kind?: 'SET' | 'WORKSHOP' | 'LABS' | 'OTHER';
  performerKey?: string | null;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const date = (v: unknown) => (v ? new Date(v as string) : null);

export const editionInclude = {
  performers: { orderBy: { sortOrder: 'asc' as const } },
  transmissions: { orderBy: { sortOrder: 'asc' as const } },
};

export async function saveEdition(id: string | null, body: any) {
  const isLatest = !!body.isLatestRitual;

  const data = {
    name: String(body.name),
    slug: String(body.slug),
    description: str(body.description),
    eventDate: date(body.eventDate),
    venue: str(body.venue),
    city: str(body.city),
    posterUrl: str(body.posterUrl),
    isLatestRitual: isLatest,
    ticketUrl: isLatest ? str(body.ticketUrl) : null,
    ticketLabel: isLatest ? str(body.ticketLabel) : null,
    hasWorkshop: !!body.hasWorkshop,
    workshopTitle: str(body.workshopTitle),
    workshopDescription: str(body.workshopDescription),
    workshopDateTime: date(body.workshopDateTime),
    workshopPosterUrl: str(body.workshopPosterUrl),
    workshopTicketUrl: isLatest ? str(body.workshopTicketUrl) : null,
    isActive: body.isActive ?? true,
    sortOrder: Number(body.sortOrder) || 0,
  };

  const performers: PerformerInput[] = (body.performers || []).filter((p: PerformerInput) => p.name?.trim());
  const transmissions: TransmissionInput[] = (body.transmissions || []).filter((t: TransmissionInput) => t.url?.trim());

  const before = id
    ? await prisma.edition.findUnique({ where: { id }, select: { posterUrl: true, workshopPosterUrl: true, themeColors: true } })
    : null;

  // Theme is only touched when the request includes it
  if (body.themeColors !== undefined) {
    const theme = sanitizeStoredTheme(body.themeColors, before?.themeColors);
    (data as any).themeColors = theme ? (theme as Prisma.InputJsonValue) : Prisma.DbNull;
  }

  const saved = await prisma.$transaction(async (tx) => {
    const edition = id
      ? await tx.edition.update({ where: { id }, data })
      : await tx.edition.create({ data });

    if (isLatest) {
      // Previous latest ritual loses the flag and its ticket links.
      await tx.edition.updateMany({
        where: { id: { not: edition.id }, isLatestRitual: true },
        data: { isLatestRitual: false, ticketUrl: null, ticketLabel: null, workshopTicketUrl: null },
      });
    }

    // Performers keep their ids (audio tracks and videos reference them); transmissions are replaced.
    await tx.transmission.deleteMany({ where: { editionId: edition.id } });

    const existing = await tx.performer.findMany({ where: { editionId: edition.id }, select: { id: true } });
    const existingIds = new Set(existing.map((p) => p.id));
    const keptIds = new Set(performers.map((p) => p.key).filter((k) => existingIds.has(k)));
    await tx.performer.deleteMany({
      where: { editionId: edition.id, id: { notIn: [...keptIds] } },
    });

    const idByKey = new Map<string, string>();
    for (const [i, p] of performers.entries()) {
      // Each performer links to a shared profile (bio, photo), created on first appearance
      const profileId = await findOrCreatePerformerProfile(tx, p.name, p.instagram, p.youtube);
      const fields = { name: p.name.trim(), instagram: str(p.instagram), youtube: str(p.youtube), sortOrder: i, profileId };
      if (existingIds.has(p.key)) {
        await tx.performer.update({ where: { id: p.key }, data: fields });
        idByKey.set(p.key, p.key);
      } else {
        const created = await tx.performer.create({ data: { editionId: edition.id, ...fields } });
        idByKey.set(p.key, created.id);
      }
    }

    for (const [i, t] of transmissions.entries()) {
      const youtubeId = getYouTubeId(t.url);
      await tx.transmission.create({
        data: {
          editionId: edition.id,
          performerId: t.performerKey ? idByKey.get(t.performerKey) ?? null : null,
          title: t.title?.trim() || t.originalTitle?.trim() || 'YouTube Transmission',
          originalTitle: str(t.originalTitle),
          url: t.url.trim(),
          youtubeId,
          thumbnailUrl: youtubeThumbnail(youtubeId),
          kind: t.kind || 'SET',
          sortOrder: i,
        },
      });
    }

    return tx.edition.findUniqueOrThrow({ where: { id: edition.id }, include: editionInclude });
  });

  // Replaced or removed posters are purged once nothing references them
  await deleteIfUnreferenced([before?.posterUrl, before?.workshopPosterUrl]);
  return saved;
}
