'use client';

import { useEffect, useRef, useState } from 'react';
import { FRAGMENT_SHADERS, VERTEX_SHADER } from '@/lib/fx/shaders';
import { FX_SPECS, defaultsFor, packParams, type FxEffect, type FxParams } from '@/lib/fx/presets';
import { hexToRgb } from '@/lib/themes';
import { GLYPH_ASPECT, buildAsciiAtlas } from '@/lib/fx/atlas';

interface BackgroundFXProps {
  effect: FxEffect | null;
  palette: { bg: string; ink: string; accent: string };
  getPulse: () => number;
  /** Audio time-domain samples (0..255, 128 = silence) for the scope trace; null when there is none. */
  getWave?: () => Uint8Array | null;
  /** Reports whether the effect is actually drawing (false when WebGL is unavailable). */
  onActiveChange: (active: boolean) => void;
}

interface Program {
  program: WebGLProgram;
  loc: Record<string, WebGLUniformLocation | null>;
}

type ProgramKey = keyof typeof FRAGMENT_SHADERS;

interface GLState {
  gl: WebGLRenderingContext;
  texture: WebGLTexture;
  programs: Partial<Record<ProgramKey, Program>>;
  /** ASCII only: glyph atlas and the small per-cell brightness target of pass 1 */
  atlas?: WebGLTexture;
  luma?: { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };
  /** Oscilloscope only: ping-pong phosphor trail targets and the waveform texture */
  trail?: { fbos: WebGLFramebuffer[]; texs: WebGLTexture[]; w: number; h: number; idx: number };
  wave?: WebGLTexture;
}

const UNIFORMS = [
  'uTex', 'uRes', 'uTime', 'uPulse', 'uMouse', 'uMouseActive', 'uKick', 'uBg', 'uInk', 'uAccent', 'uP0', 'uP1',
  'uScale', 'uAtlas', 'uLuma', 'uGrid', 'uPrev', 'uWave', 'uDecay',
];
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
function programFor(state: GLState, effect: ProgramKey): Program {
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

function ensureAtlas(state: GLState): WebGLTexture {
  if (state.atlas) return state.atlas;
  const { gl } = state;
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAsciiAtlas());
  gl.activeTexture(gl.TEXTURE0);
  state.atlas = tex;
  return tex;
}

/** (Re)allocate the one-pixel-per-character render target when the grid size changes. */
function ensureLuma(state: GLState, w: number, h: number) {
  const { gl } = state;
  let target = state.luma;
  if (!target) {
    const tex = gl.createTexture()!;
    const fbo = gl.createFramebuffer()!;
    target = { fbo, tex, w: 0, h: 0 };
    state.luma = target;
  }
  if (target.w === w && target.h === h) return target;

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, target.tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  target.w = w;
  target.h = h;
  return target;
}

/** Ping-pong render targets for the phosphor trail; reallocated (and cleared) on resize. */
function ensureTrail(state: GLState, w: number, h: number) {
  const { gl } = state;
  let trail = state.trail;
  if (!trail) {
    trail = { fbos: [gl.createFramebuffer()!, gl.createFramebuffer()!], texs: [gl.createTexture()!, gl.createTexture()!], w: 0, h: 0, idx: 0 };
    state.trail = trail;
  }
  if (trail.w === w && trail.h === h) return trail;

  gl.activeTexture(gl.TEXTURE3);
  for (let i = 0; i < 2; i++) {
    gl.bindTexture(gl.TEXTURE_2D, trail.texs[i]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, trail.fbos[i]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, trail.texs[i], 0);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.activeTexture(gl.TEXTURE0);
  trail.w = w;
  trail.h = h;
  trail.idx = 0;
  return trail;
}

function ensureWave(state: GLState): WebGLTexture {
  if (state.wave) return state.wave;
  const { gl } = state;
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  state.wave = tex;
  return tex;
}

/** A quiet scope trace for when no audio is playing: a slow wobble plus a little noise. */
function idleWave(t: number, out: Uint8Array) {
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    out[i] = 128 + 7 * Math.sin(x * Math.PI * 6 + t * 1.7) + 4 * Math.sin(x * Math.PI * 17 - t * 2.9) + (Math.random() - 0.5) * 3;
  }
}

/**
 * Takes the plexus canvas (#agents) as a texture and draws it through the edition's post effect.
 * Sits above the starfield and below every window. The raw plexus keeps drawing underneath, hidden.
 */
export function BackgroundFX({ effect, palette, getPulse, getWave, onActiveChange }: BackgroundFXProps) {
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
    getWave,
    idle: new Uint8Array(512),
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
      if (effect === 'ascii') {
        programFor(glRef.current, 'ascii-luma');
        ensureAtlas(glRef.current);
      }
      if (effect === 'marquee') programFor(glRef.current, 'marquee-luma');
      if (effect === 'oscilloscope') {
        programFor(glRef.current, 'oscilloscope-trail');
        ensureWave(glRef.current);
      }
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

      // The plexus canvas becomes texture unit 0
      const source = document.getElementById('agents') as HTMLCanvasElement | null;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (source && source.width > 0) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      }

      const [p0, p1] = packParams(active, l.params);
      const scale = window.innerWidth / canvas.width; // CSS px per render px
      const setUniforms = (loc: Program['loc'], res: [number, number]) => {
        gl.uniform1i(loc.uTex, 0);
        gl.uniform2f(loc.uRes, res[0], res[1]);
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
        gl.uniform1f(loc.uScale, scale);
      };

      if (active === 'ascii' || active === 'marquee') {
        // Pass 1: one pixel per cell (character or bulb; cheap, many taps), into a small target
        const glyphW = (p0[1] || 9) / scale;
        const glyphH = glyphW * (active === 'ascii' ? GLYPH_ASPECT : 1);
        const gw = Math.max(1, Math.ceil(canvas.width / glyphW));
        const gh = Math.max(1, Math.ceil(canvas.height / glyphH));
        const target = ensureLuma(state, gw, gh);
        const lumaProg = programFor(state, active === 'ascii' ? 'ascii-luma' : 'marquee-luma');

        gl.useProgram(lumaProg.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, gw, gh);
        setUniforms(lumaProg.loc, [canvas.width, canvas.height]);
        gl.uniform2f(lumaProg.loc.uGrid, gw, gh);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Pass 2: full resolution, glyphs from the atlas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        const glyphProg = programFor(state, active);
        gl.useProgram(glyphProg.program);
        setUniforms(glyphProg.loc, [canvas.width, canvas.height]);
        gl.uniform2f(glyphProg.loc.uGrid, gw, gh);
        if (active === 'ascii') {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, state.atlas!);
          gl.uniform1i(glyphProg.loc.uAtlas, 1);
        }
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, target.tex);
        gl.uniform1i(glyphProg.loc.uLuma, 2);
        gl.activeTexture(gl.TEXTURE0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else if (active === 'oscilloscope') {
        const trail = ensureTrail(state, canvas.width, canvas.height);
        const trailProg = programFor(state, 'oscilloscope-trail');

        // Scope trace samples: real audio when playing, a quiet idle wave otherwise
        let wave = l.getWave?.() ?? null;
        if (wave) {
          let lo = 255;
          let hi = 0;
          for (let i = 0; i < wave.length; i += 8) {
            lo = Math.min(lo, wave[i]);
            hi = Math.max(hi, wave[i]);
          }
          if (hi - lo < 4) wave = null;
        }
        if (!wave) {
          idleWave(now / 1000, l.idle);
          wave = l.idle;
        }
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, state.wave!);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, wave.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, wave);

        // Pass 1: previous trail (+ fresh beams) -> the other target
        const read = trail.texs[trail.idx];
        const write = trail.fbos[1 - trail.idx];
        gl.useProgram(trailProg.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, write);
        gl.viewport(0, 0, canvas.width, canvas.height);
        setUniforms(trailProg.loc, [canvas.width, canvas.height]);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, read);
        gl.uniform1i(trailProg.loc.uPrev, 3);
        gl.uniform1i(trailProg.loc.uWave, 4);
        gl.uniform1f(trailProg.loc.uDecay, Math.pow((l.params.decay as number) || 0.9, dt * 60));
        gl.activeTexture(gl.TEXTURE0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        trail.idx = 1 - trail.idx;

        // Pass 2: show the trail we just wrote
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        const displayProg = programFor(state, 'oscilloscope');
        gl.useProgram(displayProg.program);
        setUniforms(displayProg.loc, [canvas.width, canvas.height]);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, trail.texs[trail.idx]);
        gl.uniform1i(displayProg.loc.uPrev, 3);
        gl.activeTexture(gl.TEXTURE0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else {
        const prog = programFor(state, active);
        gl.useProgram(prog.program);
        setUniforms(prog.loc, [canvas.width, canvas.height]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
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
