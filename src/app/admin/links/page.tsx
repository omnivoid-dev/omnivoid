'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import EntityForm, { FieldDefinition } from '@/components/admin/EntityForm';

interface Link {
  id: string;
  title: string;
  url: string;
  type: string;
  category?: string;
  isActive: boolean;
}

export default function LinksPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [editions, setEditions] = useState<{label: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Link | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const [lRes, eRes] = await Promise.all([
        fetch('/api/admin/links'),
        fetch('/api/admin/editions')
      ]);
      
      const [lData, eData] = await Promise.all([lRes.json(), eRes.json()]);
      
      if (lData.success) setLinks(lData.data);
      if (eData.success) {
        setEditions(eData.data.map((e: any) => ({ label: e.name, value: e.id })));
      }
    } catch (err) {
      console.error('Failed to fetch links:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    setIsSaving(true);
    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem ? `/api/admin/links/${editingItem.id}` : '/api/admin/links';

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
        fetchLinks();
      } else {
        throw new Error(data.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: Link) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/links/${item.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) fetchLinks();
    } catch (err) {
      console.error('Failed to delete link:', err);
    }
  };

  const fields: FieldDefinition[] = [
    { name: 'title', label: 'Title', type: 'text', required: true, gridCols: 1 },
    { 
      name: 'type', 
      label: 'Type', 
      type: 'select', 
      required: true,
      options: [
        { label: 'Mixcloud', value: 'MIXCLOUD' },
        { label: 'YouTube', value: 'YOUTUBE' },
        { label: 'Website', value: 'WEBSITE' },
        { label: 'Social', value: 'SOCIAL' },
        { label: 'Podcast', value: 'PODCAST' },
        { label: 'Other', value: 'OTHER' },
      ],
      gridCols: 1 
    },
    { name: 'url', label: 'Destination URL', type: 'text', required: true, gridCols: 2 },
    { 
      name: 'category', 
      label: 'Category', 
      type: 'select', 
      options: [
        { label: 'Live Transmissions', value: 'live_transmissions' },
        { label: 'Radio (Mixcloud)', value: 'radio' },
        { label: 'Labs (Workshops)', value: 'labs' },
        { label: 'Conundrum', value: 'conundrum' },
        { label: 'Contact', value: 'contact' },
      ],
      gridCols: 1 
    },
    { name: 'editionId', label: 'Associated Edition', type: 'select', options: editions, gridCols: 1 },
    { name: 'sortOrder', label: 'Sort Order', type: 'number', gridCols: 1 },
    { name: 'isActive', label: 'Active', type: 'switch', gridCols: 1 },
    { name: 'isFeatured', label: 'Featured', type: 'switch', gridCols: 1 },
    { name: 'description', label: 'Short Description', type: 'textarea', gridCols: 2 },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Transmissions & Links</h1>
          <p className="text-sm text-white/40 font-mono">Manage external integrations and thematic links.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          + NEW LINK
        </button>
      </div>

      <DataTable
        data={links}
        isLoading={isLoading}
        columns={[
          { header: 'Title', accessor: 'title' },
          { header: 'Type', accessor: 'type' },
          { header: 'Category', accessor: (item) => item.category || 'N/A' },
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
          title={editingItem ? 'Edit Link' : 'New Link'}
          fields={fields}
          initialData={editingItem || { isActive: true, isFeatured: false, sortOrder: 0 }}
          isLoading={isSaving}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
    </AdminLayout>
  );
}
