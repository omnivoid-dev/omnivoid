'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentOverlayProps {
  currentTrackTitle?: string;
  isPlaying?: boolean;
  selectedEditionName?: string;
}

const DEFAULT_MESSAGES = [
  'SYSTEM AGENT ACTIVE // SCANNING LOCAL NODE ENVIRONMENT...',
  '3D GRAPHICS RENDER ENGINE SYNCHRONIZED.',
  'WEB AUDIO SPECTROGRAM LISTENING AT 44.1KHZ.',
  'QUANTUM CLIMB ARCHIVAL TRANSMISSIONS READY.',
  'SECTOR PROTOCOL OPTIMAL. SELECT AN EDITION TO INITIATE RITUAL.',
];

export function AgentOverlay({ currentTrackTitle, isPlaying, selectedEditionName }: AgentOverlayProps) {
  const [messages, setMessages] = useState<string[]>(DEFAULT_MESSAGES);
  const [messageIndex, setMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Trigger contextual messages when events change
  useEffect(() => {
    if (isPlaying && currentTrackTitle) {
      addMessage(`AUDIO AGENT DETECTED STREAM: "${currentTrackTitle.toUpperCase()}". MODULATING 3D PARTICLES.`);
    } else if (!isPlaying && currentTrackTitle) {
      addMessage(`STREAM PAUSED: "${currentTrackTitle.toUpperCase()}". AGENT ENTERING STANDBY.`);
    }
  }, [isPlaying, currentTrackTitle]);

  useEffect(() => {
    if (selectedEditionName) {
      addMessage(`EDITION CHANGED // SYNCED TO: "${selectedEditionName.toUpperCase()}".`);
    }
  }, [selectedEditionName]);

  const addMessage = (text: string) => {
    setMessages((prev) => [...prev, text]);
    setMessageIndex((prev) => prev + 1);
  };

  // Typewriter effect for current message
  const currentMsg = messages[messageIndex % messages.length] || '';

  useEffect(() => {
    let charIndex = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      if (charIndex <= currentMsg.length) {
        setDisplayedText(currentMsg.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [currentMsg]);

  // Cycle messages automatically every 10 seconds if idle
  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 10000);
    return () => clearInterval(cycleTimer);
  }, [messages.length]);

  return (
    <div className="fixed top-4 right-4 z-[200] font-mono text-xs">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/80 border border-[#99ccff]/30 rounded-lg p-3 max-w-sm shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3 mb-2 border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-[#99ccff] tracking-widest uppercase">
              AGENT ARCHITECT v2.4
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[9px] text-white/40 hover:text-[#99ccff] transition-colors"
          >
            {isExpanded ? '[MINIMIZE]' : '[LOGS]'}
          </button>
        </div>

        <div className="text-[11px] text-white/90 leading-relaxed min-h-[32px] flex items-center">
          <span>{displayedText}</span>
          <span className="inline-block w-1.5 h-3 bg-[#99ccff] ml-1 animate-pulse" />
        </div>

        {/* Expanded Console Logs */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-2 border-t border-white/10 max-h-40 overflow-y-auto space-y-1 text-[10px] text-white/50"
            >
              {messages.map((msg, i) => (
                <div key={i} className="truncate">
                  <span className="text-[#99ccff]/60">&gt;</span> {msg}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
