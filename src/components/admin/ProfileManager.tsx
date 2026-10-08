'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import ImageUploadField from '@/components/admin/ImageUploadField';

type ProfileType = 'PERFORMER' | 'COLLABORATOR' | 'AFFILIATE';

interface Profile {
  id: string;
  type: ProfileType;
  name: string;
  slug: string;
  role?: string | null;
  bio?: string | null;
  imageUrl?: string | null;
  website?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  isActive: boolean;
  sortOrder: number;
  performers?: { edition: { id: string; name: string } }[];
}

export interface ProfileManagerProps {
  type: ProfileType;
  icon: string;
  heading: string;
  subtitle: string;
  singular: string; // "performer"
  roleLabel: string; // "Role"
  rolePlaceholder: string;
  imageLabel: string; // "Photo" | "Logo"
  bioLabel?: string;
}

const inputCls = 'w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#99ccff]/50';
const labelCls = 'block text-[10px] font-bold text-white/40 tracking-widest uppercase mb-1.5';

export default function ProfileManager(props: ProfileManagerProps) {
  const { type, icon, heading, subtitle, singular } = props;
  const [items, setItems] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/profiles?type=${type}`);
      const d = await res.json();
      if (d.success) setItems(d.data);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => !q || i.name.toLowerCase().includes(q) || i.role?.toLowerCase().includes(q));
  }, [items, search]);

  const handleDelete = async (p: Profile) => {
    const note = type === 'PERFORMER' ? '\n\nEdition line-ups keep the name; only this write-up and photo are removed.' : '';
    if (!confirm(`Delete "${p.name}"?${note}`)) return;
    const res = await fetch(`/api/admin/profiles/${p.id}`, { method: 'DELETE' });
    if ((await res.json()).success) fetchData();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{heading}</h1>
          <p className="text-sm text-white/40 font-mono">{subtitle}</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="bg-[#99ccff] text-[#080808] px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7ab8e6] transition-all"
        >
          {icon} + ADD {singular.toUpperCase()}
        </button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${singular}s...`} className={`${inputCls} max-w-xs mb-4`} />

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage={`No ${singular}s yet.`}
        columns={[
          {
            header: props.imageLabel === 'Logo' ? 'Name' : 'Name',
            accessor: (p) => (
              <div className="flex items-center gap-3">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                ) : (
                  <span className="w-10 h-10 rounded bg-white/5 flex items-center justify-center shrink-0">{icon}</span>
                )}
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{p.name}</div>
                  {p.role && <div className="text-[10px] text-white/40 truncate">{p.role}</div>}
                </div>
              </div>
            ),
          },
          {
            header: 'Write-up',
            accessor: (p) => <span className={`text-[10px] font-bold ${p.bio ? 'text-emerald-400' : 'text-white/30'}`}>{p.bio ? `${p.bio.length} chars` : 'EMPTY'}</span>,
          },
          ...(type === 'PERFORMER'
            ? [
                {
                  header: 'Editions',
                  accessor: (p: Profile) => <span className="text-xs text-white/50">{p.performers?.length || 0}</span>,
                },
              ]
            : []),
          { header: 'Order', accessor: 'sortOrder' as const },
          {
            header: 'Status',
            accessor: (p) => (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                {p.isActive ? 'ACTIVE' : 'HIDDEN'}
              </span>
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
        <ProfileModal
          {...props}
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

function ProfileModal({
  type,
  icon,
  singular,
  roleLabel,
  rolePlaceholder,
  imageLabel,
  bioLabel = 'Write-up',
  initialData,
  onClose,
  onSuccess,
}: ProfileManagerProps & { initialData: Profile | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name || '');
  const [role, setRole] = useState(initialData?.role || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [instagram, setInstagram] = useState(initialData?.instagram || '');
  const [youtube, setYoutube] = useState(initialData?.youtube || '');
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder || 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/admin/profiles/${initialData!.id}` : '/api/admin/profiles', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, role, bio, imageUrl, website, instagram, youtube, sortOrder, isActive }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Failed to save');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const editions = initialData?.performers?.map((p) => p.edition.name) || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0a] border border-[#99ccff]/30 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl font-mono text-white"
      >
        <div className="px-8 py-5 border-b border-white/10 bg-[#99ccff]/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#99ccff]">
            {icon} {isEdit ? 'EDIT' : 'ADD'} {singular.toUpperCase()}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">[ERROR] {error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{roleLabel}</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder={rolePlaceholder} className={inputCls} />
            </div>
          </div>

          <ImageUploadField label={imageLabel} value={imageUrl} onChange={setImageUrl} kind="thumbnail" hint="JPG, PNG or WebP up to 3MB. Converted to an optimised WebP." />

          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls}>{bioLabel}</label>
              <span className="text-[10px] text-white/30 mb-1.5">{bio.length} chars · blank line = new paragraph</span>
            </div>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={9} className={`${inputCls} leading-relaxed`} placeholder={`Write about this ${singular}...`} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Website</label>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Instagram</label>
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@handle" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>YouTube</label>
              <input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="@handle or URL" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Order</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <label className="flex items-end pb-2 gap-2 cursor-pointer text-[10px] font-bold text-white/60">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-[#99ccff]" />
              VISIBLE ON SITE
            </label>
          </div>

          {type === 'PERFORMER' && isEdit && (
            <p className="text-[10px] text-white/40 border border-dashed border-white/10 rounded p-3">
              Appears in: {editions.length ? editions.join(', ') : 'no editions yet'}. Add performers to an edition from Editions & Rituals; they link to this profile by name.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-5 py-2 text-xs font-bold text-white/40 hover:text-white">
              CANCEL
            </button>
            <button type="submit" disabled={isSaving} className="bg-[#99ccff] text-[#050505] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] disabled:opacity-50">
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
