import type { Metadata } from 'next';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { profileMetadata } from '@/lib/profileSeo';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return profileMetadata('AFFILIATE', params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ProfilePage type="AFFILIATE" slug={params.slug} />;
}
