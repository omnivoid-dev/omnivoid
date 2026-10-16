/**
 * Render a theme (plexus + post effect + palette) to an MP4, entirely in the browser.
 * Frames are stepped offline at a fixed rate (not recorded live), so the result is smooth
 * whatever the machine can keep up with. Needs WebCodecs (Chrome, Edge, Safari 16.4+).
 */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { FxRenderer } from './renderer';
import { MiniPlexus } from './miniPlexus';
import type { FxEffect, FxParams } from './presets';
import { hexToRgb } from '@/lib/themes';

export const MIN_BPM = 90;
export const MAX_BPM = 160;
export const DEFAULT_BPM = 120;

export const EXPORT_WIDTH = 1920;
export const EXPORT_HEIGHT = 1080;

export interface ExportOptions {
  effect: FxEffect;
  palette: { bg: string; ink: string; accent: string };
  params: FxParams;
  seconds: number;
  fps?: number;
  /** Simulate a 120 BPM kick, as the preview does */
  beat?: boolean;
  /** Beats per minute of the simulated kick */
  bpm?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export function canExportVideo(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;
}

const rgb = (hex: string) => hexToRgb(hex).map((c) => c / 255);

export async function exportThemeVideo(opts: ExportOptions): Promise<Blob> {
  const { effect, palette, params, seconds, beat = true, bpm = DEFAULT_BPM, onProgress, signal } = opts;
  const fps = opts.fps ?? 30;
  const total = Math.round(seconds * fps);

  const glCanvas = document.createElement('canvas');
  const renderer = new FxRenderer(glCanvas);
  renderer.prepare(effect);

  // The effect renders at a reduced resolution; scale it up un-smoothed, as on the site
  const out = document.createElement('canvas');
  out.width = EXPORT_WIDTH;
  out.height = EXPORT_HEIGHT;
  const outCtx = out.getContext('2d')!;
  outCtx.imageSmoothingEnabled = false;

  const sourceW = 960;
  const sourceH = 540;
  const source = document.createElement('canvas');
  source.width = sourceW;
  source.height = sourceH;
  const sourceCtx = source.getContext('2d')!;
  const plexus = new MiniPlexus(sourceW, sourceH, 45, 20260101);

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: 'avc', width: EXPORT_WIDTH, height: EXPORT_HEIGHT }, fastStart: 'in-memory' });
  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encodeError = e as Error;
    },
  });
  encoder.configure({
    codec: 'avc1.640028', // H.264 High, level 4.0
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    bitrate: 12_000_000,
    framerate: fps,
  });

  const bg = rgb(palette.bg);
  const ink = rgb(palette.ink);
  const accent = rgb(palette.accent);
  const cell = params.cell || 2;
  let kick = 1;

  try {
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
      if (encodeError) throw encodeError;

      const t = i / fps;
      kick *= Math.pow(0.94, 60 / fps);
      plexus.step(60 / fps);
      plexus.draw(sourceCtx);

      const pulse = beat ? Math.pow(Math.max(0, Math.cos(t * Math.PI * 2 * (bpm / 60))), 6) * 0.85 : 0;
      renderer.resize(EXPORT_WIDTH, EXPORT_HEIGHT, cell);
      renderer.draw({
        now: t * 1000,
        time: t,
        dt: 1 / fps,
        effect,
        params,
        source,
        pulse,
        wave: null,
        mouse: [0.5, 0.5],
        mouseActive: false,
        kick,
        bg,
        ink,
        accent,
        cssWidth: EXPORT_WIDTH,
      });

      outCtx.drawImage(glCanvas, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
      const frame = new VideoFrame(out, { timestamp: Math.round((i * 1_000_000) / fps), duration: Math.round(1_000_000 / fps) });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();

      // Keep the encoder queue short and let the UI breathe
      if (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
      if (i % 5 === 0) {
        onProgress?.(i / total);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    await encoder.flush();
    if (encodeError) throw encodeError;
    muxer.finalize();
    onProgress?.(1);
    return new Blob([target.buffer], { type: 'video/mp4' });
  } finally {
    if (encoder.state !== 'closed') encoder.close();
    renderer.dispose();
  }
}
