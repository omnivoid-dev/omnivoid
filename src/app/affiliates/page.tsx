import type { Metadata } from 'next';
import { ProfileIndex } from '@/components/profile/ProfileIndex';
import { SITE_URL } from '@/lib/siteUrl';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Affiliates | OMNIVOID LABS',
  description: 'Businesses and labels aligned with OMNIVOID LABS.',
  alternates: { canonical: `${SITE_URL}/affiliates` },
};

export default function Page() {
  return <ProfileIndex type="AFFILIATE" intro="Businesses and labels aligned with OMNIVOID LABS." />;
}
