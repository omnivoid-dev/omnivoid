'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import EntityForm, { FieldDefinition } from '@/components/admin/EntityForm';
import Mp3UploadModal from '@/components/admin/Mp3UploadModal';

interface Resource {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
  editionId: string;
  sortOrder?: number;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [editions, setEditions] = useState<{label: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Resource | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showMp3Modal, setShowMp3Modal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rRes, eRes] = await Promise.all([
        fetch('/api/admin/resources'),
        fetch('/api/admin/editions')
      ]);
      
      const [rData, eData] = await Promise.all([rRes.json(), eRes.json()]);
      
      if (rData.success) setResources(rData.data);
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
    const url = editingItem ? `/api/admin/resources/${editingItem.id}` : '/api/admin/resources';

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

  const handleDelete = async (item: Resource) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/resources/${item.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  };

  const fields: FieldDefinition[] = [
    { name: 'title', label: 'Resource Title', type: 'text', required: true, gridCols: 1 },
    { 
      name: 'type', 
      label: 'Resource Type', 
      type: 'select', 
      required: true,
      options: [
        { label: 'Audio', value: 'AUDIO' },
        { label: 'Video', value: 'VIDEO' },
        { label: 'Poster', value: 'POSTER' },
        { label: 'Document', value: 'DOCUMENT' },
        { label: 'Link', value: 'LINK' },
        { label: 'Gallery Image', value: 'GALLERY' },
        { label: 'Edition Logo', value: 'LOGO' },
      ],
      gridCols: 1 
    },
    { name: 'editionId', label: 'Associated Edition', type: 'select', required: true, options: editions, gridCols: 1 },
    { name: 'url', label: 'External URL (YouTube/Drive)', type: 'text', gridCols: 1 },
    { name: 'filePath', label: 'Local File Path', type: 'text', gridCols: 1 },
    { name: 'thumbnailUrl', label: 'Thumbnail URL', type: 'text', gridCols: 1 },
    { name: 'description', label: 'Description', type: 'textarea', gridCols: 2 },
    { name: 'isActive', label: 'Active', type: 'switch', gridCols: 1 },
    { name: 'isFeatured', label: 'Featured', type: 'switch', gridCols: 1 },
    { name: 'sortOrder', label: 'Sort Order', type: 'number', gridCols: 1 },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Media Resources</h1>
          <p className="text-sm text-white/40 font-mono">Manage audio, video, and visual artifacts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMp3Modal(true)}
            className="bg-[#99ccff]/10 text-[#99ccff] border border-[#99ccff]/30 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#99ccff]/20 transition-all flex items-center gap-2"
          >
            <span>🎵</span> UPLOAD MP3
          </button>
          <button
            onClick={() => { setEditingItem(null); setShowForm(true); }}
            className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
          >
            + NEW RESOURCE
          </button>
        </div>
      </div>

      <DataTable
        data={resources}
        isLoading={isLoading}
        columns={[
          { header: 'Title', accessor: 'title' },
          { header: 'Type', accessor: 'type' },
          { header: 'Order', accessor: 'sortOrder' },
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
          title={editingItem ? 'Edit Resource' : 'New Resource'}
          fields={fields}
          initialData={editingItem || { isActive: true, isFeatured: false, sortOrder: 0 }}
          isLoading={isSaving}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}

      {showMp3Modal && (
        <Mp3UploadModal
          editions={editions}
          onClose={() => setShowMp3Modal(false)}
          onSuccess={() => {
            setShowMp3Modal(false);
            fetchData();
          }}
        />
      )}
    </AdminLayout>
  );
}
