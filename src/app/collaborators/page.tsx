import type { Metadata } from 'next';
import { ProfileIndex } from '@/components/profile/ProfileIndex';
import { SITE_URL } from '@/lib/siteUrl';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Collaborators | OMNIVOID LABS',
  description: 'The people and groups OMNIVOID works with.',
  alternates: { canonical: `${SITE_URL}/collaborators` },
};

export default function Page() {
  return <ProfileIndex type="COLLABORATOR" intro="The people and groups OMNIVOID works with." />;
}
