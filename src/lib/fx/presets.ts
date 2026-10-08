/**
 * Which post effect each theme preset uses, and each effect's tunable parameters.
 * Parameters are packed, in order, into two vec4 uniforms (uP0, uP1) for the shaders;
 * the first parameter of every effect is `cell`, the render cell size in CSS pixels.
 */

export type FxEffect = 'dither' | 'riso' | 'glitch' | 'ascii' | 'oscilloscope' | 'marquee';

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface EffectSpec {
  label: string;
  params: ParamSpec[];
}

export const FX_SPECS: Record<FxEffect, EffectSpec> = {
  dither: {
    label: 'Dither',
    params: [
      { key: 'cell', label: 'cell px', min: 1, max: 8, step: 1, default: 3 },
      { key: 'contrast', label: 'contrast', min: 0.5, max: 3, step: 0.05, default: 1.6 },
      { key: 'field', label: 'field', min: 0, max: 1.5, step: 0.05, default: 0.7 },
      { key: 'glow', label: 'glow', min: 0, max: 2, step: 0.05, default: 0.6 },
      { key: 'pulseGain', label: 'beat', min: 0, max: 2, step: 0.05, default: 1 },
    ],
  },
  riso: {
    label: 'Risograph',
    params: [
      { key: 'cell', label: 'cell px', min: 1, max: 4, step: 1, default: 2 },
      { key: 'dot', label: 'dot size', min: 3, max: 12, step: 0.5, default: 5 },
      { key: 'offset', label: 'misregister', min: 0, max: 10, step: 0.5, default: 3 },
      { key: 'grain', label: 'ink dropout', min: 0, max: 1, step: 0.05, default: 0.35 },
      { key: 'field', label: 'field', min: 0, max: 1.5, step: 0.05, default: 0.7 },
      { key: 'contrast', label: 'contrast', min: 0.5, max: 3, step: 0.05, default: 1.4 },
      { key: 'pulseGain', label: 'beat', min: 0, max: 2, step: 0.05, default: 1 },
    ],
  },
  marquee: {
    label: 'Marquee',
    params: [
      { key: 'cell', label: 'cell px', min: 1, max: 3, step: 1, default: 1 },
      { key: 'size', label: 'bulb pitch px', min: 24, max: 90, step: 2, default: 46 },
      { key: 'glow', label: 'glow', min: 0, max: 2, step: 0.05, default: 1 },
      { key: 'speed', label: 'speed', min: 0.2, max: 3, step: 0.1, default: 1 },
      { key: 'pulseGain', label: 'beat flash', min: 0, max: 2, step: 0.05, default: 1 },
    ],
  },
  oscilloscope: {
    label: 'Oscilloscope',
    params: [
      { key: 'cell', label: 'cell px', min: 1, max: 4, step: 1, default: 2 },
      { key: 'decay', label: 'persistence', min: 0.7, max: 0.97, step: 0.01, default: 0.9 },
      { key: 'amp', label: 'trace amp', min: 0, max: 1, step: 0.05, default: 0.35 },
      { key: 'thick', label: 'trace px', min: 1, max: 6, step: 0.5, default: 2 },
      { key: 'glow', label: 'glow', min: 0, max: 2, step: 0.05, default: 1 },
      { key: 'curve', label: 'crt curve', min: 0, max: 1, step: 0.05, default: 0.5 },
      { key: 'pulseGain', label: 'beat', min: 0, max: 2, step: 0.05, default: 1 },
    ],
  },
  ascii: {
    label: 'ASCII',
    params: [
      { key: 'cell', label: 'cell px', min: 1, max: 3, step: 1, default: 1 },
      { key: 'size', label: 'glyph size', min: 6, max: 20, step: 1, default: 9 },
      { key: 'contrast', label: 'contrast', min: 0.5, max: 3, step: 0.05, default: 1.3 },
      { key: 'field', label: 'field', min: 0, max: 1.5, step: 0.05, default: 0.8 },
      { key: 'flicker', label: 'flicker', min: 0, max: 3, step: 0.1, default: 1 },
      { key: 'pulseGain', label: 'beat', min: 0, max: 2, step: 0.05, default: 1 },
    ],
  },
  glitch: {
    label: 'Glitch',
    params: [
      { key: 'cell', label: 'cell px', min: 1, max: 4, step: 1, default: 2 },
      { key: 'intensity', label: 'intensity', min: 0, max: 2, step: 0.05, default: 1 },
      { key: 'split', label: 'rgb split', min: 0, max: 3, step: 0.1, default: 1 },
      { key: 'layers', label: 'print layers', min: 0, max: 400, step: 10, default: 180 },
      { key: 'auto', label: 'auto bursts', min: 0, max: 1, step: 0.05, default: 0.6 },
      { key: 'pulseGain', label: 'beat', min: 0, max: 2, step: 0.05, default: 1 },
    ],
  },
};

export type FxParams = Record<string, number>;

export const defaultsFor = (effect: FxEffect): FxParams =>
  Object.fromEntries(FX_SPECS[effect].params.map((p) => [p.key, p.default]));

/** Pack parameter values (in spec order) into two vec4s. */
export function packParams(effect: FxEffect, values: FxParams): [number[], number[]] {
  const flat = FX_SPECS[effect].params.map((p) => values[p.key] ?? p.default);
  const pad = (a: number[]) => [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 0];
  return [pad(flat.slice(0, 4)), pad(flat.slice(4, 8))];
}

const FX_BY_PRESET: Record<string, FxEffect> = {
  'dither-yellow': 'dither',
  'dither-purple-green': 'dither',
  'riso-blue': 'riso',
  'ascii-green': 'ascii',
  'oscilloscope-red': 'oscilloscope',
  vanity: 'marquee',
  'glitch-print': 'glitch',
};

export function fxForPreset(presetId?: string | null): FxEffect | null {
  return (presetId && FX_BY_PRESET[presetId]) || null;
}
