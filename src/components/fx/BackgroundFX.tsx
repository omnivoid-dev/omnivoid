'use client';

import { useEffect, useRef, useState } from 'react';
import { FxRenderer } from '@/lib/fx/renderer';
import { FX_SPECS, defaultsFor, type FxEffect, type FxParams } from '@/lib/fx/presets';
import { hexToRgb } from '@/lib/themes';

interface BackgroundFXProps {
  effect: FxEffect | null;
  palette: { bg: string; ink: string; accent: string };
  /** Tuned parameters saved on the active edition (override the effect's defaults). */
  storedParams?: FxParams | null;
  /** Label of the edition whose theme is active, shown in the tuning panel. */
  editionName?: string;
  getPulse: () => number;
  /** Audio time-domain samples (0..255, 128 = silence) for the scope trace; null when there is none. */
  getWave?: () => Uint8Array | null;
  /** Save the tuned parameters to the active edition. Resolves to a message for the panel. */
  onSaveParams?: (params: FxParams) => Promise<string>;
  /** Reports whether the effect is actually drawing (false when WebGL is unavailable). */
  onActiveChange: (active: boolean) => void;
}

const FADE_MS = 800;
const rgb = (hex: string) => hexToRgb(hex).map((c) => c / 255);

/**
 * Takes the plexus canvas (#agents) and draws it through the edition's post effect.
 * Sits above the starfield and below every window. The raw plexus keeps drawing underneath, hidden.
 * Add ?fxdebug=1 to the URL for live tuning sliders (and saving to the edition when signed in as admin).
 */
export function BackgroundFX({ effect, palette, storedParams, editionName, getPulse, getWave, onSaveParams, onActiveChange }: BackgroundFXProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<FxRenderer | null>(null);
  const rafRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const failedRef = useRef(false);

  const [visible, setVisible] = useState(false);
  const [params, setParams] = useState<FxParams>(defaultsFor('dither'));
  const [debug, setDebug] = useState(false);
  const [debugEffect, setDebugEffect] = useState<FxEffect | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const live = useRef({
    effect: null as FxEffect | null,
    params: defaultsFor('dither') as FxParams,
    getPulse,
    getWave,
    lastFrame: 0,
    bg: rgb(palette.bg),
    ink: rgb(palette.ink),
    accent: rgb(palette.accent),
    targetBg: rgb(palette.bg),
    targetInk: rgb(palette.ink),
    targetAccent: rgb(palette.accent),
    mouse: [0.5, 0.5],
    mouseActive: false,
    kick: 0,
    start: performance.now(),
  });

  live.current.params = params;
  live.current.getPulse = getPulse;
  live.current.getWave = getWave;
  live.current.targetBg = rgb(palette.bg);
  live.current.targetInk = rgb(palette.ink);
  live.current.targetAccent = rgb(palette.accent);

  const storedKey = JSON.stringify(storedParams ?? {});

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has('fxdebug'));
  }, []);

  // A short burst whenever the theme changes
  useEffect(() => {
    live.current.kick = 1;
  }, [effect, palette.bg, palette.ink, palette.accent]);

  // Pointer position for the glow under the cursor
  useEffect(() => {
    const move = (e: PointerEvent) => {
      live.current.mouse = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
      live.current.mouseActive = true;
    };
    const leave = () => {
      live.current.mouseActive = false;
    };
    window.addEventListener('pointermove', move);
    document.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, []);

  // Switching effect or edition: the effect's defaults, overridden by what is saved for this edition
  useEffect(() => {
    if (!effect) return;
    live.current.effect = effect;
    setParams({ ...defaultsFor(effect), ...(storedParams || {}) });
    setDebugEffect(effect);
    setSaveNote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect, storedKey]);

  // Start / stop with the active effect
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const wanted = !!effect && !reduced && !failedRef.current;

    if (!wanted) {
      setVisible(false);
      onActiveChange(false);
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }, FADE_MS + 100);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    clearTimeout(stopTimerRef.current);

    let renderer: FxRenderer;
    try {
      renderer = rendererRef.current ?? (rendererRef.current = new FxRenderer(canvas));
      renderer.prepare(effect!);
    } catch (e) {
      console.warn('Background FX disabled:', e);
      failedRef.current = true;
      setVisible(false);
      onActiveChange(false);
      return;
    }

    const resize = () => {
      const base = live.current.params.cell || 2;
      const cell = Math.max(1, base * (window.innerWidth < 768 ? 1.34 : 1));
      renderer.resize(window.innerWidth, window.innerHeight, cell);
    };
    window.addEventListener('resize', resize);

    const frame = (now: number) => {
      rafRef.current = requestAnimationFrame(frame);
      if (document.hidden) return;

      const l = live.current;
      const active = l.effect;
      if (!active) return;

      resize();

      // Ease the palette towards its target (matches the agents' crossfade)
      const ease = (cur: number[], tgt: number[]) => {
        for (let i = 0; i < 3; i++) cur[i] += (tgt[i] - cur[i]) * 0.07;
      };
      ease(l.bg, l.targetBg);
      ease(l.ink, l.targetInk);
      ease(l.accent, l.targetAccent);
      l.kick *= 0.94;
      const dt = l.lastFrame ? Math.min(0.1, (now - l.lastFrame) / 1000) : 1 / 60;
      l.lastFrame = now;

      renderer.draw({
        now,
        time: (now - l.start) / 1000,
        dt,
        effect: active,
        params: l.params,
        source: document.getElementById('agents') as HTMLCanvasElement | null,
        pulse: l.getPulse(),
        wave: l.getWave?.() ?? null,
        mouse: l.mouse,
        mouseActive: l.mouseActive,
        kick: l.kick,
        bg: l.bg,
        ink: l.ink,
        accent: l.accent,
        cssWidth: window.innerWidth,
      });
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);
    setVisible(true);
    onActiveChange(true);

    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(stopTimerRef.current);
    },
    []
  );

  const save = async () => {
    if (!onSaveParams) return;
    setSaving(true);
    try {
      setSaveNote(await onSaveParams(params));
    } catch (e: any) {
      setSaveNote(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const panelEffect = debugEffect;
  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          width: '100vw',
          height: '100vh',
          imageRendering: 'pixelated',
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />
      {debug && visible && panelEffect && (
        <div className="fixed bottom-16 left-4 z-[300] p-3 bg-black/85 border border-[#99ccff]/30 rounded font-mono space-y-1.5">
          <div className="text-[10px] font-bold text-[#99ccff] tracking-widest">
            {FX_SPECS[panelEffect].label.toUpperCase()} TUNING{editionName ? ` · ${editionName.toUpperCase()}` : ''}
          </div>
          {FX_SPECS[panelEffect].params.map((spec) => (
            <label key={spec.key} className="flex items-center gap-2 text-[10px] text-white/70">
              <span className="w-24">{spec.label}</span>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={params[spec.key] ?? spec.default}
                onChange={(e) => setParams({ ...params, [spec.key]: Number(e.target.value) })}
              />
              <span className="w-10 text-right">{params[spec.key] ?? spec.default}</span>
            </label>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={() => setParams({ ...defaultsFor(panelEffect), ...(storedParams || {}) })} className="text-[10px] text-white/50 hover:text-white">
              revert
            </button>
            <button onClick={() => setParams(defaultsFor(panelEffect))} className="text-[10px] text-white/50 hover:text-white">
              defaults
            </button>
            <button onClick={() => (live.current.kick = 1)} className="text-[10px] text-white/50 hover:text-white">
              kick
            </button>
            {onSaveParams && (
              <button
                onClick={save}
                disabled={saving}
                className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded bg-[#99ccff] text-[#050505] disabled:opacity-50"
              >
                {saving ? 'SAVING...' : 'SAVE TO EDITION'}
              </button>
            )}
          </div>
          {saveNote && <div className="text-[10px] text-[#99ccff]/80 max-w-[260px]">{saveNote}</div>}
        </div>
      )}
    </>
  );
}
