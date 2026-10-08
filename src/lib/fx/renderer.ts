/**
 * FxRenderer: draws one of the post effects onto a canvas, from a source canvas (the plexus).
 * Used by the full-screen background layer and by the small previews in the admin Theme tab.
 * It owns the WebGL context and every render target, and knows nothing about React or the page.
 *
 * Texture units: 0 source canvas, 1 glyph atlas, 2 per-cell target, 3 feedback trail, 4 waveform.
 */

import { FRAGMENT_SHADERS, VERTEX_SHADER } from './shaders';
import { GLYPH_ASPECT, buildAsciiAtlas } from './atlas';
import { packParams, type FxEffect, type FxParams } from './presets';

export interface FrameInput {
  /** performance.now() style milliseconds */
  now: number;
  /** seconds since the renderer's clock started */
  time: number;
  /** seconds since the previous frame */
  dt: number;
  effect: FxEffect;
  params: FxParams;
  source: HTMLCanvasElement | null;
  pulse: number;
  /** Audio time-domain samples for the scope trace; null = idle wave */
  wave: Uint8Array | null;
  mouse: number[];
  mouseActive: boolean;
  kick: number;
  /** Colours as 0..1 triples */
  bg: number[];
  ink: number[];
  accent: number[];
  /** The width the canvas is displayed at in CSS pixels (to convert glyph sizes etc.) */
  cssWidth: number;
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
  atlas?: WebGLTexture;
  luma?: { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };
  trail?: { fbos: WebGLFramebuffer[]; texs: WebGLTexture[]; w: number; h: number; idx: number };
  wave?: WebGLTexture;
}

const UNIFORMS = [
  'uTex', 'uRes', 'uTime', 'uPulse', 'uMouse', 'uMouseActive', 'uKick', 'uBg', 'uInk', 'uAccent', 'uP0', 'uP1',
  'uScale', 'uAtlas', 'uLuma', 'uGrid', 'uPrev', 'uWave', 'uDecay',
];

/** Effects that render a small per-cell target first (pass 1) and then the full-resolution image (pass 2). */
const GRID_PASS: Partial<Record<FxEffect, ProgramKey>> = {
  ascii: 'ascii-luma',
  marquee: 'marquee-luma',
  goo: 'goo-field',
};

/** Effects with a persistent feedback buffer: [update program, display program]. */
const TRAIL_PASS: Partial<Record<FxEffect, [ProgramKey, ProgramKey]>> = {
  oscilloscope: ['oscilloscope-trail', 'oscilloscope'],
  cyanotype: ['cyanotype-trail', 'cyanotype'],
};

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

function setSampler(gl: WebGLRenderingContext, filter: number) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/** A quiet scope trace for when no audio is playing: a slow wobble plus a little noise. */
function idleWave(t: number, out: Uint8Array) {
  for (let i = 0; i < out.length; i++) {
    const x = i / out.length;
    out[i] = 128 + 7 * Math.sin(x * Math.PI * 6 + t * 1.7) + 4 * Math.sin(x * Math.PI * 17 - t * 2.9) + (Math.random() - 0.5) * 3;
  }
}

export class FxRenderer {
  private state: GLState;
  private idle = new Uint8Array(512);

  /** Throws when WebGL is unavailable. */
  constructor(public readonly canvas: HTMLCanvasElement) {
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
    setSampler(gl, gl.LINEAR);

    this.state = { gl, texture, programs: {} };
  }

  /** Compile everything an effect needs, so the first frame does not hitch. Throws on shader errors. */
  prepare(effect: FxEffect) {
    this.program(effect);
    const grid = GRID_PASS[effect];
    if (grid) this.program(grid);
    const trail = TRAIL_PASS[effect];
    if (trail) {
      this.program(trail[0]);
      this.program(trail[1]);
    }
    if (effect === 'ascii') this.ensureAtlas();
    if (effect === 'oscilloscope') this.ensureWave();
  }

  /** Size the canvas to `cssW x cssH` at one render pixel per `cellPx` CSS pixels. */
  resize(cssW: number, cssH: number, cellPx: number) {
    const w = Math.max(1, Math.ceil(cssW / Math.max(1, cellPx)));
    const h = Math.max(1, Math.ceil(cssH / Math.max(1, cellPx)));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.state.gl.viewport(0, 0, w, h);
    }
  }

  /** Free this renderer's GPU resources. The context itself is kept, so the canvas can be reused. */
  dispose() {
    const { gl, texture, programs, atlas, luma, trail, wave } = this.state;
    for (const p of Object.values(programs)) if (p) gl.deleteProgram(p.program);
    for (const t of [texture, atlas, luma?.tex, wave, ...(trail?.texs ?? [])]) if (t) gl.deleteTexture(t);
    for (const f of [luma?.fbo, ...(trail?.fbos ?? [])]) if (f) gl.deleteFramebuffer(f);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.state.programs = {};
    this.state.atlas = undefined;
    this.state.luma = undefined;
    this.state.trail = undefined;
    this.state.wave = undefined;
  }

  // ---------------- resources ----------------

  private program(key: ProgramKey): Program {
    const cached = this.state.programs[key];
    if (cached) return cached;

    const { gl } = this.state;
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADERS[key]));
    gl.bindAttribLocation(program, 0, 'aPos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);

    const loc: Program['loc'] = {};
    for (const name of UNIFORMS) loc[name] = gl.getUniformLocation(program, name);
    const made = { program, loc };
    this.state.programs[key] = made;
    return made;
  }

  private ensureAtlas(): WebGLTexture {
    const s = this.state;
    if (s.atlas) return s.atlas;
    const { gl } = s;
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    setSampler(gl, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAsciiAtlas());
    gl.activeTexture(gl.TEXTURE0);
    s.atlas = tex;
    return tex;
  }

  private ensureWave(): WebGLTexture {
    const s = this.state;
    if (s.wave) return s.wave;
    const { gl } = s;
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    setSampler(gl, gl.LINEAR);
    gl.activeTexture(gl.TEXTURE0);
    s.wave = tex;
    return tex;
  }

  /** (Re)allocate the small per-cell render target when the grid size changes. */
  private ensureLuma(w: number, h: number, linear: boolean) {
    const s = this.state;
    const { gl } = s;
    let target = s.luma;
    if (!target) {
      target = { fbo: gl.createFramebuffer()!, tex: gl.createTexture()!, w: 0, h: 0 };
      s.luma = target;
    }
    // Filter depends on the effect (characters/bulbs want nearest, goo wants smooth)
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, target.tex);
    setSampler(gl, linear ? gl.LINEAR : gl.NEAREST);
    if (target.w !== w || target.h !== h) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      target.w = w;
      target.h = h;
    }
    gl.activeTexture(gl.TEXTURE0);
    return target;
  }

  /** Ping-pong render targets for feedback effects; reallocated (and cleared) on resize. */
  private ensureTrail(w: number, h: number) {
    const s = this.state;
    const { gl } = s;
    let trail = s.trail;
    if (!trail) {
      trail = { fbos: [gl.createFramebuffer()!, gl.createFramebuffer()!], texs: [gl.createTexture()!, gl.createTexture()!], w: 0, h: 0, idx: 0 };
      s.trail = trail;
    }
    if (trail.w === w && trail.h === h) return trail;

    gl.activeTexture(gl.TEXTURE3);
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, trail.texs[i]);
      setSampler(gl, gl.LINEAR);
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

  // ---------------- drawing ----------------

  draw(f: FrameInput) {
    const { gl, texture } = this.state;
    const canvas = this.canvas;
    const W = canvas.width;
    const H = canvas.height;
    const scale = f.cssWidth / W; // CSS px per render px
    const [p0, p1] = packParams(f.effect, f.params);

    // The plexus canvas becomes texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (f.source && f.source.width > 0) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, f.source);
    }

    const setUniforms = (loc: Program['loc']) => {
      gl.uniform1i(loc.uTex, 0);
      gl.uniform2f(loc.uRes, W, H);
      gl.uniform1f(loc.uTime, f.time);
      gl.uniform1f(loc.uPulse, f.pulse);
      gl.uniform2f(loc.uMouse, f.mouse[0], f.mouse[1]);
      gl.uniform1f(loc.uMouseActive, f.mouseActive ? 1 : 0);
      gl.uniform1f(loc.uKick, f.kick);
      gl.uniform3f(loc.uBg, f.bg[0], f.bg[1], f.bg[2]);
      gl.uniform3f(loc.uInk, f.ink[0], f.ink[1], f.ink[2]);
      gl.uniform3f(loc.uAccent, f.accent[0], f.accent[1], f.accent[2]);
      gl.uniform4f(loc.uP0, p0[0], p0[1], p0[2], p0[3]);
      gl.uniform4f(loc.uP1, p1[0], p1[1], p1[2], p1[3]);
      gl.uniform1f(loc.uScale, scale);
    };

    const gridKey = GRID_PASS[f.effect];
    const trailKeys = TRAIL_PASS[f.effect];

    if (gridKey) {
      // Pass 1: one pixel per cell (character, bulb or goo sample), cheap with many taps
      let gw: number;
      let gh: number;
      if (f.effect === 'goo') {
        gw = Math.max(8, Math.ceil(W / 4));
        gh = Math.max(8, Math.ceil(H / 4));
      } else {
        const glyphW = (p0[1] || 9) / scale;
        const glyphH = glyphW * (f.effect === 'ascii' ? GLYPH_ASPECT : 1);
        gw = Math.max(1, Math.ceil(W / glyphW));
        gh = Math.max(1, Math.ceil(H / glyphH));
      }
      const target = this.ensureLuma(gw, gh, f.effect === 'goo');
      const lumaProg = this.program(gridKey);

      gl.useProgram(lumaProg.program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, gw, gh);
      setUniforms(lumaProg.loc);
      gl.uniform2f(lumaProg.loc.uGrid, gw, gh);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Pass 2: full resolution
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      const prog = this.program(f.effect);
      gl.useProgram(prog.program);
      setUniforms(prog.loc);
      gl.uniform2f(prog.loc.uGrid, gw, gh);
      if (f.effect === 'ascii') {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.state.atlas!);
        gl.uniform1i(prog.loc.uAtlas, 1);
      }
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, target.tex);
      gl.uniform1i(prog.loc.uLuma, 2);
      gl.activeTexture(gl.TEXTURE0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }

    if (trailKeys) {
      const trail = this.ensureTrail(W, H);
      const updateProg = this.program(trailKeys[0]);

      if (f.effect === 'oscilloscope') {
        // Scope trace samples: real audio when playing, a quiet idle wave otherwise
        let wave = f.wave;
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
          idleWave(f.now / 1000, this.idle);
          wave = this.idle;
        }
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.state.wave!);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, wave.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, wave);
      }

      // Pass 1: previous trail (+ fresh input) -> the other target
      const read = trail.texs[trail.idx];
      const write = trail.fbos[1 - trail.idx];
      gl.useProgram(updateProg.program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write);
      gl.viewport(0, 0, W, H);
      setUniforms(updateProg.loc);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, read);
      gl.uniform1i(updateProg.loc.uPrev, 3);
      gl.uniform1i(updateProg.loc.uWave, 4);
      gl.uniform1f(updateProg.loc.uDecay, Math.pow(f.params.decay || 0.9, f.dt * 60));
      gl.activeTexture(gl.TEXTURE0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      trail.idx = 1 - trail.idx;

      // Pass 2: show the trail we just wrote
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      const displayProg = this.program(trailKeys[1]);
      gl.useProgram(displayProg.program);
      setUniforms(displayProg.loc);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, trail.texs[trail.idx]);
      gl.uniform1i(displayProg.loc.uPrev, 3);
      gl.activeTexture(gl.TEXTURE0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }

    // Single pass
    const prog = this.program(f.effect);
    gl.useProgram(prog.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    setUniforms(prog.loc);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
