'use client';

import { useEffect, useRef } from 'react';
import type { AudioAnalysisData } from '@/hooks/useAudioAnalyzer';

export type VisualizerStyle = 'bars' | 'mirror' | 'scope' | 'radial';

export const VISUALIZER_STYLES: { id: VisualizerStyle; label: string }[] = [
  { id: 'bars', label: 'BARS' },
  { id: 'mirror', label: 'MIRROR' },
  { id: 'scope', label: 'SCOPE' },
  { id: 'radial', label: 'RADIAL' },
];

interface VisualizerProps {
  getAudioData: () => AudioAnalysisData;
  style?: VisualizerStyle;
  className?: string;
}

const ACCENT = '#99ccff';

/** Spectrum / waveform canvas fed by the shared analyser. Redraws every frame; flashes white on the beat. */
export function Visualizer({ getAudioData, style = 'bars', className = '' }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw at the displayed size so lines stay crisp on any screen
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const peaks: number[] = [];
    let raf = 0;
    let flash = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      fit();
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);

      const d = getAudioData();
      const freq = d.frequencyData;
      const wave = d.timeDomainData;
      flash = d.isBeat ? 1 : flash * 0.88;
      const color = flash > 0.5 ? '#ffffff' : ACCENT;
      const idle = !freq || freq.length === 0 || d.overallEnergy < 0.002;

      if (style === 'scope') {
        ctx.lineWidth = Math.max(1.5, H / 60);
        ctx.strokeStyle = color;
        ctx.shadowColor = ACCENT;
        ctx.shadowBlur = 6 + flash * 10;
        ctx.beginPath();
        if (!wave || wave.length === 0 || idle) {
          ctx.moveTo(0, H / 2);
          ctx.lineTo(W, H / 2);
        } else {
          for (let i = 0; i < wave.length; i++) {
            const x = (i / (wave.length - 1)) * W;
            const y = (wave[i] / 255) * H;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        return;
      }

      if (style === 'radial') {
        const cx = W / 2;
        const cy = H / 2;
        const base = Math.min(W, H) * 0.22 * (1 + d.bass * 0.35);
        const maxLen = Math.min(W, H) * 0.3;
        const spokes = 96;
        ctx.lineWidth = Math.max(1.5, Math.min(W, H) / 160);
        ctx.strokeStyle = color;
        for (let i = 0; i < spokes; i++) {
          const v = idle ? 0.04 : (freq[Math.floor((i / spokes) * (freq.length * 0.7))] || 0) / 255;
          const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
          const len = 2 + v * maxLen;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * base, cy + Math.sin(a) * base);
          ctx.lineTo(cx + Math.cos(a) * (base + len), cy + Math.sin(a) * (base + len));
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, base * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(153,204,255,${0.25 + flash * 0.5})`;
        ctx.stroke();
        return;
      }

      // bars + mirror: logarithmic-ish spread so bass is not squeezed into a few bars
      const gap = Math.max(1, Math.round(W / 220));
      const barW = Math.max(2, Math.round(W / 64) - gap);
      const bars = Math.floor(W / (barW + gap));
      const usable = freq && freq.length ? Math.floor(freq.length * 0.75) : 0;
      for (let i = 0; i < bars; i++) {
        const t = i / bars;
        const bin = Math.min(usable - 1, Math.floor(Math.pow(t, 1.6) * usable));
        const v = idle || usable === 0 ? 0.02 : (freq[bin] || 0) / 255;
        const peak = Math.max(peaks[i] ?? 0, v);
        peaks[i] = Math.max(v, peak - 0.012);
        const x = i * (barW + gap);
        ctx.fillStyle = color;
        if (style === 'mirror') {
          const h = Math.max(1, v * H * 0.5);
          ctx.fillRect(x, H / 2 - h, barW, h);
          ctx.globalAlpha = 0.45;
          ctx.fillRect(x, H / 2, barW, h);
          ctx.globalAlpha = 1;
        } else {
          const h = Math.max(1, v * H);
          ctx.fillRect(x, H - h, barW, h);
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(x, H - Math.max(2, peaks[i] * H) - 2, barW, 2);
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [getAudioData, style]);

  return <canvas ref={canvasRef} className={className} />;
}
