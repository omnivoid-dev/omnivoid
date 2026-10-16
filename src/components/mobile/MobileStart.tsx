'use client';

import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface MobileSection {
  id: string;
  label: string;
  icon: ReactNode;
}

interface MobileStartProps {
  sections: MobileSection[];
  /** The section shown in the open window, if any */
  activeId: string | null;
  /** A window is open: the big centre button steps aside */
  windowOpen: boolean;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onSelect: (id: string) => void;
}

const COLUMNS = 3;
const TILE = 104; // px between tile centres, used to start each tile at the screen centre and pop outward

/**
 * Phone home screen: one big START button in the middle of the screen. Tapping it opens a grid of
 * the section links that pops out from the centre. Choosing one opens its window.
 */
export function MobileStart({ sections, activeId, windowOpen, menuOpen, onOpenMenu, onCloseMenu, onSelect }: MobileStartProps) {
  const rows = Math.ceil(sections.length / COLUMNS);

  return (
    <>
      {/* The centre START button (home screen only) */}
      <AnimatePresence>
        {!windowOpen && !menuOpen && (
          <motion.button
            key="start"
            type="button"
            onClick={onOpenMenu}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            aria-label="Open the menu"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[120] w-24 h-24 rounded-full bg-[#111111]/90 border border-[#99ccff] text-[#99ccff] flex flex-col items-center justify-center gap-1 font-mono backdrop-blur-md active:scale-95 transition-transform"
            style={{ boxShadow: '0 0 28px rgba(153, 204, 255, 0.3), 0 0 0 8px rgba(153, 204, 255, 0.06)' }}
          >
            <span className="absolute inset-0 rounded-full border border-[#99ccff]/40 animate-ping" style={{ animationDuration: '2.6s' }} />
            <span className="text-2xl leading-none">▦</span>
            <span className="text-[10px] font-bold tracking-[0.25em]">START</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* The section grid */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[190] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center px-4"
            style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
            onClick={onCloseMenu}
            role="dialog"
            aria-label="Menu"
          >
            <div className="text-[10px] font-mono font-bold tracking-[0.3em] text-[#99ccff] mb-5">OMNIVOID OS</div>
            <div className="grid gap-3 w-full max-w-[340px] max-h-[70dvh] overflow-y-auto p-1" style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }} onClick={(e) => e.stopPropagation()}>
              {sections.map((s, i) => {
                const col = i % COLUMNS;
                const row = Math.floor(i / COLUMNS);
                const active = s.id === activeId && windowOpen;
                return (
                  <motion.button
                    key={s.id}
                    type="button"
                    onClick={() => onSelect(s.id)}
                    // Start stacked at the centre of the grid, then pop out to its place
                    initial={{ opacity: 0, scale: 0.2, x: (1 - col) * TILE, y: -(row - (rows - 1) / 2) * TILE }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.2, x: (1 - col) * TILE, y: -(row - (rows - 1) / 2) * TILE }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28, delay: i * 0.018 }}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-2 p-2 font-mono transition-colors ${
                      active ? 'bg-[#99ccff]/15 border-[#99ccff] text-[#99ccff]' : 'bg-[#111111]/90 border-white/10 text-white/80 active:bg-[#99ccff]/10 active:border-[#99ccff]/60'
                    }`}
                  >
                    <span className="h-8 flex items-center justify-center">{s.icon}</span>
                    <span className="text-[9px] font-bold tracking-wider leading-tight text-center max-w-full truncate">{s.label}</span>
                  </motion.button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onCloseMenu}
              aria-label="Close the menu"
              className="mt-6 w-12 h-12 rounded-full border border-[#99ccff] bg-[#111111] text-[#99ccff] text-lg flex items-center justify-center"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
