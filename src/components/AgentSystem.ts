import { Component } from './Base';
import { Agent } from '../utils/Agent';

/**
 * Color entry for the color lookup table
 */
export interface ColorEntry {
  r: number;
  g: number;
  b: number;
  freqMin: number;
  freqMax: number;
  name: string;
}

/**
 * Theme colors configuration
 */
export interface ThemeColors {
  agent: string;
  connection: string;
  accent: string;
}

/**
 * Color palette from ThemeManager
 */
export interface ColorPalette {
  accent1?: string;
  accent2?: string;
  accent3?: string;
  thumb?: string;
  track?: string;
  foreground?: string;
  background?: string;
  panel?: string;
}

/**
 * Configuration for AgentSystem that can be controlled from backend
 */
export interface AgentSystemConfig {
  agentCount: number;
  connectDistance: number;
  baseSize: number;
  maxSize: number;
}

/**
 * AgentSystem component that manages particle system with connecting lines
 * Uses singleton pattern to ensure both mobile and desktop versions use the same instance
 */
export class AgentSystem extends Component {
  private static instance: AgentSystem | null = null;

  // Canvas properties
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private ownsCanvas!: boolean;
  private width: number = 0;
  private height: number = 0;

  // Animation properties
  private animationFrameId: number | null = null;
  private resizeHandler: (() => void) | null = null;
  private isDestroyed: boolean = false;

  // Agent properties
  private agents: Agent[] = [];
  private agentCount: number = 120;
  private defaultAgentCount: number = 120;
  private baseConnectDist: number = 200;
  private connectDist: number = 200;
  private defaultConnectDist: number = 200;

  // Visual properties
  private baseSize: number = 2;
  private maxSize: number = 12;
  private colorLUT: ColorEntry[] = [];
  private defaultColor: string = '#ffffff';
  private defaultColors: ThemeColors = { agent: '#ffffff', connection: '#ffffff', accent: '#99ccff' };
  private currentThemeColors: ThemeColors = { agent: '#ffffff', connection: '#ffffff', accent: '#99ccff' };

  /**
   * Create a new AgentSystem instance
   */
  constructor() {
    if (AgentSystem.instance) {
      console.log('🎯 AgentSystem: Returning existing singleton instance');
      return AgentSystem.instance;
    }
    
    super();
    
    const canvas = document.getElementById('agents') as HTMLCanvasElement | null;
    this.canvas = canvas || document.createElement('canvas');
    this.ownsCanvas = !canvas;
    
    if (this.ownsCanvas) {
      this.canvas.id = 'agents';
      document.body.appendChild(this.canvas);
    }
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }
    this.ctx = ctx;
    this.agents = [];
    
    // Mobile detection and performance optimization
    this.isMobile = this.detectMobile();
    
    if (this.isMobile) {
      // Mobile-optimized values for better performance
      this.agentCount = 100;
      this.baseConnectDist = 60;
      this.connectDist = 60;
      this.defaultAgentCount = 100;
      this.defaultConnectDist = 60;
    } else {
      // Desktop values
      this.agentCount = 120;
      this.baseConnectDist = 200;
      this.connectDist = 200;
      this.defaultAgentCount = 120;
      this.defaultConnectDist = 200;
    }
    
    // Visual properties (no audio reactivity)
    this.baseSize = 2;
    this.maxSize = 12;
    
    // Color lookup table for audio-reactive colors
    this.colorLUT = this.createColorLookupTable();
    this.defaultColor = getComputedStyle(document.documentElement).getPropertyValue('--fg-color').trim() || '#99ccff';
    
    // Store default colors for restoration
    this.defaultColors = {
      agent: this.defaultColor,
      connection: this.defaultColor,
      accent: '#99ccff' // OMNIVOID blue
    };
    
    // Current theme colors
    this.currentThemeColors = { ...this.defaultColors };
    
    this.setupCanvas();
    this.initAgents();
    this.animate();
    
    // Set the singleton instance
    AgentSystem.instance = this;
    
    console.log('🎯 AgentSystem: Constructor completed - Singleton instance created');
  }

  /**
   * Get the singleton instance of AgentSystem
   * @returns The singleton AgentSystem instance
   */
  static getInstance(): AgentSystem {
    if (!AgentSystem.instance) {
      AgentSystem.instance = new AgentSystem();
    }
    return AgentSystem.instance;
  }

  /**
   * Get the current configuration for backend control
   */
  getConfig(): AgentSystemConfig {
    return {
      agentCount: this.agentCount,
      connectDistance: this.connectDist,
      baseSize: this.baseSize,
      maxSize: this.maxSize
    };
  }

  /**
   * Set configuration from backend
   */
  setConfig(config: Partial<AgentSystemConfig>): void {
    if (config.agentCount !== undefined) {
      this.setAgentCount(config.agentCount);
    }
    if (config.connectDistance !== undefined) {
      this.setConnectionDistance(config.connectDistance);
    }
    if (config.baseSize !== undefined) {
      this.baseSize = config.baseSize;
    }
    if (config.maxSize !== undefined) {
      this.maxSize = config.maxSize;
    }
  }

  /**
   * Detect if the device is mobile for performance optimization
   * @returns True if mobile device, false otherwise
   */
  detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (globalThis.innerWidth <= 768) ||
           ('ontouchstart' in globalThis) ||
           (navigator.maxTouchPoints > 0);
  }

  /**
   * Create a color lookup table that maps frequency ranges to colors
   * @returns Array of color objects with RGB values and frequency ranges
   */
  private createColorLookupTable(): ColorEntry[] {
    return [
      // Deep bass - Deep purple/violet
      { r: 138, g: 43, b: 226, freqMin: 0, freqMax: 0.1, name: 'Deep Bass' },
      // Bass - Blue
      { r: 0, g: 100, b: 255, freqMin: 0.1, freqMax: 0.2, name: 'Bass' },
      // Low-mid - Cyan
      { r: 0, g: 255, b: 255, freqMin: 0.2, freqMax: 0.35, name: 'Low-Mid' },
      // Mid - Green
      { r: 0, g: 255, b: 100, freqMin: 0.35, freqMax: 0.5, name: 'Mid' },
      // High-mid - Yellow
      { r: 255, g: 255, b: 0, freqMin: 0.5, freqMax: 0.65, name: 'High-Mid' },
      // High - Orange
      { r: 255, g: 165, b: 0, freqMin: 0.65, freqMax: 0.8, name: 'High' },
      // Treble - Red
      { r: 255, g: 50, b: 50, freqMin: 0.8, freqMax: 0.9, name: 'Treble' },
      // Ultra-high - Pink/Magenta
      { r: 255, g: 20, b: 147, freqMin: 0.9, freqMax: 1.0, name: 'Ultra-High' }
    ];
  }

  /**
   * Update colors with new random theme palette
   * @param colorPalette Color palette object from ThemeManager
   */
  updateColors(colorPalette: ColorPalette): void {
    this.currentThemeColors = {
      agent: colorPalette.accent1 || colorPalette.foreground || this.defaultColors.agent,
      connection: colorPalette.accent2 || colorPalette.track || this.defaultColors.connection,
      accent: colorPalette.accent3 || colorPalette.thumb || this.defaultColors.accent
    };
    
    // Update the color lookup table with theme colors
    this.updateColorLookupTable(colorPalette);
  }

  /**
   * Update the color lookup table with theme colors
   * @param colorPalette Color palette object
   */
  private updateColorLookupTable(colorPalette: ColorPalette): void {
    // Create new color variations based on the theme palette
    const themeColors = [
      colorPalette.accent1,
      colorPalette.accent2,
      colorPalette.accent3,
      colorPalette.thumb,
      colorPalette.track,
      colorPalette.foreground,
      colorPalette.background,
      colorPalette.panel
    ].filter((color): color is string => Boolean(color)); // Remove undefined colors
    
    if (themeColors.length === 0) return;
    
    // Update the color lookup table with theme-based colors
    this.colorLUT = this.colorLUT.map((colorObj, index) => {
      const themeColor = themeColors[index % themeColors.length];
      const rgb = this.hslToRgb(themeColor);
      
      return {
        ...colorObj,
        r: rgb.r,
        g: rgb.g,
        b: rgb.b
      };
    });
  }

  /**
   * Convert HSL color to RGB
   * @param hslColor HSL color string
   * @returns RGB object
   */
  private hslToRgb(hslColor: string): { r: number; g: number; b: number } {
    const hslMatch = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) return { r: 255, g: 255, b: 255 }; // Default white
    
    const h = parseInt(hslMatch[1]) / 360;
    const s = parseInt(hslMatch[2]) / 100;
    const l = parseInt(hslMatch[3]) / 100;
    
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r: number, g: number, b: number;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  /**
   * Reset colors to default theme
   */
  resetColors(): void {
    this.currentThemeColors = { ...this.defaultColors };
    this.colorLUT = this.createColorLookupTable();
  }

  /**
   * Get color for an agent based on its frequency data
   * @param agentIndex Index of the agent
   * @param intensity Audio intensity multiplier (0-1)
   * @returns CSS color string
   */
  private getAgentColor(agentIndex: number, intensity: number = 1): string {
    // Always return the default theme color (no color randomization)
    return this.currentThemeColors.agent;
  }

  /**
   * Get connection color based on the two connected agents
   * @param agentIndex1 First agent index
   * @param agentIndex2 Second agent index
   * @returns CSS color string
   */
  private getConnectionColor(agentIndex1: number, agentIndex2: number): string {
    // Always return the default connection color (no color randomization)
    return this.currentThemeColors.connection;
  }

  /**
   * Set up the canvas and handle resizing
   */
  private setupCanvas(): void {
    this.resizeHandler = () => {
      this.width = this.canvas.width = globalThis.innerWidth;
      this.height = this.canvas.height = globalThis.innerHeight;
    };
    globalThis.addEventListener('resize', this.resizeHandler);
    this.resizeHandler();
  }

  /**
   * Initialize agents
   */
  private initAgents(): void {
    this.agents = Array.from(
      { length: this.agentCount }, 
      (_, index) => new Agent(this.width, this.height, index)
    );
  }

  /**
   * Set the number of agents
   * @param count Number of agents
   */
  setAgentCount(count: number): void {
    console.log(`🎯 AgentSystem: Setting agent count to ${count}`);
    this.agentCount = Math.max(20, Math.min(120, count));
    
    // Recreate agents with new count
    this.agents = [];
    this.initAgents();
  }

  /**
   * Set the connection distance between agents
   * @param dist Maximum distance for connection
   */
  setConnectDistance(dist: number): void {
    this.baseConnectDist = dist;
    this.connectDist = dist;
  }

  /**
   * Set the connection distance
   * @param distance New connection distance
   */
  setConnectionDistance(distance: number): void {
    console.log(`🔗 AgentSystem: Setting connection distance to ${distance}`);
    this.connectDist = Math.max(100, Math.min(300, distance));
  }

  /**
   * Get current agent count
   * @returns Current agent count
   */
  getAgentCount(): number {
    return this.agentCount;
  }

  /**
   * Get current connection distance
   * @returns Current connection distance
   */
  getConnectionDistance(): number {
    return this.connectDist;
  }

  /**
   * Randomize agent count and connection distance for variety
   */
  randomizeStructure(): void {
    // Random agent count between 80 and 150
    const newAgentCount = Math.floor(Math.random() * 71) + 80;
    
    // Random connection distance between 150 and 250
    const newConnectDist = Math.floor(Math.random() * 101) + 150;
    
    console.log(`🎲 AgentSystem: Randomizing structure - Agents: ${newAgentCount}, Connect: ${newConnectDist}`);
    
    this.setAgentCount(newAgentCount);
    this.setConnectionDistance(newConnectDist);
  }

  /**
   * Reset agent count and connection distance to defaults
   */
  resetStructure(): void {
    console.log(`🔄 AgentSystem: Resetting structure to defaults - Agents: ${this.defaultAgentCount}, Connect: ${this.defaultConnectDist}`);
    
    this.setAgentCount(this.defaultAgentCount);
    this.setConnectionDistance(this.defaultConnectDist);
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (this.isDestroyed) {
      return;
    }

    if (!this.isVisible) {
      this.animationFrameId = requestAnimationFrame(this.animate);
      return;
    }

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw connections
    for (let i = 0; i < this.agents.length; i++) {
      for (let j = i + 1; j < this.agents.length; j++) {
        const a = this.agents[i];
        const b = this.agents[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < this.connectDist) {
          // Base opacity based on distance
          const opacity = 1 - dist / this.connectDist;
          
          // Get color for the connection
          const connectionColor = this.getConnectionColor(i, j);
          
          this.ctx.globalAlpha = Math.min(1, opacity);
          this.ctx.lineWidth = 1;
          this.ctx.strokeStyle = connectionColor;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.stroke();
        }
      }
    }

    // Update and draw agents
    this.ctx.globalAlpha = 1;
    this.ctx.lineWidth = 1;
    
    // Filter out agents that have left the screen bounds and create new ones to maintain count
    const validAgents: Agent[] = [];
    
    this.agents.forEach((agent, index) => {
      // Update agent and check if it's still valid
      const isStillValid = agent.update(this.width, this.height, 1.0);
      
      if (isStillValid) {
        validAgents.push(agent);
        
        // Get scale for this agent (no audio reactivity)
        const scale = 1.0;
        const size = Math.max(0.5, this.baseSize * scale);
        
        // Get color for this agent
        const agentColor = this.getAgentColor(index, 0);
        
        // Set the agent color
        this.ctx.fillStyle = agentColor;
        this.ctx.strokeStyle = agentColor;
        
        agent.draw(this.ctx, size);
      }
    });
    
    // Replace removed agents with new ones to maintain the target count
    const agentsToAdd = this.agentCount - validAgents.length;
    for (let i = 0; i < agentsToAdd; i++) {
      const newAgent = new Agent(this.width, this.height, validAgents.length + i);
      validAgents.push(newAgent);
    }
    
    // Update the agents array with the cleaned up list
    this.agents = validAgents;
    
    // Reset shadow and color for next frame
    this.ctx.shadowBlur = 0;

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Handle visibility changes
   * @param visible Whether the system is now visible
   */
  onVisibilityChange(visible: boolean): void {
    this.isVisible = visible;
    this.canvas.style.display = visible ? 'block' : 'none';
  }

  /**
   * Toggle visibility of the agent system
   * @returns New visibility state
   */
  toggleVisibility(): boolean {
    const newVisibility = !this.isVisible;
    this.onVisibilityChange(newVisibility);
    console.log(`🎯 AgentSystem: Visibility toggled to ${newVisibility ? 'visible' : 'hidden'}`);
    return newVisibility;
  }

  /**
   * Clean up animation and global listeners.
   */
  destroy(): void {
    this.isDestroyed = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.resizeHandler) {
      globalThis.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.ownsCanvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.agents = [];
    AgentSystem.instance = null;
  }
}