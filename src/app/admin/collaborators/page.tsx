'use client';

import ProfileManager from '@/components/admin/ProfileManager';

export default function CollaboratorsPage() {
  return (
    <ProfileManager
      type="COLLABORATOR"
      icon="🤝"
      heading="Collaborators"
      subtitle="People and groups OMNIVOID works with: photo or logo, role and a write-up."
      singular="collaborator"
      roleLabel="Role"
      rolePlaceholder="e.g. Visual artist, Sound engineer"
      imageLabel="Photo / Logo"
    />
  );
}
