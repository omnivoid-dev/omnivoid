'use client';

import ProfileManager from '@/components/admin/ProfileManager';

export default function PerformersPage() {
  return (
    <ProfileManager
      type="PERFORMER"
      icon="🎤"
      heading="Performers"
      subtitle="One profile per artist across all editions: photo, write-up and handles. Created automatically when you add a performer to an edition."
      singular="performer"
      roleLabel="Role"
      rolePlaceholder="e.g. Producer / DJ"
      imageLabel="Photo"
    />
  );
}
