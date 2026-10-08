/**
 * OMNIVOID LABS - Create shared performer Profiles from existing edition performers.
 *
 * Run AFTER `npx prisma db push`:
 *   npx tsx --env-file=.env scripts/migrate-performers-to-profiles.ts
 *
 * Performers with the same name (case-insensitive) share one profile. Safe to re-run.
 */

import { PrismaClient } from '@prisma/client';
import { findOrCreatePerformerProfile } from '../src/lib/profiles';

const prisma = new PrismaClient();

async function main() {
  const performers = await prisma.performer.findMany({ where: { profileId: null }, orderBy: { createdAt: 'asc' } });
  const before = await prisma.profile.count({ where: { type: 'PERFORMER' } });

  for (const p of performers) {
    const profileId = await findOrCreatePerformerProfile(prisma, p.name, p.instagram, p.youtube);
    await prisma.performer.update({ where: { id: p.id }, data: { profileId } });
  }

  const after = await prisma.profile.count({ where: { type: 'PERFORMER' } });
  console.log(`Linked ${performers.length} performer rows. Profiles: ${before} -> ${after}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
