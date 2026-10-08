/**
 * Text "decode" transition: text appears as random glyphs and settles, left to right,
 * into the real characters. Operates directly on DOM text nodes so any content inside a
 * container gets the effect with no per-component changes.
 *
 * Safety rules for living next to React:
 *  - only Text.nodeValue is written, never structure;
 *  - a node is abandoned the moment its value differs from what we last wrote (React changed it);
 *  - whitespace is never scrambled, so layout does not shift (the UI font is monospace).
 */

const GLYPHS = '!<>-_\\/[]{}=+*^?#%&0123456789ABCDEFXZ';
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'IFRAME', 'NOSCRIPT']);
const MAX_NODES = 400;

export interface DecodeOptions {
  /** ms between consecutive text nodes starting (cascade down the page). */
  stagger?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  /** ms per character; long text is capped by maxDuration. */
  perChar?: number;
}

const DEFAULTS: Required<DecodeOptions> = { stagger: 22, maxDelay: 450, minDuration: 520, maxDuration: 1200, perChar: 16 };

/** How often a still-unsettled character swaps to a new glyph (ms). Slower = more readable swaps. */
const SWAP_INTERVAL = 55;

interface Job {
  node: Text;
  target: string;
  chars: string[];
  start: number;
  duration: number;
  last: string;
  /** Per-character progress at which it locks in (random, so characters settle unevenly). */
  settleAt: number[];
  glyphs: string[];
  lastSwap: number;
}

const jobs = new Map<Text, Job>();
/** Final values we wrote ourselves, so the MutationObserver can ignore its own echo. */
const finalValue = new WeakMap<Text, string>();
let raf = 0;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const isSpace = (c: string) => /\s/.test(c);
const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

function render(job: Job, p: number): string {
  let out = '';
  for (let i = 0; i < job.chars.length; i++) {
    const c = job.chars[i];
    out += isSpace(c) || p >= job.settleAt[i] ? c : job.glyphs[i];
  }
  return out;
}

function tick(now: number) {
  raf = 0;
  for (const job of jobs.values()) {
    // React (or anything else) changed this text: leave it alone
    if (job.node.nodeValue !== job.last) {
      jobs.delete(job.node);
      continue;
    }

    const p = (now - job.start) / job.duration;
    if (p >= 1) {
      job.node.nodeValue = job.target;
      finalValue.set(job.node, job.target);
      jobs.delete(job.node);
      continue;
    }

    // Unsettled characters swap glyphs a few times a second, then lock in at their own moment
    if (now - job.lastSwap >= SWAP_INTERVAL) {
      for (let i = 0; i < job.glyphs.length; i++) job.glyphs[i] = glyph();
      job.lastSwap = now;
    }
    job.last = render(job, Math.max(p, 0));
    job.node.nodeValue = job.last;
  }
  if (jobs.size > 0) raf = requestAnimationFrame(tick);
}

function schedule(node: Text, delay: number, opts: Required<DecodeOptions>) {
  const target = node.nodeValue ?? '';
  const chars = Array.from(target);
  if (chars.every(isSpace)) return;

  const duration = Math.min(opts.maxDuration, Math.max(opts.minDuration, chars.length * opts.perChar));
  const settleAt = chars.map((_, i) => 0.15 + (i / Math.max(1, chars.length)) * 0.5 + Math.random() * 0.35);
  const glyphs = chars.map(glyph);
  const job: Job = { node, target, chars, start: performance.now() + delay, duration, last: '', settleAt, glyphs, lastSwap: 0 };
  job.last = render(job, 0);
  node.nodeValue = job.last;
  jobs.set(node, job);
  if (!raf) raf = requestAnimationFrame(tick);
}

function textNodesIn(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const parent = n.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest('[data-no-decode]')) return NodeFilter.FILTER_REJECT;
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (jobs.has(n as Text)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode() && out.length < MAX_NODES) out.push(walker.currentNode as Text);
  return out;
}

/** Decode every text node under `root` (cascading top to bottom). */
export function decodeTree(root: Node, options: DecodeOptions = {}) {
  if (prefersReducedMotion()) return;
  const opts = { ...DEFAULTS, ...options };
  textNodesIn(root).forEach((node, i) => schedule(node, Math.min(i * opts.stagger, opts.maxDelay), opts));
}

/** Decode a single text node (used when React updates text in place). */
export function decodeNode(node: Text, options: DecodeOptions = {}) {
  if (prefersReducedMotion() || jobs.has(node)) return;
  if (!node.nodeValue?.trim()) return;
  schedule(node, 0, { ...DEFAULTS, ...options });
}

/** Stop everything, putting the real text back. */
export function cancelDecodes() {
  for (const job of jobs.values()) {
    if (job.node.nodeValue === job.last) {
      job.node.nodeValue = job.target;
      finalValue.set(job.node, job.target);
    }
  }
  jobs.clear();
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

/**
 * Keep decoding as content changes inside `root`: new nodes and in-place text updates are
 * decoded; our own writes are ignored. Returns a disposer.
 */
export function observeDecode(root: Element, options: DecodeOptions = {}): () => void {
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') {
        const node = r.target as Text;
        if (jobs.has(node) || finalValue.get(node) === node.nodeValue) continue;
        decodeNode(node, options);
      } else {
        r.addedNodes.forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE) {
            const parent = n.parentElement;
            if (parent && !SKIP_TAGS.has(parent.tagName) && !parent.closest('[data-no-decode]')) decodeNode(n as Text, options);
          } else if (n.nodeType === Node.ELEMENT_NODE) {
            decodeTree(n, options);
          }
        });
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}
