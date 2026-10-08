'use client';

import { useEffect, useRef, useState } from 'react';
import { FRAGMENT_SHADERS, VERTEX_SHADER } from '@/lib/fx/shaders';
import { FX_SPECS, defaultsFor, packParams, type FxEffect, type FxParams } from '@/lib/fx/presets';
import { hexToRgb } from '@/lib/themes';

interface BackgroundFXProps {
  effect: FxEffect | null;
  palette: { bg: string; ink: string; accent: string };
  getPulse: () => number;
  /** Reports whether the effect is actually drawing (false when WebGL is unavailable). */
  onActiveChange: (active: boolean) => void;
}

interface Program {
  program: WebGLProgram;
  loc: Record<string, WebGLUniformLocation | null>;
}

interface GLState {
  gl: WebGLRenderingContext;
  texture: WebGLTexture;
  programs: Partial<Record<FxEffect, Program>>;
}

const UNIFORMS = ['uTex', 'uRes', 'uTime', 'uPulse', 'uMouse', 'uMouseActive', 'uKick', 'uBg', 'uInk', 'uAccent', 'uP0', 'uP1'];
const FADE_MS = 800;

const rgb = (hex: string) => hexToRgb(hex).map((c) => c / 255);

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

function createContext(canvas: HTMLCanvasElement): GLState {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL unavailable');

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return { gl, texture, programs: {} };
}

/** Compile an effect's program the first time it is needed. */
function programFor(state: GLState, effect: FxEffect): Program {
  const cached = state.programs[effect];
  if (cached) return cached;

  const { gl } = state;
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADERS[effect]));
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);

  const loc: Program['loc'] = {};
  for (const name of UNIFORMS) loc[name] = gl.getUniformLocation(program, name);
  const made = { program, loc };
  state.programs[effect] = made;
  return made;
}

/**
 * Takes the plexus canvas (#agents) as a texture and draws it through the edition's post effect.
 * Sits above the starfield and below every window. The raw plexus keeps drawing underneath, hidden.
 */
export function BackgroundFX({ effect, palette, getPulse, onActiveChange }: BackgroundFXProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GLState | null>(null);
  const rafRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const failedRef = useRef(false);
  // Keeps showing the last effect while fading out
  const shownEffectRef = useRef<FxEffect | null>(null);

  const [visible, setVisible] = useState(false);
  const [params, setParams] = useState<FxParams>(defaultsFor('dither'));
  const [debug, setDebug] = useState(false);
  const [debugEffect, setDebugEffect] = useState<FxEffect | null>(null);

  const live = useRef({
    effect: null as FxEffect | null,
    params: defaultsFor('dither') as FxParams,
    getPulse,
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
  live.current.targetBg = rgb(palette.bg);
  live.current.targetInk = rgb(palette.ink);
  live.current.targetAccent = rgb(palette.accent);

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

  // Switching effect: load that effect's default parameters
  useEffect(() => {
    if (!effect) return;
    shownEffectRef.current = effect;
    live.current.effect = effect;
    setParams(defaultsFor(effect));
    setDebugEffect(effect);
  }, [effect]);

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

    try {
      if (!glRef.current) glRef.current = createContext(canvas);
      programFor(glRef.current, effect!);
    } catch (e) {
      console.warn('Background FX disabled:', e);
      failedRef.current = true;
      setVisible(false);
      onActiveChange(false);
      return;
    }
    const state = glRef.current;

    const resize = () => {
      const base = (live.current.params.cell as number) || 2;
      const cell = Math.max(1, base * (window.innerWidth < 768 ? 1.34 : 1));
      const w = Math.max(1, Math.ceil(window.innerWidth / cell));
      const h = Math.max(1, Math.ceil(window.innerHeight / cell));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        state.gl.viewport(0, 0, w, h);
      }
    };
    window.addEventListener('resize', resize);

    const frame = (now: number) => {
      rafRef.current = requestAnimationFrame(frame);
      if (document.hidden) return;

      const l = live.current;
      const active = l.effect;
      if (!active) return;

      const { gl, texture } = state;
      const prog = programFor(state, active);
      gl.useProgram(prog.program);
      resize();

      // Ease the palette towards its target (matches the agents' crossfade)
      const ease = (cur: number[], tgt: number[]) => {
        for (let i = 0; i < 3; i++) cur[i] += (tgt[i] - cur[i]) * 0.07;
      };
      ease(l.bg, l.targetBg);
      ease(l.ink, l.targetInk);
      ease(l.accent, l.targetAccent);
      l.kick *= 0.94;

      const source = document.getElementById('agents') as HTMLCanvasElement | null;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (source && source.width > 0) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      }

      const [p0, p1] = packParams(active, l.params);
      const { loc } = prog;
      gl.uniform1i(loc.uTex, 0);
      gl.uniform2f(loc.uRes, canvas.width, canvas.height);
      gl.uniform1f(loc.uTime, (now - l.start) / 1000);
      gl.uniform1f(loc.uPulse, l.getPulse());
      gl.uniform2f(loc.uMouse, l.mouse[0], l.mouse[1]);
      gl.uniform1f(loc.uMouseActive, l.mouseActive ? 1 : 0);
      gl.uniform1f(loc.uKick, l.kick);
      gl.uniform3f(loc.uBg, l.bg[0], l.bg[1], l.bg[2]);
      gl.uniform3f(loc.uInk, l.ink[0], l.ink[1], l.ink[2]);
      gl.uniform3f(loc.uAccent, l.accent[0], l.accent[1], l.accent[2]);
      gl.uniform4f(loc.uP0, p0[0], p0[1], p0[2], p0[3]);
      gl.uniform4f(loc.uP1, p1[0], p1[1], p1[2], p1[3]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
          <div className="text-[10px] font-bold text-[#99ccff] tracking-widest">{FX_SPECS[panelEffect].label.toUpperCase()} TUNING</div>
          {FX_SPECS[panelEffect].params.map((spec) => (
            <label key={spec.key} className="flex items-center gap-2 text-[10px] text-white/70">
              <span className="w-20">{spec.label}</span>
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
          <div className="flex gap-3">
            <button onClick={() => setParams(defaultsFor(panelEffect))} className="text-[10px] text-white/50 hover:text-white">
              reset
            </button>
            <button onClick={() => (live.current.kick = 1)} className="text-[10px] text-white/50 hover:text-white">
              kick
            </button>
          </div>
        </div>
      )}
    </>
  );
}
