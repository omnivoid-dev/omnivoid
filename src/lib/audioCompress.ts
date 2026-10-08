/**
 * Browser-side MP3 compression (decode with Web Audio, re-encode with lamejs).
 * Runs before upload so storage and bandwidth stay small, and avoids the serverless
 * request-size cap. Very long files are skipped (decoding needs the whole track in memory).
 */

import { Mp3Encoder } from '@breezystack/lamejs';

export const BITRATE_OPTIONS: { value: number; label: string }[] = [
  { value: 128, label: '128 kbps — recommended (~33% smaller than 192)' },
  { value: 96, label: '96 kbps — smaller (~50% smaller than 192)' },
  { value: 64, label: '64 kbps — speech / ambient (~67% smaller)' },
  { value: 192, label: '192 kbps — high quality' },
  { value: 0, label: 'Original — do not compress' },
];

/** Decoded audio is ~10MB per minute (stereo); stay well inside browser memory. */
const MAX_COMPRESS_SECONDS = 25 * 60;

export interface CompressResult {
  file: File;
  compressed: boolean;
  before: number;
  after: number;
  /** Why the original was kept (when compressed is false). */
  reason?: string;
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function compressMp3(
  file: File,
  kbps: number,
  durationSec: number,
  onProgress?: (fraction: number) => void
): Promise<CompressResult> {
  const keep = (reason: string): CompressResult => ({ file, compressed: false, before: file.size, after: file.size, reason });

  if (!kbps) return keep('Compression turned off.');
  if (durationSec > 0) {
    const currentKbps = (file.size * 8) / durationSec / 1000;
    if (currentKbps <= kbps * 1.05) return keep(`Already about ${Math.round(currentKbps)} kbps, so left as is.`);
    if (durationSec > MAX_COMPRESS_SECONDS) {
      return keep('Too long to compress in the browser (over 25 minutes). Use scripts/compress-audio.ts instead.');
    }
  }

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    return keep('Could not decode this file for compression.');
  } finally {
    ctx.close().catch(() => {});
  }

  // MP3 supports 32/44.1/48 kHz
  const sampleRate = [32000, 44100, 48000].includes(decoded.sampleRate) ? decoded.sampleRate : 44100;
  let source = decoded;
  if (sampleRate !== decoded.sampleRate) {
    const offline = new OfflineAudioContext(decoded.numberOfChannels, Math.ceil(decoded.duration * sampleRate), sampleRate);
    const node = offline.createBufferSource();
    node.buffer = decoded;
    node.connect(offline.destination);
    node.start();
    source = await offline.startRendering();
  }

  const channels = Math.min(2, source.numberOfChannels);
  const left = source.getChannelData(0);
  const right = channels === 2 ? source.getChannelData(1) : left;
  const encoder = new Mp3Encoder(channels, sampleRate, kbps);

  const toInt16 = (f: Float32Array, start: number, end: number) => {
    const out = new Int16Array(end - start);
    for (let i = start; i < end; i++) {
      const v = Math.max(-1, Math.min(1, f[i]));
      out[i - start] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    return out;
  };

  const BLOCK = 1152;
  const parts: Uint8Array[] = [];
  const total = left.length;
  for (let i = 0, n = 0; i < total; i += BLOCK, n++) {
    const end = Math.min(i + BLOCK, total);
    const l = toInt16(left, i, end);
    const buf = channels === 2 ? encoder.encodeBuffer(l, toInt16(right, i, end)) : encoder.encodeBuffer(l);
    if (buf.length > 0) parts.push(new Uint8Array(buf));

    // Keep the page responsive and report progress
    if (n % 400 === 0) {
      onProgress?.(i / total);
      await tick();
    }
  }
  const tail = encoder.flush();
  if (tail.length > 0) parts.push(new Uint8Array(tail));
  onProgress?.(1);

  const blob = new Blob(parts as BlobPart[], { type: 'audio/mpeg' });
  if (blob.size >= file.size) return keep('The compressed version was not smaller, so the original was kept.');

  const name = file.name.replace(/\.[^/.]+$/, '') + '.mp3';
  return { file: new File([blob], name, { type: 'audio/mpeg' }), compressed: true, before: file.size, after: blob.size };
}
