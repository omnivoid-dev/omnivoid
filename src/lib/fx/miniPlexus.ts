/** A small self-contained plexus (agents + connecting lines) to feed the effects, like the site's own. */

/** Small seeded PRNG so a given seed always produces the same motion. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MiniPlexus {
  private agents: { x: number; y: number; vx: number; vy: number }[];
  /** Speed and size are relative to a 420px wide canvas, so bigger canvases look the same. */
  private k: number;

  constructor(private w: number, private h: number, count = 30, seed?: number) {
    const rand = seed === undefined ? Math.random : mulberry32(seed);
    this.k = w / 420;
    this.agents = Array.from({ length: count }, () => ({
      x: rand() * w,
      y: rand() * h,
      vx: rand() - 0.5,
      vy: rand() - 0.5,
    }));
  }

  /** Advance by `frames` 60fps-frames (1 = one frame at 60fps). */
  step(frames = 1) {
    for (const a of this.agents) {
      a.x += a.vx * 0.7 * this.k * frames;
      a.y += a.vy * 0.7 * this.k * frames;
      if (a.x < 0 || a.x > this.w) a.vx *= -1;
      if (a.y < 0 || a.y > this.h) a.vy *= -1;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = this.k;
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
      ctx.arc(a.x, a.y, 2 * this.k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
