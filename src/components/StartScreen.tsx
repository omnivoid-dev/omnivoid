'use client';

import { motion } from 'framer-motion';

interface StartScreenProps {
  onEnter: () => void;
}

export function StartScreen({ onEnter }: StartScreenProps) {
  const LEGACY_URL = 'https://omnivoid-legacy.vercel.app/';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex flex-col items-center justify-center bg-[#050505] overflow-hidden"
    >
      {/* Background Animated Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#99ccff]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#99ccff]/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center max-w-4xl px-8 text-center">
        {/* Animated Logo */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 1 }}
          className="mb-12"
        >
          <img
            src="/logo.svg"
            alt="OMNIVOID"
            className="w-48 md:w-64 drop-shadow-[0_0_30px_rgba(153,204,255,0.3)] filter brightness-125"
          />
          <div className="mt-4 h-[1px] w-full bg-gradient-to-r from-transparent via-[#99ccff]/40 to-transparent" />
        </motion.div>

        {/* Title and Subtitle */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="mb-16"
        >
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.3em] text-white mb-4 uppercase">
            Omnivoid <span className="text-[#99ccff]">Labs</span>
          </h1>
          <p className="text-xs md:text-sm font-mono tracking-[0.4em] text-[#99ccff]/60 uppercase">
            Evolutionary Archive & Multimedia Repository
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="flex flex-col md:flex-row gap-8 w-full max-w-2xl justify-center items-center"
        >
          {/* Main Entry Button */}
          <button
            type="button"
            onClick={onEnter}
            className="group relative w-full md:w-auto min-w-[280px] p-[1px] rounded-xl overflow-hidden bg-gradient-to-br from-[#99ccff]/40 to-transparent hover:from-[#99ccff]/70 hover:to-transparent transition-all duration-500"
          >
            <div className="relative bg-black/60 backdrop-blur-xl px-10 py-6 rounded-xl flex flex-col items-center gap-2 group-hover:bg-[#99ccff]/10 transition-all duration-500">
              <span className="text-sm font-bold tracking-[0.3em] text-white/80 group-hover:text-white">ENTER OMNIVOID</span>
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Modern Experience</span>
            </div>
          </button>

          {/* Legacy Site Button */}
          <a
            href={LEGACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative w-full md:w-auto min-w-[280px] p-[1px] rounded-xl overflow-hidden bg-gradient-to-br from-white/5 to-transparent hover:from-white/20 hover:to-transparent transition-all duration-500"
          >
            <div className="relative bg-black/40 backdrop-blur-md px-10 py-6 rounded-xl flex flex-col items-center gap-2 group-hover:bg-white/5 transition-all duration-500">
              <span className="text-sm font-bold tracking-[0.3em] text-white/60 group-hover:text-white">LEGACY SITE</span>
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Original Repository</span>
            </div>
          </a>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 2 }}
          className="mt-24 space-y-4"
        >
          <div className="flex items-center justify-center gap-4 text-[9px] font-mono text-white/20 tracking-[0.5em] uppercase">
            <span>Core v1.4.2</span>
            <span className="w-1 h-1 bg-white/20 rounded-full" />
            <span>Secure Connection Established</span>
          </div>
          <div className="text-[10px] text-[#99ccff]/40 font-mono tracking-widest uppercase">
             © 2024 QUANTUM CLIMB // ALL RIGHTS RESERVED
          </div>
        </motion.div>
      </div>

      {/* Aesthetic Border Elements */}
      <div className="fixed top-8 left-8 w-16 h-[1px] bg-white/10" />
      <div className="fixed top-8 left-8 w-[1px] h-16 bg-white/10" />
      <div className="fixed bottom-8 right-8 w-16 h-[1px] bg-white/10" />
      <div className="fixed bottom-8 right-8 w-[1px] h-16 bg-white/10" />
      
      <a 
        href="https://royvillemedia.in/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="fixed bottom-8 left-8 z-50 text-[10px] font-mono tracking-widest uppercase text-white/40 hover:text-white transition-colors duration-300"
      >
        Royville Media
      </a>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.1); }
        }
        .animate-pulse {
          animation: pulse 8s infinite ease-in-out;
        }
      `}</style>
    </motion.div>
  );
}
