import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/siteUrl';
import { profilePath } from '@/lib/profileLinks';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await prisma.profile
    .findMany({ where: { isActive: true }, select: { type: true, slug: true, updatedAt: true } })
    .catch(() => []);

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    ...['performers', 'collaborators', 'affiliates'].map((segment) => ({
      url: `${SITE_URL}/${segment}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...profiles.map((p) => ({
      url: `${SITE_URL}${profilePath(p.type, p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
