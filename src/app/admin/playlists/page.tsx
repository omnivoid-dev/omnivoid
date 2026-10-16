'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import InlineRename from '@/components/admin/InlineRename';
import PlaylistEditorModal, { type AudioRow } from '@/components/admin/PlaylistEditorModal';

interface Playlist {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  items: { resourceId: string; sortOrder: number }[];
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [tracks, setTracks] = useState<AudioRow[]>([]);
  const [editions, setEditions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Playlist | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pRes, tRes, eRes] = await Promise.all([fetch('/api/admin/playlists'), fetch('/api/admin/resources?type=AUDIO'), fetch('/api/admin/editions')]);
      const [p, t, e] = await Promise.all([pRes.json(), tRes.json(), eRes.json()]);
      if (p.success) setPlaylists(p.data);
      if (t.success) setTracks(t.data);
      if (e.success) setEditions(e.data);
    } finally {
      setIsLoading(false);
    }
  };

  const patch = async (p: Playlist, data: Partial<Playlist>) => {
    setPlaylists((list) => list.map((x) => (x.id === p.id ? { ...x, ...data } : x)));
    const res = await fetch(`/api/admin/playlists/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!(await res.json().catch(() => ({}))).success) {
      alert('Could not save. Please try again.');
      fetchData();
    }
  };

  const handleDelete = async (p: Playlist) => {
    if (!confirm(`Delete the playlist "${p.name}"? The tracks themselves are not deleted.`)) return;
    const res = await fetch(`/api/admin/playlists/${p.id}`, { method: 'DELETE' });
    if ((await res.json()).success) fetchData();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Playlists</h1>
          <p className="text-sm text-white/40 font-mono">
            Hand-made track lists for the site's audio player. Upload tracks under Audio Player, then group them here.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          🎧 + NEW PLAYLIST
        </button>
      </div>

      <DataTable
        data={playlists}
        isLoading={isLoading}
        emptyMessage="No playlists yet."
        columns={[
          { header: 'Name', accessor: (p) => <InlineRename value={p.name} onSave={(name) => patch(p, { name })} /> },
          { header: 'Tracks', accessor: (p) => <span className="text-xs text-white/60 font-mono">{p.items.length}</span> },
          { header: 'Order', accessor: 'sortOrder' },
          {
            header: 'Status',
            accessor: (p) => (
              <button
                onClick={() => patch(p, { isActive: !p.isActive })}
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'}`}
              >
                {p.isActive ? 'VISIBLE' : 'HIDDEN'}
              </button>
            ),
          },
        ]}
        onEdit={(p) => {
          setEditing(p);
          setShowModal(true);
        }}
        onDelete={handleDelete}
      />

      {showModal && (
        <PlaylistEditorModal
          initialData={editing}
          tracks={tracks}
          editions={editions}
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
