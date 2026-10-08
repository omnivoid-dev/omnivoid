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

export const FRAGMENT_SHADERS: Record<FxEffect, string> = {
  dither: COMMON + DITHER,
  riso: COMMON + RISO,
  glitch: COMMON + GLITCH,
};
