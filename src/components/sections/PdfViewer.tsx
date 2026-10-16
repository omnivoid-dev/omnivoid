'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PdfViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

// Minimal shapes of what we use from pdf.js, so the library can be loaded on demand
interface PdfPage {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void>; cancel: () => void };
}
interface PdfDoc {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy: () => void;
}

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2, 3];

/** One page: a placeholder of the right height that draws itself once it scrolls near the screen. */
function PageCanvas({ doc, pageNumber, width, zoom, root }: { doc: PdfDoc; pageNumber: number; width: number; zoom: number; root: HTMLElement | null }) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [aspect, setAspect] = useState(1.414); // A4 until the real size is known

  useEffect(() => {
    const el = holder.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { root, rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    let cancelled = false;
    let task: { promise: Promise<void>; cancel: () => void } | null = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      if (cancelled) return;
      setAspect(base.height / base.width);
      if (!visible || !canvas.current || width <= 0) return;

      const cssWidth = width * zoom;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
      const c = canvas.current;
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      task = page.render({ canvasContext: ctx, viewport });
      try {
        await task.promise;
      } catch {
        /* a newer render replaced this one */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, visible, width, zoom]);

  const cssWidth = width * zoom;
  return (
    <div ref={holder} className="mx-auto mb-3 bg-white/5 shadow-lg" style={{ width: cssWidth, height: cssWidth * aspect }}>
      <canvas ref={canvas} style={{ width: '100%', height: '100%', display: visible ? 'block' : 'none' }} />
    </div>
  );
}

/**
 * In-site PDF reader (pdf.js). Pages are drawn as you scroll, so large papers stay light, and it works
 * on phones where an embedded PDF would otherwise be replaced by a download prompt. It offers no download.
 */
export function PdfViewer({ url, title, onClose }: PdfViewerProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [page, setPage] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Load the library and the document
  useEffect(() => {
    let cancelled = false;
    let loaded: PdfDoc | null = null;
    (async () => {
      try {
        const pdfjs: any = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        const d: PdfDoc = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return d.destroy();
        loaded = d;
        setDoc(d);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not open this paper.');
      }
    })();
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [url]);

  // Page width follows the available space
  const measure = useCallback(() => {
    const el = scroller.current;
    if (el) setWidth(Math.max(200, el.clientWidth - 24));
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, mounted, doc]);

  // Which page is in view
  const onScroll = () => {
    const el = scroller.current;
    if (!el || !doc) return;
    const probe = el.getBoundingClientRect().top + el.clientHeight / 3;
    const holders = Array.from(el.querySelectorAll<HTMLElement>('[data-page]'));
    for (const h of holders) {
      if (h.getBoundingClientRect().bottom > probe) {
        setPage(Number(h.dataset.page));
        return;
      }
    }
  };

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mounted) return null;

  const zoom = ZOOM_STEPS[zoomIndex];
  const btn = 'w-8 h-8 border border-white/15 rounded text-white/70 hover:text-[#99ccff] hover:border-[#99ccff]/50 text-sm disabled:opacity-30 disabled:hover:text-white/70';

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/95 flex flex-col font-mono text-white" role="dialog" aria-label={title}>
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/10 bg-[#0a0a0a] shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="min-w-0">
          <div className="text-xs font-bold text-[#99ccff] truncate">{title}</div>
          <div className="text-[10px] text-white/40">{doc ? `Page ${page} of ${doc.numPages}` : 'Loading...'}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" className={btn} onClick={() => setZoomIndex((i) => Math.max(0, i - 1))} disabled={zoomIndex === 0} aria-label="Zoom out">
            −
          </button>
          <span className="text-[10px] text-white/50 w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" className={btn} onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1} aria-label="Zoom in">
            +
          </button>
          <button type="button" className={`${btn} ml-1.5 text-base`} onClick={onClose} aria-label="Close the reader">
            ✕
          </button>
        </div>
      </div>

      <div ref={scroller} onScroll={onScroll} className="flex-1 min-h-0 overflow-auto p-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {error && <p className="text-center text-xs text-red-400 py-10">{error}</p>}
        {!doc && !error && <p className="text-center text-xs text-white/40 py-10">Opening the paper...</p>}
        {doc &&
          width > 0 &&
          Array.from({ length: doc.numPages }, (_, i) => (
            <div key={i} data-page={i + 1}>
              <PageCanvas doc={doc} pageNumber={i + 1} width={width} zoom={zoom} root={scroller.current} />
            </div>
          ))}
      </div>
    </div>,
    document.body
  );
}
