'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import EntityForm, { FieldDefinition } from '@/components/admin/EntityForm';

interface Document {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
  editionId?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [editions, setEditions] = useState<{label: string, value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Document | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dRes, eRes] = await Promise.all([
        fetch('/api/admin/documents'),
        fetch('/api/admin/editions')
      ]);
      
      const [dData, eData] = await Promise.all([dRes.json(), eRes.json()]);
      
      if (dData.success) setDocuments(dData.data);
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
    const url = editingItem ? `/api/admin/documents/${editingItem.id}` : '/api/admin/documents';

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

  const handleDelete = async (item: Document) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/documents/${item.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const fields: FieldDefinition[] = [
    { name: 'title', label: 'Document Title', type: 'text', required: true, gridCols: 1 },
    { 
      name: 'type', 
      label: 'Document Type', 
      type: 'select', 
      required: true,
      options: [
        { label: 'Research Paper', value: 'RESEARCH' },
        { label: 'Conundrum Text', value: 'CONUNDRUM' },
        { label: 'Labs Info', value: 'LABS' },
        { label: 'Transmission Text', value: 'TRANSMISSIONS' },
        { label: 'Contact Info', value: 'CONTACT' },
        { label: 'Custom', value: 'CUSTOM' },
      ],
      gridCols: 1 
    },
    { name: 'editionId', label: 'Associated Edition', type: 'select', options: editions, gridCols: 1 },
    { name: 'slug', label: 'URL Slug', type: 'text', gridCols: 1 },
    { name: 'content', label: 'Rich Content (HTML/Markdown)', type: 'textarea', required: true, gridCols: 2 },
    { name: 'excerpt', label: 'Short Excerpt', type: 'textarea', gridCols: 2 },
    { name: 'fileUrl', label: 'Attached File URL (PDF/DOC)', type: 'text', gridCols: 2 },
    { name: 'isActive', label: 'Active', type: 'switch', gridCols: 1 },
    { name: 'isFeatured', label: 'Featured', type: 'switch', gridCols: 1 },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Research & Documents</h1>
          <p className="text-sm text-white/40 font-mono">Manage knowledge base and textual artifacts.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          + NEW DOCUMENT
        </button>
      </div>

      <DataTable
        data={documents}
        isLoading={isLoading}
        columns={[
          { header: 'Title', accessor: 'title' },
          { header: 'Type', accessor: 'type' },
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
          title={editingItem ? 'Edit Document' : 'New Document'}
          fields={fields}
          initialData={editingItem || { isActive: true, isFeatured: false }}
          isLoading={isSaving}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
    </AdminLayout>
  );
}
