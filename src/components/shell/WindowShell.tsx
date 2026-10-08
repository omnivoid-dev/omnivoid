'use client';

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls, useMotionValue } from 'framer-motion';
import { useDecodeReveal } from '@/hooks/useDecodeReveal';

export interface ShellSection {
  id: string;
  label: string;
  icon: ReactNode;
}

interface WindowShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sections: ShellSection[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Optional back action shown in the title bar (e.g. leaving a profile detail). */
  onBack?: () => void;
  children: ReactNode;
}

const STORAGE_KEY = 'omnivoid.shell.v1';
const MOBILE_BREAKPOINT = 768;

interface SavedLayout {
  w: number;
  h: number;
  x: number;
  y: number;
}

function loadLayout(): SavedLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedLayout) : null;
  } catch {
    return null;
  }
}

function saveLayout(layout: SavedLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* storage unavailable: layout just is not remembered */
  }
}

/**
 * The single shared window. Sections swap inside it; the navigation strip switches
 * between them, and the text decodes into place whenever content changes.
 */
export function WindowShell({ isOpen, onClose, title, sections, activeId, onSelect, onBack, children }: WindowShellProps) {
  const winRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isMobile, setIsMobile] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useDecodeReveal(winRef, isOpen);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Initial size/position: remembered layout, else a sensible default
  useLayoutEffect(() => {
    const el = winRef.current;
    if (!isOpen || !el || isMobile) return;
    const saved = loadLayout();
    const w = Math.min(saved?.w ?? 860, window.innerWidth - 16);
    const h = Math.min(saved?.h ?? 560, window.innerHeight - 72);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    x.set(saved?.x ?? 0);
    y.set(saved?.y ?? 0);
  }, [isOpen, isMobile, x, y]);

  // Remember size when the user resizes
  useEffect(() => {
    const el = winRef.current;
    if (!isOpen || !el || isMobile || maximized) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => saveLayout({ w: el.offsetWidth, h: el.offsetHeight, x: x.get(), y: y.get() }), 250);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isOpen, isMobile, maximized, x, y]);

  // Keyboard: Esc closes, 1-9 jump to a section (unless typing)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (e.key === 'Escape' && !typing) onClose();
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && /^[1-9]$/.test(e.key)) {
        const section = sections[Number(e.key) - 1];
        if (section) onSelect(section.id);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, sections, onSelect, onClose]);

  const toggleMaximize = () => {
    if (isMobile) return;
    if (!maximized) {
      x.set(0);
      y.set(0);
    } else {
      const saved = loadLayout();
      x.set(saved?.x ?? 0);
      y.set(saved?.y ?? 0);
    }
    setMaximized((m) => !m);
  };

  const frame = isMobile || maximized;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] pointer-events-none flex items-center justify-center pb-12">
          <motion.div
            ref={winRef}
            drag={!frame}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            onDragEnd={() => {
              const el = winRef.current;
              if (el) saveLayout({ w: el.offsetWidth, h: el.offsetHeight, x: x.get(), y: y.get() });
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label={title}
            className={`pointer-events-auto flex flex-col bg-[#111111] border border-[#99ccff] overflow-hidden ${
              isMobile
                ? '!w-screen !h-[calc(100vh-48px)] !max-w-none'
                : maximized
                  ? '!w-[calc(100vw-16px)] !h-[calc(100vh-64px)] !max-w-none'
                  : 'min-w-[480px] min-h-[320px] max-w-[100vw]'
            }`}
            style={{
              x,
              y,
              resize: frame ? 'none' : 'both',
              boxShadow: '0 0 24px rgba(153, 204, 255, 0.18), 4px 4px 10px rgba(0, 0, 0, 0.5)',
              fontFamily: "'Space Mono', monospace",
              fontSize: isMobile ? '14px' : '12px',
              color: '#FFFFFF',
            }}
          >
            {/* Title bar */}
            <div
              onPointerDown={(e) => !frame && dragControls.start(e)}
              onDoubleClick={toggleMaximize}
              className={`flex items-center justify-between px-2 select-none shrink-0 ${frame ? '' : 'cursor-grab active:cursor-grabbing'}`}
              style={{ height: 32, background: 'linear-gradient(90deg, #000000 0%, #333333 100%)', borderBottom: '1px solid #333333' }}
            >
              <div className="flex items-center gap-2 min-w-0 pl-1">
                {onBack && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onBack}
                    className="text-[#99ccff] hover:text-white text-xs px-1.5 border border-[#99ccff]/40 rounded"
                    aria-label="Back"
                  >
                    ◀
                  </button>
                )}
                <span className="font-bold text-white truncate" style={{ fontSize: 13 }}>
                  {title}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                {!isMobile && (
                  <button
                    onClick={toggleMaximize}
                    className="w-6 h-6 text-[#99ccff] border border-[#99ccff] hover:bg-[#99ccff] hover:text-black transition-colors text-xs"
                    aria-label={maximized ? 'Restore window' : 'Maximize window'}
                  >
                    {maximized ? '❐' : '□'}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-6 h-6 text-[#99ccff] border border-[#99ccff] hover:bg-[#99ccff] hover:text-black transition-colors text-base leading-none"
                  aria-label="Close window"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Body: navigation strip + content */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              <nav
                aria-label="Sections"
                className="order-last md:order-first shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto md:w-[76px] bg-[#0a0a0a] border-t md:border-t-0 md:border-r border-[#333333]"
              >
                {sections.map((s, i) => {
                  const active = s.id === activeId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelect(s.id)}
                      title={`${s.label}${i < 9 ? ` (${i + 1})` : ''}`}
                      aria-current={active ? 'page' : undefined}
                      className={`shrink-0 flex flex-col items-center justify-center gap-1 px-2 py-2.5 min-w-[64px] border-b-2 md:border-b-0 md:border-l-2 transition-colors ${
                        active
                          ? 'bg-[#99ccff]/10 text-[#99ccff] border-[#99ccff]'
                          : 'text-white/45 border-transparent hover:text-[#99ccff] hover:bg-white/5'
                      }`}
                    >
                      <span className="h-[22px] flex items-center justify-center">{s.icon}</span>
                      <span className="text-[8px] font-bold tracking-wider leading-none max-w-[64px] truncate">{s.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="flex-1 min-w-0 overflow-auto p-4 bg-black" style={{ lineHeight: 1.4 }}>
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
