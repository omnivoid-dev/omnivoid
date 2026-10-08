'use client';

import BrandingManager from '@/components/admin/BrandingManager';
import StorageCleanup from '@/components/admin/StorageCleanup';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';

export default function DashboardPage() {
  const [conundrumContent, setConundrumContent] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submissionsEmail, setSubmissionsEmail] = useState('');
  
  const [conundrumDocId, setConundrumDocId] = useState<string | null>(null);
  const [contactDocId, setContactDocId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConundrum, setIsSavingConundrum] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchInfoDocs();
  }, []);

  const fetchInfoDocs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/documents');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const conDoc = data.data.find((d: any) => d.type === 'CONUNDRUM');
        if (conDoc) {
          setConundrumContent(conDoc.content || '');
          setConundrumDocId(conDoc.id);
        }

        const cntDoc = data.data.find((d: any) => d.type === 'CONTACT');
        if (cntDoc) {
          setContactDocId(cntDoc.id);
          try {
            const parsed = JSON.parse(cntDoc.content);
            setContactEmail(parsed.contactEmail || '');
            setSubmissionsEmail(parsed.submissionsEmail || '');
          } catch {
            setContactEmail(cntDoc.content || '');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load info docs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConundrum = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConundrum(true);
    setMessage(null);

    const method = conundrumDocId ? 'PUT' : 'POST';
    const url = conundrumDocId ? `/api/admin/documents/${conundrumDocId}` : '/api/admin/documents';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'CONUNDRUM (ABOUT US)',
          type: 'CONUNDRUM',
          content: conundrumContent,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (!conundrumDocId && data.data?.id) setConundrumDocId(data.data.id);
        setMessage({ type: 'success', text: 'Conundrum (About Us) text updated successfully.' });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save Conundrum text.' });
    } finally {
      setIsSavingConundrum(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContact(true);
    setMessage(null);

    const contentJson = JSON.stringify({
      contactEmail,
      submissionsEmail,
    });

    const method = contactDocId ? 'PUT' : 'POST';
    const url = contactDocId ? `/api/admin/documents/${contactDocId}` : '/api/admin/documents';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'CONTACT INFORMATION',
          type: 'CONTACT',
          content: contentJson,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (!contactDocId && data.data?.id) setContactDocId(data.data.id);
        setMessage({ type: 'success', text: 'Contact emails updated successfully.' });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save Contact emails.' });
    } finally {
      setIsSavingContact(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl font-mono">
        {/* Header */}
        <section className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">OMNIVOID CMS CONTROL</h1>
            <p className="text-xs text-white/40 mt-1">Direct management for site text, editions, and media assets.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/editions"
              className="bg-[#99ccff] text-[#080808] px-5 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] transition-all"
            >
              🏛️ MANAGE EDITIONS
            </Link>
            <Link
              href="/admin/research"
              className="bg-white/5 text-white/80 border border-white/10 px-5 py-2 rounded-lg font-bold text-xs hover:bg-white/10 transition-all"
            >
              📚 RESEARCH
            </Link>
            <Link
              href="/admin/audio"
              className="bg-white/5 text-white/80 border border-white/10 px-5 py-2 rounded-lg font-bold text-xs hover:bg-white/10 transition-all"
            >
              🎧 AUDIO
            </Link>
          </div>
        </section>

        {message && (
          <div
            className={`p-4 rounded-lg text-xs font-bold border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.type === 'success' ? '✓ ' : '✕ '} {message.text}
          </div>
        )}

        {/* Core Info Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CONUNDRUM (ABOUT US) EDITOR */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0a0a] border border-[#99ccff]/30 rounded-2xl p-6 shadow-2xl flex flex-col justify-between"
          >
            <form onSubmit={handleSaveConundrum} className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧩</span>
                  <h3 className="text-sm font-bold text-[#99ccff] tracking-wider uppercase">
                    CONUNDRUM (ABOUT US)
                  </h3>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#99ccff]/10 text-[#99ccff] font-bold">
                  MAIN SITE PAGE
                </span>
              </div>

              <p className="text-[11px] text-white/40">
                Edit the core narrative text that displays in the CONUNDRUM window on the homepage.
              </p>

              <textarea
                value={conundrumContent}
                onChange={(e) => setConundrumContent(e.target.value)}
                placeholder="Enter Conundrum / About Us statement..."
                rows={10}
                required
                className="w-full flex-1 bg-[#111] border border-[#333] rounded-lg p-4 text-xs text-white leading-relaxed focus:border-[#99ccff]/60 outline-none resize-none"
              />

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingConundrum || isLoading}
                  className="bg-[#99ccff] text-[#050505] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] transition-all disabled:opacity-50"
                >
                  {isSavingConundrum ? 'SAVING...' : 'SAVE CONUNDRUM TEXT'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* CONTACT INFO EDITOR */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0a0a0a] border border-[#99ccff]/30 rounded-2xl p-6 shadow-2xl flex flex-col justify-between"
          >
            <form onSubmit={handleSaveContact} className="space-y-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📧</span>
                  <h3 className="text-sm font-bold text-[#99ccff] tracking-wider uppercase">
                    CONTACT INFORMATION
                  </h3>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#99ccff]/10 text-[#99ccff] font-bold">
                  MAIN SITE PAGE
                </span>
              </div>

              <p className="text-[11px] text-white/40">
                Set the official contact email addresses for public inquiries and track submissions.
              </p>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-[10px] font-bold text-[#99ccff] uppercase tracking-widest mb-2">
                    GENERAL CONTACT EMAIL *
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. contact@omnivoid.dev"
                    required
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-xs text-white focus:border-[#99ccff]/60 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#99ccff] uppercase tracking-widest mb-2">
                    SUBMISSIONS EMAIL *
                  </label>
                  <input
                    type="email"
                    value={submissionsEmail}
                    onChange={(e) => setSubmissionsEmail(e.target.value)}
                    placeholder="e.g. submissions@omnivoid.dev"
                    required
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-xs text-white focus:border-[#99ccff]/60 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingContact || isLoading}
                  className="bg-[#99ccff] text-[#050505] px-6 py-2 rounded-lg font-bold text-xs hover:bg-[#7ab8e6] transition-all disabled:opacity-50"
                >
                  {isSavingContact ? 'SAVING...' : 'SAVE CONTACT EMAILS'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        <BrandingManager />

        <StorageCleanup />
      </div>
    </AdminLayout>
  );
}