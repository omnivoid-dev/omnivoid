'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  url: string;
  duration?: number;
  editionId?: string | null;
  editionName?: string;
  performerId?: string | null;
}

export type RepeatMode = 'off' | 'all' | 'one';

const STORAGE_KEY = 'omnivoid.player';

function readPrefs(): { volume?: number; shuffle?: boolean; repeat?: RepeatMode } {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * The player's engine: one persistent <audio> element plus the queue and transport state.
 * It lives at page level so music keeps playing whatever the player window is doing
 * (hidden, compact or full). The player views only read this state and call its commands.
 *
 * Render the element with:  <audio ref={player.audioRef} {...player.audioProps} />
 */
export function useAudioPlayer(connectAudioElement: (el: HTMLAudioElement) => void) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');

  // Latest values for event handlers that must not go stale
  const live = useRef({ queue, index, shuffle, repeat });
  live.current = { queue, index, shuffle, repeat };
  const history = useRef<number[]>([]);

  const current = index >= 0 ? queue[index] ?? null : null;

  // Restore saved preferences once
  useEffect(() => {
    const p = readPrefs();
    if (typeof p.volume === 'number') setVolumeState(Math.min(1, Math.max(0, p.volume)));
    if (typeof p.shuffle === 'boolean') setShuffle(p.shuffle);
    if (p.repeat === 'off' || p.repeat === 'all' || p.repeat === 'one') setRepeat(p.repeat);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readPrefs(), volume, shuffle, repeat }));
    } catch {
      /* private mode: preferences just are not remembered */
    }
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, shuffle, repeat]);

  /** Point the element at a track and (optionally) start it. Called inside the click that asked for it. */
  const load = useCallback(
    (q: AudioTrack[], i: number, autoplay: boolean) => {
      const audio = audioRef.current;
      const track = q[i];
      if (!audio || !track) return;
      setQueue(q);
      setIndex(i);
      setCurrentTime(0);
      setDuration(track.duration || 0);
      connectAudioElement(audio);
      audio.src = track.url;
      audio.volume = volume;
      if (autoplay) {
        audio.play().catch((err) => console.error('Audio playback error:', err));
      }
    },
    [connectAudioElement, volume]
  );

  const playQueue = useCallback(
    (tracks: AudioTrack[], startIndex = 0) => {
      history.current = [];
      load(tracks, startIndex, true);
    },
    [load]
  );

  const pickNext = useCallback((dir: 1 | -1, fromEnd = false): number | null => {
    const { queue: q, index: i, shuffle: sh, repeat: rep } = live.current;
    if (q.length === 0) return null;
    if (dir === -1) {
      if (history.current.length) return history.current.pop()!;
      return i > 0 ? i - 1 : rep === 'all' || !fromEnd ? q.length - 1 : null;
    }
    history.current.push(i);
    if (sh && q.length > 1) {
      let n = i;
      while (n === i) n = Math.floor(Math.random() * q.length);
      return n;
    }
    if (i + 1 < q.length) return i + 1;
    return rep === 'all' || !fromEnd ? 0 : null;
  }, []);

  const next = useCallback(() => {
    const n = pickNext(1);
    if (n !== null) load(live.current.queue, n, true);
  }, [load, pickNext]);

  const prev = useCallback(() => {
    // More than 3 seconds in: restart the track instead of going back
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const n = pickNext(-1);
    if (n !== null) load(live.current.queue, n, true);
  }, [load, pickNext]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !live.current.queue.length) return;
    if (audio.paused) audio.play().catch((err) => console.error('Audio playback error:', err));
    else audio.pause();
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
  }, []);

  const seek = useCallback((t: number) => {
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  }, []);

  const setVolume = useCallback((v: number) => setVolumeState(Math.min(1, Math.max(0, v))), []);
  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')), []);

  const onEnded = useCallback(() => {
    const audio = audioRef.current;
    if (live.current.repeat === 'one' && audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    const n = pickNext(1, true);
    if (n !== null) load(live.current.queue, n, true);
    else setIsPlaying(false);
  }, [load, pickNext]);

  // Browser/OS media keys and lock-screen info
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (current) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: current.title, artist: current.artist || 'OMNIVOID LABS', album: current.editionName || 'OMNIVOID' });
    }
    navigator.mediaSession.setActionHandler('play', toggle);
    navigator.mediaSession.setActionHandler('pause', toggle);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
  }, [current, toggle, prev, next]);

  const audioProps = {
    crossOrigin: 'anonymous' as const,
    preload: 'metadata' as const,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onTimeUpdate: () => audioRef.current && setCurrentTime(audioRef.current.currentTime),
    onLoadedMetadata: () => audioRef.current && Number.isFinite(audioRef.current.duration) && setDuration(audioRef.current.duration),
    onEnded,
  };

  return {
    audioRef,
    audioProps,
    queue,
    index,
    current,
    isPlaying,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    playQueue,
    toggle,
    next,
    prev,
    stop,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  };
}

export type AudioPlayerEngine = ReturnType<typeof useAudioPlayer>;
