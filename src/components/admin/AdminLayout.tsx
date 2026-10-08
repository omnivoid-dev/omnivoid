'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('admin@omnivoid.dev');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      } catch (e) {
        console.error('Failed to get user session:', e);
      }
    };
    fetchUser();
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { label: 'Editions & Rituals', href: '/admin/editions', icon: '🏛️' },
    { label: 'Transmissions (YouTube)', href: '/admin/transmissions', icon: '📡' },
    { label: 'Radio (Mixcloud)', href: '/admin/radio', icon: '📻' },
    { label: 'Performers', href: '/admin/performers', icon: '🎤' },
    { label: 'Collaborators', href: '/admin/collaborators', icon: '🤝' },
    { label: 'Affiliates', href: '/admin/affiliates', icon: '🏢' },
    { label: 'Research Papers', href: '/admin/research', icon: '📚' },
    { label: 'Audio Player', href: '/admin/audio', icon: '🎧' },
    { label: 'Media Library', href: '/admin/media', icon: '🖼️' },
  ];

  const handleLogout = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F2F2F2] font-mono selection:bg-[#99ccff] selection:text-[#080808]">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? '280px' : '80px' }}
        className="fixed top-0 left-0 h-full bg-[#0a0a0a] border-r border-[#1a1a1a] z-50 overflow-hidden flex flex-col"
      >
        {/* Sidebar Header */}
        <div className="p-6 flex items-center gap-4 border-b border-[#1a1a1a]">
          <div className="w-10 h-10 flex-shrink-0 bg-[#111111] border border-[#333333] rounded-lg flex items-center justify-center">
            <img 
              src="/logo.svg" 
              alt="Logo" 
              className="w-6 h-6"
              style={{ filter: 'brightness(0) invert(0.6) sepia(1) saturate(3) hue-rotate(170deg)' }}
            />
          </div>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold tracking-tighter text-lg text-[#99ccff]"
            >
              OMNIVOID<span className="text-white/50">LABS</span>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-8 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-[#99ccff]/10 text-[#99ccff] border border-[#99ccff]/20' 
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {isSidebarOpen && (
                    <span className="font-medium text-sm tracking-wide">{item.label}</span>
                  )}
                  {isActive && isSidebarOpen && (
                    <motion.div 
                      layoutId="active-pill"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[#99ccff]"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 mt-auto border-t border-[#1a1a1a]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 text-white/40 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all duration-200"
          >
            <span className="text-xl">🚪</span>
            {isSidebarOpen && <span className="font-medium text-sm tracking-wide">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main 
        className="transition-all duration-300 min-h-screen flex flex-col"
        style={{ marginLeft: isSidebarOpen ? '280px' : '80px' }}
      >
        {/* Top Header */}
        <header className="h-20 bg-[#080808]/80 backdrop-blur-md border-b border-[#1a1a1a] flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#111] border border-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div className="h-6 w-px bg-[#1a1a1a]" />
            <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase">
              {navItems.find(i => i.href === pathname)?.label || 'Admin'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" target="_blank" className="text-xs text-white/40 hover:text-[#99ccff] transition-colors border border-white/10 px-3 py-1.5 rounded hover:border-[#99ccff]/30 font-bold">
              OPEN LIVE SITE ↗
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-[#99ccff]">ADMINISTRATOR</div>
                <div className="text-[10px] text-white/50 font-mono">{userEmail}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#99ccff]/20 to-[#0a0a0a] border border-[#99ccff]/30 flex items-center justify-center text-lg shadow-xl shadow-black/50">
                👽
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 flex-1 max-w-7xl mx-auto w-full">
          {children}
        </div>

        {/* Footer */}
        <footer className="p-8 border-t border-[#1a1a1a] flex justify-between items-center text-[10px] text-white/20 tracking-[0.2em]">
          <div>© 2025 OMNIVOID LABS // SYSTEM_CORE_V0.4.0</div>
          <div className="flex gap-4">
            <span>STATUS: OPTIMAL</span>
            <span>Uptime: 100.0%</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
