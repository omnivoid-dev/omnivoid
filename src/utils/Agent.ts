/**
 * Agent class for particle system simulation
 */
export class Agent {
  public index: number;
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  /** Natural drift velocity; vx/vy relax back towards it after being steered. */
  public bvx: number = 0;
  public bvy: number = 0;
  /** Smoothed display scale (1 = normal). */
  public scale: number = 1;

  /**
   * Create a new Agent
   * @param width Canvas width
   * @param height Canvas height
   * @param index Agent index for frequency mapping
   */
  constructor(width: number, height: number, index: number = 0) {
    this.index = index;
    this.reset(width, height);
  }

  /**
   * Reset agent to a random position
   * @param width Canvas width
   * @param height Canvas height
   */
  reset(width: number, height: number): void {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5);
    this.vy = (Math.random() - 0.5);
    this.bvx = this.vx;
    this.bvy = this.vy;
  }

  /** Push the agent (acceleration) and cap its speed. */
  steer(ax: number, ay: number, maxSpeed: number): void {
    this.vx += ax;
    this.vy += ay;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }
  }

  /** Ease velocity back to the natural drift. */
  relax(rate: number): void {
    this.vx += (this.bvx - this.vx) * rate;
    this.vy += (this.bvy - this.vy) * rate;
  }

  /**
   * Update agent position
   * @param width Canvas width
   * @param height Canvas height
   * @param speedMultiplier Speed multiplier for audio reactivity (default: 1)
   * @returns True if agent is still within bounds, false if it should be removed
   */
  update(width: number, height: number, speedMultiplier: number = 1): boolean {
    this.x += this.vx * speedMultiplier;
    this.y += this.vy * speedMultiplier;
    
    // Check if agent is completely out of bounds (with margin for cleanup)
    const margin = 50; // Extra margin to ensure clean removal
    const isOutOfBounds = this.x < -margin || this.x > width + margin || 
                         this.y < -margin || this.y > height + margin;
    
    if (isOutOfBounds) {
      return false; // Signal that this agent should be removed
    }
    
    // Bounce off edges if still within bounds
    if (this.x < 0 || this.x > width) { this.vx *= -1; this.bvx *= -1; }
    if (this.y < 0 || this.y > height) { this.vy *= -1; this.bvy *= -1; }
    
    return true; // Agent is still valid
  }

  /**
   * Draw agent on canvas
   * @param ctx Canvas context
   * @param size Size of the agent (default: 2)
   */
  draw(ctx: CanvasRenderingContext2D, size: number = 2): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}