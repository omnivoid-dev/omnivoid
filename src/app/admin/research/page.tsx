'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import ResearchUploadModal from '@/components/admin/ResearchUploadModal';

interface ResearchDoc {
  id: string;
  title: string;
  excerpt?: string;
  fileUrl?: string;
  fileName?: string;
  editionId?: string;
  sortOrder: number;
  isActive: boolean;
  edition?: { name: string } | null;
}

export default function ResearchPage() {
  const [docs, setDocs] = useState<ResearchDoc[]>([]);
  const [editions, setEditions] = useState<{ label: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<ResearchDoc | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dRes, eRes] = await Promise.all([fetch('/api/admin/documents?type=RESEARCH'), fetch('/api/admin/editions')]);
      const [d, e] = await Promise.all([dRes.json(), eRes.json()]);
      if (d.success) setDocs(d.data);
      if (e.success) setEditions(e.data.map((ed: any) => ({ label: ed.name, value: ed.id })));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (doc: ResearchDoc) => {
    await fetch(`/api/admin/documents/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !doc.isActive }),
    });
    fetchData();
  };

  const handleDelete = async (doc: ResearchDoc) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    const res = await fetch(`/api/admin/documents/${doc.id}`, { method: 'DELETE' });
    if ((await res.json()).success) fetchData();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Research Papers</h1>
          <p className="text-sm text-white/40 font-mono">PDF uploads only, 10MB max. Shown in the RESEARCH window on the site.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          📄 UPLOAD PDF
        </button>
      </div>

      <DataTable
        data={docs}
        isLoading={isLoading}
        emptyMessage="No research papers yet."
        columns={[
          { header: 'Title', accessor: 'title' },
          { header: 'File', accessor: (d) => <span className="text-xs text-white/50 font-mono">{d.fileName || '—'}</span> },
          { header: 'Edition', accessor: (d) => <span className="text-xs text-white/50">{d.edition?.name || '—'}</span> },
          { header: 'Order', accessor: 'sortOrder' },
          {
            header: 'Status',
            accessor: (d) => (
              <button
                onClick={() => toggleActive(d)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${d.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'}`}
              >
                {d.isActive ? 'ACTIVE' : 'HIDDEN'}
              </button>
            ),
          },
        ]}
        onEdit={(d) => {
          setEditing(d);
          setShowModal(true);
        }}
        onDelete={handleDelete}
      />

      {showModal && (
        <ResearchUploadModal
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
