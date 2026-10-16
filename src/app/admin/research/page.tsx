'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { ListControls } from '@/components/ui/ListControls';
import { matchesSearch, nameOptions, sameName, sortList, toTime, type SortMode } from '@/lib/listView';
import ResearchUploadModal from '@/components/admin/ResearchUploadModal';

interface ResearchDoc {
  id: string;
  createdAt?: string;
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
  const [editionDates, setEditionDates] = useState<Map<string, number | null>>(new Map());
  const [search, setSearch] = useState('');
  const [editionFilter, setEditionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sort, setSort] = useState<SortMode>('date-desc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dRes, eRes] = await Promise.all([fetch('/api/admin/documents?type=RESEARCH'), fetch('/api/admin/editions')]);
      const [d, e] = await Promise.all([dRes.json(), eRes.json()]);
      if (d.success) setDocs(d.data);
      if (e.success) {
        setEditions(e.data.map((ed: any) => ({ label: ed.name, value: ed.id })));
        setEditionDates(new Map(e.data.map((ed: any) => [ed.id, toTime(ed.eventDate)])));
      }
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

  const editionOptions = useMemo(
    () => sortList(editions, 'date-desc', (e) => e.label, (e) => editionDates.get(e.value) ?? null),
    [editions, editionDates]
  );
  const filtered = useMemo(() => {
    const list = docs.filter(
      (i) =>
        (!editionFilter || i.editionId === editionFilter) &&
        matchesSearch(search, i.title)
    );
    return sortList(list, sort, (i) => i.title, (i) => (i.editionId ? editionDates.get(i.editionId) : null) ?? toTime(i.createdAt));
  }, [docs, editionFilter, search, sort, editionDates]);

  const rename = async (doc: ResearchDoc, title: string) => {
    const next = title.trim();
    if (!next || next === doc.title) return;
    setDocs((d) => d.map((x) => (x.id === doc.id ? { ...x, title: next } : x)));
    const res = await fetch(`/api/admin/documents/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: next }),
    });
    if (!(await res.json().catch(() => ({}))).success) {
      alert('Could not rename. Please try again.');
      fetchData();
    }
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

      <ListControls
        className="mb-4"
        search={search}
        onSearch={setSearch}
        editions={editionOptions}
        edition={editionFilter}
        onEdition={setEditionFilter}
        sort={sort}
        onSort={setSort}
        shown={filtered.length}
        total={docs.length}
      />

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No research papers yet."
        columns={[
          {
            header: 'Display name',
            accessor: (d) => (
              <input
                key={d.id + d.title}
                defaultValue={d.title}
                title="Click to rename; press Enter or click away to save"
                onBlur={(e) => rename(d, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') {
                    e.currentTarget.value = d.title;
                    e.currentTarget.blur();
                  }
                }}
                className="w-full min-w-[220px] bg-transparent border border-transparent hover:border-[#333] focus:border-[#99ccff]/50 focus:bg-[#111] rounded px-2 py-1 text-sm text-white outline-none"
              />
            ),
          },
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
