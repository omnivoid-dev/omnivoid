/**
 * Server-side helpers for the crawlable profile pages (/performers/[slug], /collaborators/[slug], /affiliates/[slug]):
 * data, <head> metadata and schema.org structured data.
 */

import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/siteUrl';
import { profilePath, profileSocials } from '@/lib/profileLinks';

export type ProfileType = 'PERFORMER' | 'COLLABORATOR' | 'AFFILIATE';

export const TYPE_LABEL: Record<ProfileType, { plural: string; segment: string }> = {
  PERFORMER: { plural: 'Performers', segment: 'performers' },
  COLLABORATOR: { plural: 'Collaborators', segment: 'collaborators' },
  AFFILIATE: { plural: 'Affiliates', segment: 'affiliates' },
};

export async function getProfile(type: ProfileType, slug: string) {
  return prisma.profile
    .findFirst({
      where: { type, slug, isActive: true },
      include: { performers: { select: { edition: { select: { id: true, name: true, slug: true, eventDate: true } } } } },
    })
    .catch(() => null);
}

export type LoadedProfile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

/** A meta description from the bio (first ~155 characters), or a sensible fallback. */
export function profileDescription(p: { name: string; role?: string | null; bio?: string | null }): string {
  const bio = p.bio?.replace(/\s+/g, ' ').trim();
  if (bio) return bio.length > 155 ? `${bio.slice(0, 152).trimEnd()}…` : bio;
  return [p.name, p.role, 'on OMNIVOID LABS'].filter(Boolean).join(' · ');
}

export async function profileMetadata(type: ProfileType, slug: string): Promise<Metadata> {
  const profile = await getProfile(type, slug);
  if (!profile) return { title: 'Not found | OMNIVOID LABS', robots: { index: false } };

  const title = `${profile.name}${profile.role ? ` — ${profile.role}` : ''} | OMNIVOID LABS`;
  const description = profileDescription(profile);
  const canonical = `${SITE_URL}${profilePath(type, slug)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      siteName: 'OMNIVOID LABS',
      images: profile.imageUrl ? [{ url: profile.imageUrl, alt: profile.name }] : [{ url: '/share-image.png', width: 1200, height: 630, alt: 'OMNIVOID LABS' }],
    },
    twitter: {
      card: profile.imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: profile.imageUrl ? [profile.imageUrl] : ['/share-image.png'],
    },
  };
}

const SCHEMA_TYPE: Record<ProfileType, string> = {
  PERFORMER: 'MusicGroup',
  COLLABORATOR: 'Person',
  AFFILIATE: 'Organization',
};

/** schema.org JSON-LD for the profile, plus a breadcrumb. Safe to embed in a <script> tag. */
export function profileJsonLd(profile: LoadedProfile, type: ProfileType): string {
  const canonical = `${SITE_URL}${profilePath(type, profile.slug)}`;
  const sameAs = profileSocials(profile).map((s) => s.url);

  const entity: Record<string, unknown> = {
    '@type': SCHEMA_TYPE[type],
    '@id': `${canonical}#entity`,
    name: profile.name,
    url: canonical,
    description: profileDescription(profile),
  };
  if (profile.imageUrl) entity.image = profile.imageUrl;
  if (profile.role && type === 'COLLABORATOR') entity.jobTitle = profile.role;
  if (sameAs.length) entity.sameAs = sameAs;

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      entity,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'OMNIVOID LABS', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: TYPE_LABEL[type].plural, item: `${SITE_URL}/${TYPE_LABEL[type].segment}` },
          { '@type': 'ListItem', position: 3, name: profile.name, item: canonical },
        ],
      },
    ],
  };
  // Escape "<" so profile text can never close the script tag
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}
