'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TintedImage } from '@/components/TintedImage';
import { DEFAULT_LOGO_URL, LOGO_ASPECT, resolveBranding, type SiteBranding } from '@/lib/branding';

interface SplashScreenProps {
  onComplete: () => void;
  /** The site's branding from the admin; null while it is still loading. The logo waits for it so it never flashes the old colour. */
  branding: SiteBranding | null;
}

// If the branding has not arrived by then, show the default logo rather than an empty space
const LOGO_WAIT_MS = 4000;

interface LogEntry {
  id: number;
  message: string;
}

const WORM_ICON = '<img src="/ascii/WORM.svg" style="width: 14px; height: 14px; filter: brightness(0) invert(1); vertical-align: middle; margin-right: 8px;">';

export function SplashScreen({ onComplete, branding }: SplashScreenProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const logIdRef = useRef(0);
  const [waitedForLogo, setWaitedForLogo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaitedForLogo(true), LOGO_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  const logoReady = !!branding || waitedForLogo;
  const logo = (branding ?? resolveBranding(null)).logo;
  // The parent passes a new onComplete function on every render; keep the latest in a ref so
  // the loading sequence below starts exactly once instead of restarting (and doubling its log lines).
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const addLog = (message: string, progressPercent?: number) => {
    const id = logIdRef.current++;
    setLogs(prev => {
      const newLogs = [...prev, { id, message }];
      return newLogs.slice(-6); // Keep only last 6 logs
    });
    if (progressPercent !== undefined) {
      setProgress(progressPercent);
    }
  };

  useEffect(() => {
    // Stops a sequence that was started by a throwaway mount (React Strict Mode runs effects twice in development)
    let cancelled = false;
    setLogs([]);
    logIdRef.current = 0;
    const wait = async (ms: number) => {
      await sleep(ms);
      return !cancelled;
    };

    // Simulate loading sequence
    const loadingSequence = async () => {
      addLog(`${WORM_ICON} Initializing OMNIVOID...`, 10);
      if (!(await wait(400))) return;
      
      addLog(`${WORM_ICON} Loading core systems...`, 20);
      if (!(await wait(500))) return;
      
      addLog(`${WORM_ICON} Initializing audio...`, 35);
      if (!(await wait(400))) return;
      
      addLog(`${WORM_ICON} Audio system ready...`, 45);
      if (!(await wait(300))) return;
      
      addLog(`${WORM_ICON} Loading conundrum content...`, 55);
      if (!(await wait(500))) return;
      
      addLog(`${WORM_ICON} Loading visual elements...`, 70);
      if (!(await wait(400))) return;
      
      addLog(`${WORM_ICON} Setting up responsive controls...`, 85);
      if (!(await wait(300))) return;
      
      addLog(`${WORM_ICON} Welcome to the OMNIVOID LABS Repository`, 100);
      if (!(await wait(1000))) return;
      
      // Fade out
      setIsVisible(false);
      if (!(await wait(800))) return;
      onCompleteRef.current();
    };

    loadingSequence();
    return () => {
      cancelled = true;
    };
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#050505]"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: logoReady ? 1 : 0.9, opacity: logoReady ? 1 : 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 relative"
          >
            <TintedImage
              src={logo.url || DEFAULT_LOGO_URL}
              tint={logo.tint}
              aspect={LOGO_ASPECT}
              alt="OMNIVOID"
              style={{
                maxWidth: '220px',
                width: '40vw',
                // The boost suits the original logo; a chosen colour should show as set
                filter: logo.tint.mode === 'none' ? 'brightness(1.5)' : undefined,
              }}
            />
            <div className="absolute -bottom-4 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#99ccff]/50 to-transparent" />
          </motion.div>

          {/* Log Container */}
          <div className="w-[320px] mb-8 font-mono bg-black/40 border border-white/5 p-4 rounded-lg backdrop-blur-sm">
            <div className="text-[10px] text-white/20 uppercase tracking-[0.2em] mb-3 border-b border-white/5 pb-2">System Log</div>
            <div className="space-y-1.5 h-[140px] overflow-hidden flex flex-col justify-end">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#99ccff] text-[11px] leading-relaxed flex items-center"
                  dangerouslySetInnerHTML={{ __html: log.message }}
                />
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-[320px]">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] text-[#99ccff]/60 font-mono tracking-tighter">BOOT_SEQUENCE.SYS</span>
              <span className="text-[10px] text-[#99ccff] font-mono">{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
              <motion.div
                className="h-full bg-gradient-to-r from-[#99ccff]/40 to-[#99ccff] rounded-full"
                style={{ width: `${progress}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
