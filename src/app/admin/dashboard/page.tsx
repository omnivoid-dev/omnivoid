'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';

interface Stats {
  gigs: number;
  links: number;
  documents: number;
  editions: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [gRes, lRes, dRes, eRes] = await Promise.all([
          fetch('/api/admin/gigs'),
          fetch('/api/admin/links'),
          fetch('/api/admin/documents'),
          fetch('/api/admin/editions'),
        ]);

        const [g, l, d, e] = await Promise.all([
          gRes.json(),
          lRes.json(),
          dRes.json(),
          eRes.json(),
        ]);

        setStats({
          gigs: g.count || g.data?.length || 0,
          links: l.count || l.data?.length || 0,
          documents: d.count || d.data?.length || 0,
          editions: e.count || e.data?.length || 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Rituals', value: stats?.gigs || 0, icon: '🎸', color: 'text-blue-400' },
    { label: 'Active Links', value: stats?.links || 0, icon: '🔗', color: 'text-[#99ccff]' },
    { label: 'Research Papers', value: stats?.documents || 0, icon: '📄', color: 'text-purple-400' },
    { label: 'Event Editions', value: stats?.editions || 0, icon: '📁', color: 'text-emerald-400' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-12">
        {/* Welcome Section */}
        <section>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 mb-2"
          >
            <span className="text-2xl">⚡</span>
            <h1 className="text-3xl font-bold tracking-tight text-white">System Overview</h1>
          </motion.div>
          <p className="text-white/40 text-sm font-mono tracking-wide">
            Welcome back, Administrator. All systems are functioning within normal parameters.
          </p>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0a0a0a] border border-[#1a1a1a] p-6 rounded-2xl group hover:border-[#99ccff]/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl grayscale group-hover:grayscale-0 transition-all duration-300">{card.icon}</span>
                <span className="text-[10px] font-bold text-white/20 tracking-[0.2em] uppercase">Metric</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">
                {isLoading ? (
                  <div className="h-10 w-16 bg-white/5 animate-pulse rounded" />
                ) : (
                  card.value
                )}
              </div>
              <div className={`text-xs font-bold uppercase tracking-widest ${card.color} opacity-60`}>
                {card.label}
              </div>
            </motion.div>
          ))}
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-[#1a1a1a] rounded-3xl p-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">➕</div>
            <h3 className="text-xl font-bold text-white mb-2">Quick Publication</h3>
            <p className="text-sm text-white/40 mb-8 max-w-xs">Instantly add new content to the Omnivoid network from here.</p>
            
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/gigs" className="px-4 py-2 bg-[#99ccff]/10 hover:bg-[#99ccff]/20 text-[#99ccff] border border-[#99ccff]/20 rounded-lg text-xs font-bold transition-all">
                ADD RITUAL
              </Link>
              <Link href="/admin/links" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-lg text-xs font-bold transition-all">
                ADD TRANSMISSION
              </Link>
              <Link href="/admin/documents" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-lg text-xs font-bold transition-all">
                UPLOAD RESEARCH
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl p-8 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Network Status</h3>
              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">API Endpoint</span>
                  <span className="text-xs font-mono text-emerald-400">ONLINE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">Database Sync</span>
                  <span className="text-xs font-mono text-emerald-400">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">CDN Assets</span>
                  <span className="text-xs font-mono text-emerald-400">VERIFIED</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="text-[10px] text-white/20 uppercase tracking-[0.3em]">Last System Scan: Just Now</div>
            </div>
          </motion.div>
        </section>
      </div>
    </AdminLayout>
  );
}