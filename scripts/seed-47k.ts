/**
 * OMNIVOID LABS - Seed the 47K performer profile with a MOCK write-up.
 *
 * Run AFTER `npx prisma db push`:
 *   npx tsx --env-file=.env scripts/seed-47k.ts
 *
 * The text below is placeholder copy for layout and testing. Replace it from
 * Admin > Performers > 47K. Safe to re-run: an existing profile is never overwritten.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_BIO = `[MOCK WRITE-UP - replace with the real bio]

47K builds slow-moving, heavy-lidded sound out of a sampler, a handful of worn-out cassettes and a patient ear for low frequencies. Sets drift between dub-weighted rhythm and long ambient stretches, with the SP-404 treated less as an instrument and more as a place where loops go to decay.

A regular presence at OMNIVOID since the very first edition, 47K has become part of the lab's sonic fingerprint. The "Phase" series is a running experiment: each piece starts from a single field recording and is processed in stages until the original source is barely recognisable.

When not performing, 47K digs through crates, tinkers with broken hardware and runs small listening sessions for friends who like their music a little out of focus.`;

async function main() {
  const existing = await prisma.profile.findFirst({ where: { type: 'PERFORMER', slug: '47k' } });
  if (existing) {
    console.log('47K profile already exists; leaving it untouched.');
    return;
  }

  await prisma.profile.create({
    data: {
      type: 'PERFORMER',
      name: '47K',
      slug: '47k',
      role: 'Producer / Live sampler (mock)',
      bio: MOCK_BIO,
      isActive: true,
      sortOrder: 0,
    },
  });
  console.log('Created the 47K performer profile with a mock write-up.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
