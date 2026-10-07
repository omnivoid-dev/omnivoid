'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import EditionEditorModal from '@/components/admin/EditionEditorModal';

interface Edition {
  id: string;
  name: string;
  slug: string;
  description?: string;
  posterUrl?: string;
  workshopPosterUrl?: string;
  eventDate?: string;
  isLatestRitual?: boolean;
  isActive: boolean;
  sortOrder: number;
  artists?: any;
  youtubeLinks?: any;
}

export default function EditionsPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Edition | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchEditions();
  }, []);

  const fetchEditions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/editions');
      const data = await res.json();
      if (data.success) setEditions(data.data);
    } catch (err) {
      console.error('Failed to fetch editions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item: Edition) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/editions/${item.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) fetchEditions();
    } catch (err) {
      console.error('Failed to delete edition:', err);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8 font-mono">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Editions & Rituals</h1>
          <p className="text-sm text-white/40">Manage event series, single event dates, artist handles, and posters.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all flex items-center gap-2 shadow-lg shadow-[#99ccff]/10"
        >
          <span>🏛️</span> + NEW EDITION
        </button>
      </div>

      <DataTable
        data={editions}
        isLoading={isLoading}
        columns={[
          { header: 'Title', accessor: 'name' },
          { header: 'Slug', accessor: (item) => <code className="text-[#99ccff] text-xs">/{item.slug}</code> },
          {
            header: 'Event Date',
            accessor: (item) => (
              <span className="text-xs text-white/60 font-mono">
                {item.eventDate ? new Date(item.eventDate).toLocaleDateString() : 'N/A'}
              </span>
            ),
          },
          {
            header: 'Role / Status',
            accessor: (item) => (
              <div className="flex items-center gap-2">
                {item.isLatestRitual && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#99ccff] text-[#050505]">
                    LATEST RITUAL
                  </span>
                )}
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    item.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/5 text-white/40'
                  }`}
                >
                  {item.isActive ? 'ACTIVE' : 'ARCHIVED'}
                </span>
              </div>
            ),
          },
          { header: 'Order', accessor: 'sortOrder' },
        ]}
        onEdit={(item) => { setEditingItem(item); setShowForm(true); }}
        onDelete={handleDelete}
      />

      {showForm && (
        <EditionEditorModal
          initialData={editingItem}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            setEditingItem(null);
            fetchEditions();
          }}
        />
      )}
    </AdminLayout>
  );
}
