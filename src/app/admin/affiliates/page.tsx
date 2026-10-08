'use client';

import ProfileManager from '@/components/admin/ProfileManager';

export default function AffiliatesPage() {
  return (
    <ProfileManager
      type="AFFILIATE"
      icon="🏢"
      heading="Affiliates"
      subtitle="Businesses aligned with OMNIVOID LABS: logo, category, write-up and links."
      singular="affiliate"
      roleLabel="Category"
      rolePlaceholder="e.g. Record label, Venue, Gear shop"
      imageLabel="Logo"
    />
  );
}
