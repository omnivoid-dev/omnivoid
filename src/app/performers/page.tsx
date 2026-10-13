import type { Metadata } from 'next';
import { ProfileIndex } from '@/components/profile/ProfileIndex';
import { SITE_URL } from '@/lib/siteUrl';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Performers | OMNIVOID LABS',
  description: 'The artists who have played OMNIVOID: live sets, workshops and transmissions.',
  alternates: { canonical: `${SITE_URL}/performers` },
};

export default function Page() {
  return <ProfileIndex type="PERFORMER" intro="The artists who have played OMNIVOID: live sets, workshops and transmissions." />;
}
