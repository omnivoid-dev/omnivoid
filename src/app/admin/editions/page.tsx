'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import EntityForm, { FieldDefinition } from '@/components/admin/EntityForm';

interface Edition {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
}

export default function EditionsPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Edition | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (formData: any) => {
    setIsSaving(true);
    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem ? `/api/admin/editions/${editingItem.id}` : '/api/admin/editions';

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
        fetchEditions();
      } else {
        throw new Error(data.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: Edition) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"? This will affect all associated gigs and resources.`)) return;

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

  const fields: FieldDefinition[] = [
    { name: 'name', label: 'Edition Name', type: 'text', required: true, gridCols: 1 },
    { name: 'slug', label: 'URL Slug', type: 'text', required: true, gridCols: 1 },
    { name: 'description', label: 'Description', type: 'textarea', gridCols: 2 },
    { name: 'isActive', label: 'Active Edition', type: 'switch', gridCols: 1 },
    { name: 'sortOrder', label: 'Sort Order', type: 'number', gridCols: 1 },
    { name: 'startDate', label: 'Start Date', type: 'date', gridCols: 1 },
    { name: 'endDate', label: 'End Date', type: 'date', gridCols: 1 },
    { name: 'logoUrl', label: 'Logo URL', type: 'text', gridCols: 2 },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Editions</h1>
          <p className="text-sm text-white/40 font-mono">Manage event series and thematic groupings.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          + NEW EDITION
        </button>
      </div>

      <DataTable
        data={editions}
        isLoading={isLoading}
        columns={[
          { header: 'Name', accessor: 'name' },
          { header: 'Slug', accessor: (item) => <code className="text-[#99ccff] text-xs">/{item.slug}</code> },
          { header: 'Status', accessor: (item) => (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-white/40'}`}>
              {item.isActive ? 'ACTIVE' : 'ARCHIVED'}
            </span>
          ) },
          { header: 'Order', accessor: 'sortOrder' },
        ]}
        onEdit={(item) => { setEditingItem(item); setShowForm(true); }}
        onDelete={handleDelete}
      />

      {showForm && (
        <EntityForm
          title={editingItem ? 'Edit Edition' : 'New Edition'}
          fields={fields}
          initialData={editingItem || { isActive: false, sortOrder: 0 }}
          isLoading={isSaving}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
    </AdminLayout>
  );
}
