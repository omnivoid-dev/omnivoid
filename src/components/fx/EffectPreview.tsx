'use client';

import { useEffect, useRef, useState } from 'react';
import { FxRenderer } from '@/lib/fx/renderer';
import type { FxEffect, FxParams } from '@/lib/fx/presets';
import { hexToRgb } from '@/lib/themes';

interface EffectPreviewProps {
  effect: FxEffect;
  palette: { bg: string; ink: string; accent: string };
  params: FxParams;
  width?: number;
  height?: number;
}

const rgb = (hex: string) => hexToRgb(hex).map((c) => c / 255);

/** A small self-contained plexus (agents + connecting lines) to feed the effect, like the site's own. */
class MiniPlexus {
  private agents: { x: number; y: number; vx: number; vy: number }[];

  constructor(private w: number, private h: number, count = 30) {
    this.agents = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.random() - 0.5,
      vy: Math.random() - 0.5,
    }));
  }

  step() {
    for (const a of this.agents) {
      a.x += a.vx * 0.7;
      a.y += a.vy * 0.7;
      if (a.x < 0 || a.x > this.w) a.vx *= -1;
      if (a.y < 0 || a.y > this.h) a.vy *= -1;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    const reach = Math.min(this.w, this.h) * 0.55;
    for (let i = 0; i < this.agents.length; i++) {
      for (let j = i + 1; j < this.agents.length; j++) {
        const a = this.agents[i];
        const b = this.agents[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < reach) {
          ctx.globalAlpha = 1 - d / reach;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    for (const a of this.agents) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Live preview of a post effect at true pixel size, using the same renderer as the site.
 * Move the pointer over it to see the cursor interaction; the beat is simulated (120 BPM).
 */
export function EffectPreview({ effect, palette, params, width = 420, height = 236 }: EffectPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [beat, setBeat] = useState(true);

  const live = useRef({
    params,
    palette,
    beat,
    mouse: [0.5, 0.5],
    mouseActive: false,
  });
  live.current.params = params;
  live.current.palette = palette;
  live.current.beat = beat;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);

    let renderer: FxRenderer;
    try {
      renderer = new FxRenderer(canvas);
      renderer.prepare(effect);
    } catch (e: any) {
      setError(e?.message || 'WebGL is not available here.');
      return;
    }

    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const ctx = source.getContext('2d')!;
    const plexus = new MiniPlexus(width, height);

    let raf = 0;
    let last = 0;
    let kick = 1;
    const start = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const l = live.current;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      kick *= 0.94;

      plexus.step();
      plexus.draw(ctx);

      const t = (now - start) / 1000;
      // A synthetic 120 BPM kick: sharp attack, quick decay
      const pulse = l.beat ? Math.pow(Math.max(0, Math.cos(t * Math.PI * 2 * 2)), 6) * 0.85 : 0;

      renderer.resize(width, height, l.params.cell || 2);
      renderer.draw({
        now,
        time: t,
        dt,
        effect,
        params: l.params,
        source,
        pulse,
        wave: null,
        mouse: l.mouse,
        mouseActive: l.mouseActive,
        kick,
        bg: rgb(l.palette.bg),
        ink: rgb(l.palette.ink),
        accent: rgb(l.palette.accent),
        cssWidth: width,
      });
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, [effect, width, height]);

  return (
    <div className="space-y-2">
      <div
        className="relative rounded-lg border border-white/10 overflow-hidden bg-black"
        style={{ width, height, maxWidth: '100%' }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          live.current.mouse = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
          live.current.mouseActive = true;
        }}
        onPointerLeave={() => {
          live.current.mouseActive = false;
        }}
      >
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400 p-4 text-center">{error}</div>
        ) : (
          <canvas ref={canvasRef} style={{ width, height, maxWidth: '100%', imageRendering: 'pixelated' }} />
        )}
      </div>
      <label className="flex items-center gap-2 text-[10px] text-white/50 cursor-pointer">
        <input type="checkbox" checked={beat} onChange={(e) => setBeat(e.target.checked)} className="accent-[#99ccff]" />
        Simulate a 120 BPM beat
      </label>
    </div>
  );
}
