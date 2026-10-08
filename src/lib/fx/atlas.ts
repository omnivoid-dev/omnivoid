/**
 * Glyph atlas for the ASCII effect: one row of characters, ordered from empty to dense,
 * rasterised once to a canvas and uploaded as a texture (alpha = glyph coverage).
 */

export const ASCII_RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

/** Raster size of one glyph in the atlas (aspect ~0.55, like a monospace character). */
export const GLYPH_W = 24;
export const GLYPH_H = 44;
/** Glyph height / width on screen. */
export const GLYPH_ASPECT = GLYPH_H / GLYPH_W;

export function buildAsciiAtlas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_W * ASCII_RAMP.length;
  canvas.height = GLYPH_H;

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(GLYPH_H * 0.68)}px "Space Mono", monospace`;

  for (let i = 0; i < ASCII_RAMP.length; i++) {
    ctx.fillText(ASCII_RAMP[i], i * GLYPH_W + GLYPH_W / 2, GLYPH_H / 2 + 2);
  }
  return canvas;
}
