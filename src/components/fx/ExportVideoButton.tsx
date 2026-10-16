'use client';

import { useRef, useState } from 'react';
import { EXPORT_HEIGHT, EXPORT_WIDTH, canExportVideo, exportThemeVideo } from '@/lib/fx/exportVideo';
import type { FxEffect, FxParams } from '@/lib/fx/presets';

interface ExportVideoButtonProps {
  effect: FxEffect;
  palette: { bg: string; ink: string; accent: string };
  params: FxParams;
  filename: string;
}

const LENGTHS = [5, 10, 15, 30];

/** Renders the current theme to a 1920x1080 MP4 for promotional use and downloads it. */
export function ExportVideoButton({ effect, palette, params, filename }: ExportVideoButtonProps) {
  const [seconds, setSeconds] = useState(10);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  if (!canExportVideo()) {
    return <span className="text-[10px] text-white/30">MP4 export needs Chrome, Edge or Safari.</span>;
  }

  const run = async () => {
    setError(null);
    setProgress(0);
    abort.current = new AbortController();
    try {
      const blob = await exportThemeVideo({ effect, palette, params, seconds, onProgress: setProgress, signal: abort.current.signal });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${effect}-${EXPORT_WIDTH}x${EXPORT_HEIGHT}.mp4`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Export failed');
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={seconds}
        disabled={busy}
        onChange={(e) => setSeconds(Number(e.target.value))}
        className="bg-[#111] border border-[#333] rounded px-2 py-1.5 text-[10px] text-white"
      >
        {LENGTHS.map((s) => (
          <option key={s} value={s}>
            {s}s
          </option>
        ))}
      </select>
      {busy ? (
        <button
          type="button"
          onClick={() => abort.current?.abort()}
          className="text-[10px] font-bold px-3 py-1.5 rounded border border-red-400/30 text-red-400 hover:bg-red-400/10"
        >
          CANCEL ({Math.round((progress || 0) * 100)}%)
        </button>
      ) : (
        <button
          type="button"
          onClick={run}
          className="text-[10px] font-bold px-3 py-1.5 rounded border border-[#99ccff]/30 text-[#99ccff] bg-[#99ccff]/10 hover:bg-[#99ccff]/20"
        >
          ⬇ EXPORT MP4 (1920×1080)
        </button>
      )}
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
