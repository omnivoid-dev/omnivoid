/**
 * Post-effect shaders for the background layer (agents + background only; windows are DOM and unaffected).
 * WebGL1-compatible GLSL. Each effect renders at a reduced "cell" resolution and is scaled up,
 * which keeps it cheap. Shared uniforms:
 *   uTex     the plexus canvas (alpha = presence)        uRes   render size in cells
 *   uTime    seconds                                      uPulse beat energy 0..1
 *   uMouse   0..1 (y up), uMouseActive                    uKick  short burst when the theme changes
 *   uBg/uInk/uAccent  theme palette                       uP0/uP1 packed per-effect parameters
 */

import type { FxEffect } from './presets';
import { ASCII_RAMP, GLYPH_ASPECT } from './atlas';

export const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const COMMON = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uTex;
uniform vec2  uRes;
uniform float uTime;
uniform float uPulse;
uniform vec2  uMouse;
uniform float uMouseActive;
uniform float uKick;
uniform vec3  uBg;
uniform vec3  uInk;
uniform vec3  uAccent;
uniform vec4  uP0;
uniform vec4  uP1;
uniform float uScale;   // CSS pixels per render pixel
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

// How much "agent" is at this point: centre sample plus two rings, so 1px lines survive the downsample
float presence(vec2 uv) {
  vec2 cell = 1.0 / uRes;
  float a = texture2D(uTex, uv).a;
  float g = 0.0;
  for (int i = 0; i < 8; i++) {
    float ang = float(i) * 0.785398;
    vec2 o = vec2(cos(ang), sin(ang));
    g += texture2D(uTex, uv + o * cell * 1.4).a;
    g += texture2D(uTex, uv + o * cell * 3.0).a * 0.5;
  }
  g /= 12.0;
  return clamp(max(a, g * 2.2) + g * 0.6, 0.0, 1.0);
}

float cursorGlow(vec2 uv, float aspect) {
  if (uMouseActive < 0.5) return 0.0;
  return smoothstep(0.34, 0.0, length((uv - uMouse) * vec2(aspect, 1.0)));
}
`;

/** Ordered (Bayer 8x8) dither, two-tone. uP0 = (cell, contrast, field, glow), uP1.x = beat gain. */
const DITHER = `
// Bayer matrices (after Xor): thresholds in [0,1)
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  float contrast = uP0.y;
  float fieldAmt = uP0.z;
  float glow = uP0.w;
  float pulseGain = uP1.x;

  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;

  float src = presence(uv);

  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.05;
  float f = fbm(p * 2.2 + vec2(t, -t * 0.6));
  float vig = smoothstep(1.15, 0.15, length((uv - 0.5) * vec2(aspect, 1.0)));
  float m = cursorGlow(uv, aspect);
  float field = (f * 0.6 + vig * 0.22 + m * 0.5) * fieldAmt;

  float v = src * (1.15 + glow * 0.4) + field * 0.6 + uPulse * pulseGain * 0.18 * vig;
  v = clamp((clamp(v, 0.0, 1.0) - 0.5) * contrast + 0.5, 0.0, 1.0);

  float on = step(bayer8(gl_FragCoord.xy) + 0.0001, v);
  gl_FragColor = vec4(mix(uBg, uInk, on), 1.0);
}
`;

/**
 * Risograph: two spot-colour layers (ink, accent) as rotated halftone dots on a grainy "paper",
 * the second layer slightly misregistered, with random ink dropout.
 * uP0 = (cell, dot size, misregistration px, dropout), uP1 = (field, contrast, beat gain).
 */
const RISO = `
float halftone(vec2 fc, float size, float ang, float d) {
  mat2 r = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = (r * fc) / size;
  vec2 c = fract(q) - 0.5;
  float dist = length(c);
  float rad = sqrt(clamp(d, 0.0, 1.0)) * 0.72;
  float aa = 0.6 / size + 0.04;
  return smoothstep(rad + aa, rad - aa, dist) * step(0.03, d);
}

void main() {
  float dotSize = uP0.y;
  float offsetPx = uP0.z + uKick * 6.0;
  float dropout = uP0.w;
  float fieldAmt = uP1.x;
  float contrast = uP1.y;
  float pulseGain = uP1.z;

  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 px = 1.0 / uRes;

  // Layer B is printed slightly off, with a slow wobble
  vec2 shift = vec2(offsetPx, -offsetPx * 0.6) * px + vec2(sin(uTime * 0.7), cos(uTime * 0.5)) * px * 0.6;
  float srcA = presence(uv);
  float srcB = presence(uv - shift);

  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.04;
  float fa = fbm(p * 2.0 + vec2(t, 0.0));
  float fb = fbm(p * 2.6 + vec2(-t * 0.8, 4.3));
  float vig = smoothstep(1.2, 0.2, length((uv - 0.5) * vec2(aspect, 1.0)));
  float m = cursorGlow(uv, aspect);

  float dA = clamp(srcA * 1.2 + (fa * 0.55 + vig * 0.25) * fieldAmt + m * 0.45 * fieldAmt + uPulse * pulseGain * 0.12, 0.0, 1.0);
  float dB = clamp(srcB * 1.1 + (fb * 0.5 + (1.0 - vig) * 0.12) * fieldAmt * 0.8 + m * 0.35 * fieldAmt + uPulse * pulseGain * 0.15, 0.0, 1.0);
  dA = clamp((dA - 0.5) * contrast + 0.5, 0.0, 1.0);
  dB = clamp((dB - 0.5) * contrast + 0.5, 0.0, 1.0);

  vec2 fc = gl_FragCoord.xy;
  float ha = halftone(fc, dotSize, 0.2618, dA);
  float hb = halftone(fc + vec2(offsetPx * 0.5), dotSize, 1.309, dB);

  // Ink dropout: speckles where the ink failed to cover
  ha *= 1.0 - dropout * step(0.55, hash(floor(fc * 0.9))) * 0.85;
  hb *= 1.0 - dropout * step(0.55, hash(floor(fc * 1.3) + 7.0)) * 0.85;

  vec3 paper = uBg * (0.93 + 0.14 * hash(floor(fc * 0.5)));
  vec3 col = paper;
  col = mix(col, uInk, ha * 0.92);
  col = mix(col, mix(col, uAccent, 0.92), hb);
  col *= 1.0 - 0.18 * ha * hb;   // overprint darkens slightly

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Glitch: row tearing, block swaps, RGB-style channel split (ink vs accent), scanlines,
 * faint print-layer lines and grain. Calm most of the time, with bursts that fire on their own,
 * on the beat, and when the theme changes.
 * uP0 = (cell, intensity, split, print layers), uP1 = (auto burst rate, beat gain).
 */
const GLITCH = `
void main() {
  float intensity = uP0.y;
  float split = uP0.z;
  float layers = uP0.w;
  float autoRate = uP1.x;
  float pulseGain = uP1.y;

  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;

  float tick = floor(uTime * 10.0);
  float env = smoothstep(0.80, 1.0, hash(vec2(floor(uTime * 2.5), 3.1))) * autoRate;
  float burst = clamp(max(env, uPulse * pulseGain * 0.8) + uKick, 0.0, 1.0) * intensity;

  // Row tearing
  float row = floor(uv.y * 36.0);
  float tear = step(1.0 - 0.35 * burst, hash(vec2(row, tick))) * (hash(vec2(row + 11.0, tick)) - 0.5) * 0.18 * burst;
  float calmTick = floor(uTime * 3.0);
  tear += (hash(vec2(row, calmTick)) - 0.5) * 0.004 * intensity * step(0.9, hash(vec2(row, calmTick + 5.0)));
  vec2 uvT = uv + vec2(tear, 0.0);

  // Block swaps
  vec2 grid = vec2(18.0, 10.0);
  vec2 bid = floor(uvT * grid);
  if (hash(bid + tick * 0.37) > 1.0 - 0.07 * burst) {
    vec2 other = floor(vec2(hash(bid + 1.7), hash(bid + 9.1)) * grid);
    uvT = (other + fract(uvT * grid)) / grid;
  }

  // Channel split: ink and accent are sampled either side
  float sp = (0.002 + 0.012 * burst) * split;
  float aInk = presence(uvT - vec2(sp, 0.0));
  float aAcc = presence(uvT + vec2(sp, 0.0));

  vec2 p = vec2(uv.x * aspect, uv.y);
  float f = fbm(p * 3.0 + vec2(uTime * 0.03, 0.0));
  float vig = smoothstep(1.15, 0.15, length((uv - 0.5) * vec2(aspect, 1.0)));
  float m = cursorGlow(uv, aspect);

  vec3 col = uBg;
  col += uInk * clamp(aInk + (f * 0.10 + m * 0.12) * vig, 0.0, 1.0);
  col += uAccent * aAcc;
  col = clamp(col, 0.0, 1.0);

  // Scanlines and faint "print layer" lines
  col *= 0.9 + 0.1 * sin(gl_FragCoord.y * 3.14159);
  if (layers > 1.0) col *= 0.93 + 0.07 * step(0.5, fract(uv.y * layers));

  // Occasional inverted strips during a burst
  if (burst > 0.5 && hash(vec2(row, tick + 3.0)) > 0.96) col = 1.0 - col;

  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.05 * (0.5 + burst);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * ASCII, pass 1: one pixel per character cell. Measures the plexus over the whole cell
 * (49 taps, so thin lines are never missed) and bakes the background field.
 * Output: R = agent presence, G = field, B = cursor proximity.
 * uP0 = (cell, glyph size, contrast, field amount).
 */
const ASCII_LUMA = `
uniform vec2 uGrid;

void main() {
  float size = uP0.y;
  float fieldAmt = uP0.w;
  vec2 glyph = vec2(size, size * ${GLYPH_ASPECT.toFixed(4)}) / uScale;
  vec2 glyphUv = glyph / uRes;
  vec2 uv0 = floor(gl_FragCoord.xy) * glyphUv;

  float peak = 0.0;
  float sum = 0.0;
  for (int j = 0; j < 7; j++) {
    for (int i = 0; i < 7; i++) {
      vec2 t = uv0 + (vec2(float(i), float(j)) + 0.5) / 7.0 * glyphUv;
      float a = texture2D(uTex, t).a;
      peak = max(peak, a);
      sum += a;
    }
  }
  float src = clamp(peak * 0.7 + (sum / 49.0) * 3.0, 0.0, 1.0);

  vec2 uv = uv0 + 0.5 * glyphUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.05;
  float f = fbm(p * 2.4 + vec2(t, -t * 0.6));
  float vig = smoothstep(1.15, 0.15, length((uv - 0.5) * vec2(aspect, 1.0)));
  float m = cursorGlow(uv, aspect);
  float field = clamp((f * 0.6 + vig * 0.22 + m * 0.5) * fieldAmt, 0.0, 1.0);

  gl_FragColor = vec4(src, field, m, 1.0);
}
`;

/**
 * ASCII, pass 2: full resolution. Each character cell reads its brightness from pass 1,
 * picks a glyph from the ramp (empty to dense) and draws it from the atlas.
 * Agents are ink-coloured; the background field is a dim accent. Glyphs shimmer, more so near the cursor.
 * uP0 = (cell, glyph size, contrast, field), uP1 = (flicker, beat gain).
 */
const ASCII_GLYPH = `
uniform sampler2D uAtlas;
uniform sampler2D uLuma;
uniform vec2 uGrid;
const float RAMP_N = ${ASCII_RAMP.length}.0;

void main() {
  float size = uP0.y;
  float contrast = uP0.z;
  float flick = uP1.x;
  float pulseGain = uP1.y;

  vec2 glyph = vec2(size, size * ${GLYPH_ASPECT.toFixed(4)}) / uScale;
  vec2 fc = gl_FragCoord.xy;
  vec2 cellId = floor(fc / glyph);
  vec2 local = fract(fc / glyph);

  vec3 L = texture2D(uLuma, (cellId + 0.5) / uGrid).rgb;
  float src = L.r;
  float field = L.g;
  float near = L.b;

  vec2 uv = (cellId + 0.5) * glyph / uRes;
  float vig = smoothstep(1.15, 0.15, length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0)));

  float v = src * 1.1 + field * 0.6 + uPulse * pulseGain * 0.18 * vig;
  v = clamp((clamp(v, 0.0, 1.0) - 0.5) * contrast + 0.5, 0.0, 1.0);

  // Shimmer: the chosen glyph jitters along the ramp, harder around the cursor
  float step10 = floor(uTime * 10.0);
  float jitter = (hash(cellId + step10) - 0.5) * 2.0 * (flick * 0.06 + near * 0.25 * flick);
  float idx = floor(clamp(v + jitter, 0.0, 0.999) * RAMP_N);

  float a = texture2D(uAtlas, vec2((idx + local.x) / RAMP_N, local.y)).a;

  float agentness = smoothstep(0.12, 0.55, src);
  vec3 gcol = mix(uAccent * 0.6, uInk, agentness);
  gcol = mix(gcol, vec3(1.0), uPulse * pulseGain * 0.15 * agentness);

  gl_FragColor = vec4(mix(uBg, gcol, a), 1.0);
}
`;

/**
 * Oscilloscope, pass 1 (feedback): phosphor persistence.
 * New trail = max(fresh beams, previous trail * decay), with a touch of blur and zoom so the glow
 * spreads. Beams are the agents, a waveform trace drawn from the audio (or an idle wave), and a spot
 * under the cursor that leaves a streak when it moves.
 * uP0 = (cell, persistence, trace amplitude, trace thickness px).
 */
const OSC_TRAIL = `
uniform sampler2D uPrev;
uniform sampler2D uWave;
uniform float uDecay;

float waveY(float x, float amp) {
  return 0.5 + (texture2D(uWave, vec2(x, 0.5)).r - 0.5) * amp * 4.0;
}

void main() {
  float amp = uP0.z;
  float thick = uP0.w;
  float pulseGain = uP1.z;

  vec2 uv = vUv;
  vec2 px = 1.0 / uRes;
  float aspect = uRes.x / uRes.y;

  // Previous trail, slightly zoomed and blurred so the glow breathes outward
  vec2 cuv = (uv - 0.5) * 0.9975 + 0.5;
  float prev = texture2D(uPrev, cuv).r * 0.4
    + (texture2D(uPrev, cuv + vec2(px.x, 0.0)).r + texture2D(uPrev, cuv - vec2(px.x, 0.0)).r
     + texture2D(uPrev, cuv + vec2(0.0, px.y)).r + texture2D(uPrev, cuv - vec2(0.0, px.y)).r) * 0.15;
  prev = max(prev * uDecay - 0.004, 0.0);   // the constant stops 8-bit ghosts from lingering forever

  // Agents as beams
  float beam = clamp(texture2D(uTex, uv).a * 1.3, 0.0, 1.0) * (0.75 + uPulse * pulseGain * 0.25);

  // Waveform trace: distance to the line through three neighbouring samples
  float ampP = amp * (1.0 + uPulse * pulseGain * 0.6);
  float y0 = waveY(uv.x - px.x, ampP);
  float y1 = waveY(uv.x, ampP);
  float y2 = waveY(uv.x + px.x, ampP);
  float lo = min(y0, min(y1, y2)) - px.y * 0.5;
  float hi = max(y0, max(y1, y2)) + px.y * 0.5;
  float d = max(max(lo - uv.y, uv.y - hi), 0.0);
  float trace = smoothstep(thick * px.y, 0.0, d) * (0.85 + uPulse * 0.15);

  // Cursor spot
  float spot = 0.0;
  if (uMouseActive > 0.5) {
    spot = smoothstep(0.014, 0.0, length((uv - uMouse) * vec2(aspect, 1.0))) * 0.9;
  }

  float fresh = max(beam, max(trace, spot));
  gl_FragColor = vec4(max(prev, fresh), 0.0, 0.0, 1.0);
}
`;

/**
 * Oscilloscope, pass 2 (display): the trail rendered as phosphor on a CRT.
 * Intensity maps bg -> ink -> hot accent core, with bloom, raster lines, barrel curvature,
 * vignette, flicker, grain, and horizontal sync jitter that spikes on beats and theme changes.
 * uP1 = (glow, curve, beat gain).
 */
const OSC_DISPLAY = `
uniform sampler2D uPrev;   // the trail just written in pass 1

void main() {
  float glow = uP1.x;
  float curve = uP1.y;
  float pulseGain = uP1.z;

  vec2 uv = vUv;
  vec2 px = 1.0 / uRes;
  vec2 c = uv * 2.0 - 1.0;
  c *= 1.0 + curve * dot(c, c) * 0.12;
  vec2 cuv = c * 0.5 + 0.5;

  // Horizontal sync jitter
  float row = floor(uv.y * 240.0);
  float jit = (hash(vec2(row, floor(uTime * 20.0))) - 0.5) * 0.012 * (uKick + uPulse * pulseGain * 0.5);
  cuv.x += jit;

  float inside = step(0.0, cuv.x) * step(cuv.x, 1.0) * step(0.0, cuv.y) * step(cuv.y, 1.0);

  float core = texture2D(uPrev, cuv).r;
  float bloom = 0.0;
  for (int i = 0; i < 8; i++) {
    float ang = float(i) * 0.785398;
    vec2 o = vec2(cos(ang), sin(ang));
    bloom += texture2D(uPrev, cuv + o * px * 2.0).r;
    bloom += texture2D(uPrev, cuv + o * px * 5.0).r * 0.6;
  }
  bloom /= 12.8;

  vec3 col = uBg * (0.9 + 0.2 * fbm(uv * 4.0 + uTime * 0.02));
  col += uInk * (core * 0.95 + bloom * 0.9 * glow);
  col += uAccent * pow(core, 2.5) * 0.9;

  // Raster lines, vignette, flicker, grain
  col *= 0.84 + 0.16 * step(0.5, fract(gl_FragCoord.y * 0.5));
  col *= mix(0.55, 1.0, smoothstep(1.25, 0.35, length(c)));
  col *= 0.97 + 0.03 * sin(uTime * 60.0);
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.035;

  gl_FragColor = vec4(mix(uBg * 0.25, clamp(col, 0.0, 1.0), inside), 1.0);
}
`;

/**
 * Marquee, pass 1: one pixel per bulb. Measures the plexus over each bulb's cell (49 taps).
 * Output: R = agent presence, B = cursor proximity. uP0 = (cell, bulb pitch px, glow, speed).
 */
const MARQUEE_LUMA = `
uniform vec2 uGrid;

void main() {
  float size = uP0.y;
  vec2 glyph = vec2(size) / uScale;
  vec2 glyphUv = glyph / uRes;
  vec2 uv0 = floor(gl_FragCoord.xy) * glyphUv;

  float peak = 0.0;
  float sum = 0.0;
  for (int j = 0; j < 7; j++) {
    for (int i = 0; i < 7; i++) {
      vec2 t = uv0 + (vec2(float(i), float(j)) + 0.5) / 7.0 * glyphUv;
      float a = texture2D(uTex, t).a;
      peak = max(peak, a);
      sum += a;
    }
  }
  float src = clamp(peak * 0.7 + (sum / 49.0) * 3.0, 0.0, 1.0);
  vec2 uv = uv0 + 0.5 * glyphUv;
  float m = cursorGlow(uv, uRes.x / uRes.y);

  gl_FragColor = vec4(src, 0.0, m, 1.0);
}
`;

/**
 * Marquee, pass 2: a Broadway light wall. Big bulbs on bright maroon that flash in cycling patterns
 * (alternating, sweep chase, radial pulse, twinkle), with the border always chasing. Agents switch the
 * bulbs under them on, the cursor lights its neighbourhood, and every beat (or theme change) flashes the wall.
 * uP0 = (cell, bulb pitch px, glow, speed), uP1.x = beat flash.
 */
const MARQUEE_DISPLAY = `
uniform sampler2D uLuma;
uniform vec2 uGrid;

float pattern(vec2 id, float t) {
  vec2 n = id / uGrid;
  float mode = mod(floor(t / 4.0), 4.0);
  float a = 0.0;
  if (mode < 0.5) {
    a = step(0.5, fract((id.x + id.y) * 0.5 + floor(t * 2.0) * 0.5));     // alternating flash
  } else if (mode < 1.5) {
    a = 1.0 - step(0.3, fract(n.x * 3.0 - t * 0.6));                       // sweep chase
  } else if (mode < 2.5) {
    float d = length((n - 0.5) * vec2(uGrid.x / uGrid.y, 1.0));
    a = 1.0 - step(0.3, fract(d * 2.5 - t * 0.5));                         // radial pulse
  } else {
    a = step(0.72, hash(id + floor(t * 6.0)));                             // twinkle
  }
  float edge = min(min(id.x, uGrid.x - 1.0 - id.x), min(id.y, uGrid.y - 1.0 - id.y));
  if (edge < 1.0) a = max(a, 1.0 - step(0.5, fract((id.x + id.y) * 0.25 - t * 1.5)));   // border chase
  return a;
}

float bulbLevel(vec2 id, float t, float beat) {
  vec2 cid = clamp(id, vec2(0.0), uGrid - 1.0);
  vec3 L = texture2D(uLuma, (cid + 0.5) / uGrid).rgb;
  float l = clamp(0.08 + pattern(cid, t) * (0.6 + 0.4 * beat) * 0.75 + L.r + L.b * 0.6, 0.0, 1.0);
  l = mix(l, 1.0, beat * 0.55);
  return mix(l, 1.0, uKick);
}

void main() {
  float size = uP0.y;
  float glow = uP0.z;
  float speed = uP0.w;
  float beat = clamp(uPulse * uP1.x, 0.0, 1.0);
  float t = uTime * speed;

  float pitch = size / uScale;
  vec2 fc = gl_FragCoord.xy;
  vec2 cellId = floor(fc / pitch);
  vec2 local = fract(fc / pitch) - 0.5;

  // Halo: each lit bulb spills light onto its neighbours
  float halo = 0.0;
  float own = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      float l = bulbLevel(cellId + o, t, beat);
      if (i == 0 && j == 0) own = l;
      vec2 dv = local - o;
      halo += l * (1.0 / (1.0 + 14.0 * dot(dv, dv)));
    }
  }
  halo /= 3.0;

  vec2 uv = fc / uRes;
  vec3 col = uBg * (0.9 + 0.1 * sin(fc.x / pitch * 3.14159));        // faint velvet folds
  col += uAccent * halo * 0.5 * glow;

  float r = length(local);
  float body = smoothstep(0.40, 0.37, r);
  vec3 unlit = mix(uBg * 0.30, uBg * 0.85, smoothstep(0.34, 0.0, length(local - vec2(-0.10, 0.12))));
  vec3 lit = mix(uInk, vec3(1.0), smoothstep(0.26, 0.0, r) * own);
  col = mix(col, mix(unlit, lit, own), body);

  col *= mix(0.65, 1.0, smoothstep(1.3, 0.3, length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0))));
  col += (hash(fc + uTime) - 0.5) * 0.025;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/**
 * Liquid metal, pass 1: a smooth "goo field" at low resolution (one pixel per ~4 render px).
 * Sum of drifting metaballs + the agents (blurred into blobs) + a blob under the cursor, domain-warped by noise.
 * Output: R = field (soft-clipped), G = agent presence (for sparkle).
 * uP0 = (cell, blob size, surface level, shine), uP1 = (warp, beat gain).
 */
const GOO_FIELD = `
uniform vec2 uGrid;

void main() {
  float sizeP = uP0.y;
  float warp = uP1.x;
  float pulseGain = uP1.y;

  vec2 uv = (gl_FragCoord.xy + 0.5) / uGrid;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;

  p += warp * 0.07 * vec2(noise(p * 3.0 + t * 0.15), noise(p * 3.0 + 7.0 - t * 0.12)) ;

  float F = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = vec2(aspect * (0.5 + 0.34 * sin(t * 0.13 * (1.0 + fi * 0.3) + fi * 1.7)),
                  0.5 + 0.32 * cos(t * 0.11 * (1.0 + fi * 0.27) + fi * 2.3));
    float r = (0.10 + 0.03 * fi) * sizeP * (1.0 + uPulse * pulseGain * 0.3);
    vec2 d = p - c;
    F += r * r / (dot(d, d) + 0.0008);
  }
  F *= 0.35;

  // Agents blurred into small blobs
  float a = texture2D(uTex, uv).a;
  for (int i = 0; i < 8; i++) {
    float ang = float(i) * 0.785398;
    vec2 o = vec2(cos(ang), sin(ang));
    a += texture2D(uTex, uv + o * vec2(0.006, 0.011)).a * 0.8;
    a += texture2D(uTex, uv + o * vec2(0.014, 0.025)).a * 0.4;
  }
  a = clamp(a * 0.28, 0.0, 1.0);
  F += a * 0.55;

  if (uMouseActive > 0.5) {
    vec2 d = (uv - uMouse) * vec2(aspect, 1.0);
    F += 0.012 * sizeP / (dot(d, d) + 0.004);
  }

  gl_FragColor = vec4(1.0 - exp(-F * 1.2), a, 0.0, 1.0);
}
`;

/**
 * Liquid metal, pass 2: the field is a chrome surface. Normals from the field's gradient give a fake
 * environment reflection: black chrome with red bands, silver softboxes, a moving specular, and a fresnel rim.
 * Outside the goo, a dark background with a faint red halo. Agents add sparkle on the surface.
 */
const GOO_DISPLAY = `
uniform sampler2D uLuma;
uniform vec2 uGrid;

vec3 envMap(vec3 r, float t) {
  float y = r.y * 0.5 + 0.5;
  vec3 c = vec3(0.012);
  c += uInk * smoothstep(0.55, 0.82, y) * 0.95;                       // red band above
  c += uInk * 0.38 * smoothstep(0.30, 0.0, abs(y - 0.26));             // red strip below
  vec2 b1 = r.xy - vec2(0.45 * sin(t * 0.3), 0.55);                    // overhead softbox
  c += uAccent * smoothstep(0.24, 0.0, length(b1 * vec2(0.7, 1.8))) * 1.3;
  vec2 b2 = r.xy - vec2(-0.5, -0.1 + 0.1 * cos(t * 0.25));             // side strip
  c += uAccent * smoothstep(0.18, 0.0, length(b2 * vec2(2.2, 0.8))) * 0.8;
  return c;
}

void main() {
  float thr = uP0.z;
  float shine = uP0.w;
  float pulseGain = uP1.y;

  vec2 uv = vUv;
  vec2 texel = 1.0 / uGrid;
  float F = texture2D(uLuma, uv).r;
  float Fx = texture2D(uLuma, uv + vec2(texel.x * 2.0, 0.0)).r - texture2D(uLuma, uv - vec2(texel.x * 2.0, 0.0)).r;
  float Fy = texture2D(uLuma, uv + vec2(0.0, texel.y * 2.0)).r - texture2D(uLuma, uv - vec2(0.0, texel.y * 2.0)).r;
  float spark = texture2D(uLuma, uv).g;

  float mask = smoothstep(thr - 0.025, thr + 0.025, F);
  vec3 n = normalize(vec3(-Fx * 7.0, -Fy * 7.0, 1.0));
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);

  float beat = uPulse * pulseGain;
  vec3 metal = envMap(r, uTime) * shine * (1.0 + beat * 0.5);
  float fres = pow(1.0 - n.z, 2.5);
  metal += uInk * fres * 0.8;
  float sp = pow(max(dot(r, normalize(vec3(-0.4 + 0.3 * sin(uTime * 0.4), 0.6, 0.7))), 0.0), 40.0);
  metal += uAccent * sp * 1.5 * shine;
  metal *= 0.5 + 0.5 * n.z;
  metal += uAccent * pow(spark, 3.0) * 0.35;

  float halo = smoothstep(thr - 0.3, thr, F);
  vec3 bgc = uBg + uInk * 0.10 * halo * (1.0 + beat);

  vec3 col = mix(bgc, metal, mask);
  float aspect = uRes.x / uRes.y;
  col *= mix(0.7, 1.0, smoothstep(1.3, 0.3, length((uv - 0.5) * vec2(aspect, 1.0))));
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.02;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/**
 * Cyanotype, pass 1: UV exposure that accumulates. Agents and a "UV lamp" under the cursor slowly expose the
 * paper (brightening it); the exposure fades back very slowly, so movement leaves soft photogram ghosts.
 * uP0 = (cell, fade, exposure, paper grain), uP1 = (brushed edge, beat gain).
 */
const CYANO_TRAIL = `
uniform sampler2D uPrev;
uniform float uDecay;

void main() {
  float expo = uP0.z;
  float pulseGain = uP1.y;
  vec2 uv = vUv;
  vec2 px = 1.0 / uRes;
  float aspect = uRes.x / uRes.y;

  // Exposure diffuses a little as it accumulates
  float prev = texture2D(uPrev, uv).r * 0.6
    + (texture2D(uPrev, uv + vec2(px.x, 0.0)).r + texture2D(uPrev, uv - vec2(px.x, 0.0)).r
     + texture2D(uPrev, uv + vec2(0.0, px.y)).r + texture2D(uPrev, uv - vec2(0.0, px.y)).r) * 0.1;
  prev = max(prev * uDecay - 0.004, 0.0);

  float beam = presence(uv);
  float lamp = 0.0;
  if (uMouseActive > 0.5) lamp = smoothstep(0.10, 0.0, length((uv - uMouse) * vec2(aspect, 1.0)));

  float add = (beam * 0.035 + lamp * 0.03) * expo * (1.0 + uPulse * pulseGain * 0.8);
  gl_FragColor = vec4(clamp(prev + add, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

/**
 * Cyanotype, pass 2: Prussian-blue paper that turns pale where it has been exposed, with paper fibre, grain,
 * dust, and a rough brushed coating edge outside of which the bare paper shows.
 */
const CYANO_DISPLAY = `
uniform sampler2D uPrev;

void main() {
  float grain = uP0.w;
  float border = uP1.x;
  float pulseGain = uP1.y;

  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 fc = gl_FragCoord.xy;

  float E = texture2D(uPrev, uv).r;
  E = clamp(E + uKick * 0.35 + uPulse * pulseGain * 0.12, 0.0, 1.0);

  float mottle = fbm(p * 3.0 + 5.0);
  float fibre = noise(vec2(p.x * 60.0, p.y * 7.0));
  vec3 deep = uBg * (0.85 + 0.3 * mottle);
  vec3 mid = mix(deep, uAccent, 0.45);
  float x = smoothstep(0.05, 0.9, E);
  vec3 img = mix(deep, mid, smoothstep(0.0, 0.5, E));
  img = mix(img, uInk, x * x);
  img *= 1.0 + (hash(fc) - 0.5) * 0.10 * grain + (fibre - 0.5) * 0.10 * grain;
  img = mix(img, uInk, step(0.9994, hash(floor(fc * 0.5) + 3.0)) * 0.9);   // dust

  float bd = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float rough = fbm(p * 10.0) * 0.02 + noise(p * 60.0) * 0.006;
  float coated = smoothstep(0.010 + rough, 0.026 + rough, bd);
  coated = mix(1.0, coated, border);
  vec3 paper = vec3(0.93, 0.91, 0.85) * (0.94 + 0.06 * noise(p * 90.0));

  vec3 col = mix(paper, img, coated);
  col *= mix(0.8, 1.0, smoothstep(1.3, 0.3, length((uv - 0.5) * vec2(aspect, 1.0))));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/**
 * Mandelbrot: an endless smooth zoom into the seahorse valley and back out. Escape-time shading with smooth
 * iteration counts, coloured between the theme's ink and accent, dark inside the set. The plexus is overlaid so
 * the agents float over the fractal; the cursor adds a soft glow; the beat shifts the colour phase.
 * uP0 = (cell, zoom speed, iterations, colour bands), uP1 = (plexus overlay, beat gain).
 */
const MANDELBROT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define ZOOM_MAX 2500.0
#else
#define ZOOM_MAX 40.0
#endif

void main() {
  float speed = uP0.y;
  float iters = uP0.z;
  float palScale = uP0.w;
  float overlay = uP1.x;
  float pulseGain = uP1.y;

  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  float t = uTime * speed;

  float zoom = exp(log(ZOOM_MAX) * (0.5 - 0.5 * cos(t * 0.12)));
  float depth = log(zoom) / log(ZOOM_MAX);
  vec2 centre = mix(vec2(-0.743643887037151, 0.131825904205330), vec2(-0.6, 0.0), pow(1.0 - clamp(depth * 2.0, 0.0, 1.0), 2.0));
  vec2 c = centre + (uv - 0.5) * vec2(aspect, 1.0) * 3.0 / zoom;

  vec2 z = vec2(0.0);
  float n = 0.0;
  float escaped = 0.0;
  for (int i = 0; i < 200; i++) {
    if (float(i) >= iters) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 256.0) { escaped = 1.0; break; }
    n += 1.0;
  }
  float sm = n;
  if (escaped > 0.5) sm = n - log2(log2(dot(z, z))) + 4.0;

  float phase = uTime * 0.15 * speed + uPulse * pulseGain * 1.2 + uKick * 2.0;
  float v = escaped > 0.5 ? 1.0 - exp(-sm * 0.08 * palScale) : 0.0;
  float k = 0.5 + 0.5 * sin(sm * 0.18 * palScale + phase);
  vec3 c1 = mix(uInk, uAccent, k);
  vec3 col = mix(uBg, c1, pow(v, 1.4));

  float pres = presence(uv);
  col += (uAccent * 0.6 + uInk * 0.25) * pres * overlay;
  col += uAccent * cursorGlow(uv, aspect) * 0.15;

  col *= mix(0.75, 1.0, smoothstep(1.3, 0.3, length((uv - 0.5) * vec2(aspect, 1.0))));
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.02;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export const FRAGMENT_SHADERS: Record<FxEffect | 'ascii-luma' | 'oscilloscope-trail' | 'marquee-luma' | 'goo-field' | 'cyanotype-trail', string> = {
  cyanotype: COMMON + CYANO_DISPLAY,
  'cyanotype-trail': COMMON + CYANO_TRAIL,
  mandelbrot: COMMON + MANDELBROT,
  goo: COMMON + GOO_DISPLAY,
  'goo-field': COMMON + GOO_FIELD,
  marquee: COMMON + MARQUEE_DISPLAY,
  'marquee-luma': COMMON + MARQUEE_LUMA,
  oscilloscope: COMMON + OSC_DISPLAY,
  'oscilloscope-trail': COMMON + OSC_TRAIL,
  ascii: COMMON + ASCII_GLYPH,
  'ascii-luma': COMMON + ASCII_LUMA,
  dither: COMMON + DITHER,
  riso: COMMON + RISO,
  glitch: COMMON + GLITCH,
};
