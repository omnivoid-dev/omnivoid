'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import EntityForm, { FieldDefinition } from '@/components/admin/EntityForm';

interface Gig {
  id: string;
  title: string;
  date: string;
  venue?: string;
  location?: string;
  isActive: boolean;
  editionId?: string;
  edition?: { name: string };
}

export default function GigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [editions, setEditions] = useState<{label: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Gig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [gRes, eRes] = await Promise.all([
        fetch('/api/admin/gigs'),
        fetch('/api/admin/editions')
      ]);
      
      const [gData, eData] = await Promise.all([gRes.json(), eRes.json()]);
      
      if (gData.success) setGigs(gData.data);
      if (eData.success) {
        setEditions(eData.data.map((e: any) => ({ label: e.name, value: e.id })));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    setIsSaving(true);
    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem ? `/api/admin/gigs/${editingItem.id}` : '/api/admin/gigs';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setEditingItem(null);
        fetchData();
      } else {
        throw new Error(data.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: Gig) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/gigs/${item.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error('Failed to delete gig:', err);
    }
  };

  const fields: FieldDefinition[] = [
    { name: 'title', label: 'Gig Title', type: 'text', required: true, gridCols: 1 },
    { name: 'editionId', label: 'Edition', type: 'select', options: editions, gridCols: 1 },
    { name: 'subtitle', label: 'Subtitle', type: 'text', gridCols: 2 },
    { name: 'description', label: 'Description', type: 'textarea', gridCols: 2 },
    { name: 'date', label: 'Date', type: 'date', required: true, gridCols: 1 },
    { name: 'venue', label: 'Venue', type: 'text', gridCols: 1 },
    { name: 'location', label: 'Location', type: 'text', gridCols: 1 },
    { name: 'address', label: 'Full Address', type: 'text', gridCols: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', gridCols: 1 },
    { name: 'isFeatured', label: 'Featured', type: 'switch', gridCols: 1 },
    { name: 'hasWorkshop', label: 'Includes Workshop', type: 'switch', gridCols: 2 },
    { name: 'workshopTitle', label: 'Workshop Title', type: 'text', gridCols: 1 },
    { name: 'workshopDescription', label: 'Workshop Description', type: 'textarea', gridCols: 2 },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Rituals</h1>
          <p className="text-sm text-white/40 font-mono">Manage live events and workshop content.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          + NEW RITUAL
        </button>
      </div>

      <DataTable
        data={gigs}
        isLoading={isLoading}
        columns={[
          { header: 'Date', accessor: (item) => new Date(item.date).toLocaleDateString() },
          { header: 'Title', accessor: 'title' },
          { header: 'Edition', accessor: (item) => item.edition?.name || 'N/A' },
          { header: 'Venue', accessor: (item) => item.venue || item.location || 'N/A' },
          { header: 'Status', accessor: (item) => (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
              {item.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          ) },
        ]}
        onEdit={(item) => { setEditingItem(item); setShowForm(true); }}
        onDelete={handleDelete}
      />

      {showForm && (
        <EntityForm
          title={editingItem ? 'Edit Ritual' : 'New Ritual'}
          fields={fields}
          initialData={editingItem || { isActive: true, isFeatured: false, hasWorkshop: false }}
          isLoading={isSaving}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
    </AdminLayout>
  );
}
