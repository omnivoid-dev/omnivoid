'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || 'Login failed');
        return;
      }

      if (data.user?.app_metadata?.role !== 'admin') {
        await supabase.auth.signOut();
        setError('Access denied: Admin permissions required.');
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/logo.svg" 
            alt="OMNIVOID LABS" 
            className="mx-auto mb-4"
            style={{ width: '120px', filter: 'brightness(0) invert(0.6) sepia(1) saturate(3) hue-rotate(170deg)' }}
          />
          <h1 className="text-2xl font-bold text-[#99ccff] tracking-wider">
            OMNIVOID LABS
          </h1>
          <p className="text-[#666666] text-sm mt-2 font-mono">
            Admin Dashboard
          </p>
        </div>

        {/* Login Form */}
        <div 
          className="bg-[#0a0a0a] border border-[#333333] rounded-lg p-8"
          style={{ boxShadow: '0 0 20px rgba(153, 204, 255, 0.1)' }}
        >
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-900 rounded text-red-400 text-sm font-mono">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-[#99ccff] text-sm font-mono mb-2">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] rounded px-4 py-3 text-white font-mono focus:outline-none focus:border-[#99ccff] transition-colors"
                placeholder="admin@omnivoidlabs.com"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-[#99ccff] text-sm font-mono mb-2">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111111] border border-[#333333] rounded px-4 py-3 text-white font-mono focus:outline-none focus:border-[#99ccff] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#99ccff] text-[#111111] font-bold py-3 px-4 rounded hover:bg-[#7ab8e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[#666666] text-xs font-mono">
          <p>© 2026 OMNIVOID LABS</p>
          <p className="mt-1">Powered by Quantum Climb</p>
        </div>
      </motion.div>
    </div>
  );
}