'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import Mp3UploadModal from '@/components/admin/Mp3UploadModal';

interface AudioResource {
  id: string;
  title: string;
  editionId: string;
  performerId?: string | null;
  sortOrder: number;
  isActive: boolean;
  metadata?: any;
  edition?: { name: string };
  performer?: { name: string } | null;
}

export default function AudioPage() {
  const [tracks, setTracks] = useState<AudioResource[]>([]);
  const [editions, setEditions] = useState<{ label: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<AudioResource | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rRes, eRes] = await Promise.all([fetch('/api/admin/resources?type=AUDIO'), fetch('/api/admin/editions')]);
      const [r, e] = await Promise.all([rRes.json(), eRes.json()]);
      if (r.success) setTracks(r.data);
      if (e.success) setEditions(e.data.map((ed: any) => ({ label: ed.name, value: ed.id })));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (t: AudioResource) => {
    if (!confirm(`Delete "${t.title}"?`)) return;
    const res = await fetch(`/api/admin/resources/${t.id}`, { method: 'DELETE' });
    if ((await res.json()).success) fetchData();
  };

  const fmt = (s?: number) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '—');

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Audio Player Playlist</h1>
          <p className="text-sm text-white/40 font-mono">MP3 tracks for the site player. Rename tracks and link them to a performer.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          🎵 UPLOAD MP3
        </button>
      </div>

      <DataTable
        data={tracks}
        isLoading={isLoading}
        emptyMessage="No audio tracks yet."
        columns={[
          { header: 'Track', accessor: 'title' },
          { header: 'Performer', accessor: (t) => <span className="text-xs text-white/60">{t.performer?.name || t.metadata?.artist || '—'}</span> },
          { header: 'Edition', accessor: (t) => <span className="text-xs text-white/50">{t.edition?.name || '—'}</span> },
          { header: 'Length', accessor: (t) => <span className="text-xs text-white/50 font-mono">{fmt(t.metadata?.duration)}</span> },
          { header: 'Order', accessor: 'sortOrder' },
          {
            header: 'Status',
            accessor: (t) => (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                {t.isActive ? 'ACTIVE' : 'HIDDEN'}
              </span>
            ),
          },
        ]}
        onEdit={(t) => {
          setEditing(t);
          setShowModal(true);
        }}
        onDelete={handleDelete}
      />

      {showModal && (
        <Mp3UploadModal
          editions={editions}
          initialData={editing}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setEditing(null);
            fetchData();
          }}
        />
      )}
    </AdminLayout>
  );
}
