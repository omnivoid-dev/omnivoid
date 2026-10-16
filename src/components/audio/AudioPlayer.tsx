'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { AudioAnalysisData } from '@/hooks/useAudioAnalyzer';
import type { AudioPlayerEngine, AudioTrack } from '@/hooks/useAudioPlayer';
import { Visualizer, VISUALIZER_STYLES, type VisualizerStyle } from './Visualizer';

export type PlayerMode = 'hidden' | 'compact' | 'window';

export interface PlaylistInfo {
  id: string;
  name: string;
  trackIds: string[];
}

interface AudioPlayerProps {
  engine: AudioPlayerEngine;
  mode: PlayerMode;
  onModeChange: (mode: PlayerMode) => void;
  /** Every active audio track */
  tracks: AudioTrack[];
  playlists: PlaylistInfo[];
  getAudioData: () => AudioAnalysisData;
}

const ALL = 'all';
const PREF_KEY = 'omnivoid.player.view';

export const formatTime = (secs: number) => {
  if (!Number.isFinite(secs) || secs < 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const control =
  'bg-[#111] border border-[#333] rounded px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#99ccff] font-mono min-w-0';

function IconButton({ onClick, active, title, children, size = 'md' }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`${size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-xs'} rounded-full border flex items-center justify-center transition-all ${
        active ? 'bg-[#99ccff]/20 border-[#99ccff]/60 text-[#99ccff]' : 'bg-white/5 border-white/10 hover:border-[#99ccff]/50 text-white/80'
      }`}
    >
      {children}
    </button>
  );
}

function Transport({ engine, full }: { engine: AudioPlayerEngine; full?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {full && (
        <IconButton onClick={engine.toggleShuffle} active={engine.shuffle} title="Shuffle">
          ⤮
        </IconButton>
      )}
      <IconButton onClick={engine.prev} title="Previous">
        ⏮
      </IconButton>
      <button
        type="button"
        onClick={engine.toggle}
        aria-label={engine.isPlaying ? 'Pause' : 'Play'}
        className="w-11 h-11 rounded-full bg-[#99ccff] text-[#050505] font-bold flex items-center justify-center text-sm hover:scale-105 transition-all shadow-lg shadow-[#99ccff]/20"
      >
        {engine.isPlaying ? '⏸' : '▶'}
      </button>
      <IconButton onClick={engine.next} title="Next">
        ⏭
      </IconButton>
      {full && (
        <>
          <IconButton onClick={engine.stop} title="Stop">
            ⏹
          </IconButton>
          <IconButton onClick={engine.cycleRepeat} active={engine.repeat !== 'off'} title={`Repeat: ${engine.repeat}`}>
            {engine.repeat === 'one' ? '🔂' : '🔁'}
          </IconButton>
        </>
      )}
    </div>
  );
}

function Scrubber({ engine }: { engine: AudioPlayerEngine }) {
  return (
    <input
      type="range"
      min={0}
      max={engine.duration || 100}
      step={0.1}
      value={Math.min(engine.currentTime, engine.duration || 100)}
      onChange={(e) => engine.seek(parseFloat(e.target.value))}
      aria-label="Seek"
      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#99ccff]"
    />
  );
}

function Volume({ engine, className = '' }: { engine: AudioPlayerEngine; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button type="button" onClick={() => engine.setVolume(engine.volume === 0 ? 0.8 : 0)} className="text-[11px] text-white/50 hover:text-white" aria-label="Mute">
        {engine.volume === 0 ? '🔇' : '🔊'}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={engine.volume}
        onChange={(e) => engine.setVolume(parseFloat(e.target.value))}
        aria-label="Volume"
        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#99ccff]"
      />
    </div>
  );
}

function ModeButtons({ mode, onModeChange }: { mode: PlayerMode; onModeChange: (m: PlayerMode) => void }) {
  return (
    <div className="flex items-center gap-1.5 text-white/50" onPointerDown={(e) => e.stopPropagation()}>
      {mode === 'window' ? (
        <button type="button" onClick={() => onModeChange('compact')} title="Compact player" aria-label="Compact player" className="px-1.5 hover:text-white text-xs">
          ▭
        </button>
      ) : (
        <button type="button" onClick={() => onModeChange('window')} title="Full player" aria-label="Full player" className="px-1.5 hover:text-white text-xs">
          ⤢
        </button>
      )}
      <button type="button" onClick={() => onModeChange('hidden')} title="Hide (music keeps playing)" aria-label="Hide player" className="px-1.5 hover:text-white text-xs">
        ✕
      </button>
    </div>
  );
}

export function AudioPlayer({ engine, mode, onModeChange, tracks, playlists, getAudioData }: AudioPlayerProps) {
  const [playlistId, setPlaylistId] = useState<string>(ALL);
  const [editionFilter, setEditionFilter] = useState('');
  const [performerFilter, setPerformerFilter] = useState('');
  const [vis, setVis] = useState<VisualizerStyle>('bars');
  const dragControls = useDragControls();

  // Remember the visualiser style and playlist
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      if (VISUALIZER_STYLES.some((s) => s.id === p.vis)) setVis(p.vis);
      if (typeof p.playlistId === 'string') setPlaylistId(p.playlistId);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ vis, playlistId }));
    } catch {
      /* ignore */
    }
  }, [vis, playlistId]);

  // A saved playlist that no longer exists falls back to All tracks
  const activePlaylist = playlists.find((p) => p.id === playlistId) || null;

  const inPlaylist = useMemo(() => {
    if (!activePlaylist) return tracks;
    const byId = new Map(tracks.map((t) => [t.id, t]));
    return activePlaylist.trackIds.map((id) => byId.get(id)).filter((t): t is AudioTrack => !!t);
  }, [tracks, activePlaylist]);

  const editionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of inPlaylist) if (t.editionId && t.editionName) seen.set(t.editionId, t.editionName);
    return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [inPlaylist]);

  const performerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of inPlaylist) if (t.artist?.trim()) seen.set(t.artist.trim().toLowerCase(), t.artist.trim());
    return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [inPlaylist]);

  const shown = useMemo(
    () =>
      inPlaylist.filter(
        (t) => (!editionFilter || t.editionId === editionFilter) && (!performerFilter || t.artist?.trim().toLowerCase() === performerFilter)
      ),
    [inPlaylist, editionFilter, performerFilter]
  );

  const playFromList = (i: number) => engine.playQueue(shown, i);
  const startPlaying = () => {
    if (engine.current) engine.toggle();
    else if (shown.length) playFromList(0);
  };

  // Keyboard shortcuts while the full player is open
  useEffect(() => {
    if (mode !== 'window') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) {
        if (!(el as HTMLInputElement).type || (el as HTMLInputElement).type !== 'range') return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        startPlaying();
      } else if (e.code === 'ArrowRight') engine.seek(Math.min(engine.duration, engine.currentTime + 5));
      else if (e.code === 'ArrowLeft') engine.seek(Math.max(0, engine.currentTime - 5));
      else if (e.code === 'ArrowUp') {
        e.preventDefault();
        engine.setVolume(engine.volume + 0.05);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        engine.setVolume(engine.volume - 0.05);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (mode === 'hidden') return null;

  const current = engine.current;
  const playlistSelect = (
    <select
      value={activePlaylist ? activePlaylist.id : ALL}
      onChange={(e) => {
        setPlaylistId(e.target.value);
        setEditionFilter('');
        setPerformerFilter('');
      }}
      className={`${control} flex-1`}
      aria-label="Playlist"
    >
      <option value={ALL}>All tracks ({tracks.length})</option>
      {playlists.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.trackIds.length})
        </option>
      ))}
    </select>
  );

  const trackList = (maxH: string, numbered = false) => (
    <div className={`${maxH} overflow-y-auto space-y-1`}>
      {shown.length === 0 ? (
        <p className="text-xs text-white/30 p-4 text-center">{tracks.length === 0 ? 'No audio tracks uploaded yet.' : 'No tracks match.'}</p>
      ) : (
        shown.map((t, i) => {
          const isCurrent = current?.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => playFromList(i)}
              className={`w-full flex items-center justify-between gap-3 p-2 rounded text-left text-xs transition-all ${
                isCurrent ? 'bg-[#99ccff]/15 border border-[#99ccff]/40 text-[#99ccff]' : 'bg-white/[0.02] hover:bg-white/5 text-white/70 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {numbered && <span className="text-[10px] opacity-40 w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>}
                <span className="min-w-0">
                  <span className="block truncate">{t.title}</span>
                  {numbered && <span className="block text-[10px] text-white/30 truncate">{[t.artist, t.editionName].filter(Boolean).join(' · ')}</span>}
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {isCurrent && engine.isPlaying && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#99ccff] text-[#050505] font-bold animate-pulse">PLAYING</span>}
                {t.duration ? <span className="text-[10px] text-white/30">{formatTime(t.duration)}</span> : null}
              </span>
            </button>
          );
        })
      )}
    </div>
  );

  // ---------------------------------------------------------------- compact
  if (mode === 'compact') {
    return (
      <AnimatePresence>
        <motion.div
          key="compact"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-16 right-6 w-96 max-w-[calc(100vw-24px)] bg-[#080808]/95 border border-[#99ccff]/30 rounded-xl shadow-2xl z-[250] overflow-hidden backdrop-blur-2xl text-white font-mono"
        >
          <div className="px-4 py-2.5 bg-[#99ccff]/10 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full bg-[#99ccff] ${engine.isPlaying ? 'animate-ping' : ''}`} />
              <span className="text-[11px] font-bold text-[#99ccff] tracking-widest uppercase">AUDIO REACTOR // STREAM</span>
            </div>
            <ModeButtons mode={mode} onModeChange={onModeChange} />
          </div>

          <div className="p-4 bg-black/50 border-b border-white/5 space-y-3">
            <Visualizer getAudioData={getAudioData} style="bars" className="w-full h-12 bg-black/60 rounded border border-white/5" />
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <h4 className="text-xs font-bold text-[#99ccff] truncate">{current ? current.title : 'NO TRACK LOADED'}</h4>
                <p className="text-[9px] text-white/40 truncate">{current?.artist || 'OMNIVOID LABS STREAM'}</p>
              </div>
              <span className="text-[10px] text-white/30 whitespace-nowrap">
                {formatTime(engine.currentTime)} / {formatTime(engine.duration)}
              </span>
            </div>
            <Scrubber engine={engine} />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <IconButton onClick={engine.prev} title="Previous" size="sm">
                  ⏮
                </IconButton>
                <button
                  type="button"
                  onClick={startPlaying}
                  aria-label={engine.isPlaying ? 'Pause' : 'Play'}
                  className="w-10 h-10 rounded-full bg-[#99ccff] text-[#050505] font-bold flex items-center justify-center text-sm hover:scale-105 transition-all shadow-lg shadow-[#99ccff]/20"
                >
                  {engine.isPlaying ? '⏸' : '▶'}
                </button>
                <IconButton onClick={engine.next} title="Next" size="sm">
                  ⏭
                </IconButton>
              </div>
              <Volume engine={engine} className="w-28" />
            </div>
          </div>

          <div className="p-2 space-y-2">
            <div className="flex gap-2 px-1">{playlistSelect}</div>
            {trackList('max-h-44')}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ----------------------------------------------------------------- window
  return (
    <div className="fixed inset-0 z-[250] pointer-events-none flex items-center justify-center pb-12 px-2">
      <motion.div
        key="window"
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        role="dialog"
        aria-label="Audio player"
        className="pointer-events-auto w-[760px] max-w-full max-h-[calc(100vh-72px)] flex flex-col bg-[#080808]/95 border border-[#99ccff] overflow-hidden backdrop-blur-2xl text-white font-mono"
        style={{ boxShadow: '0 0 24px rgba(153, 204, 255, 0.18), 4px 4px 10px rgba(0, 0, 0, 0.5)' }}
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          onDoubleClick={() => onModeChange('compact')}
          className="px-4 py-2.5 bg-[#99ccff]/10 border-b border-white/10 flex items-center justify-between select-none cursor-grab active:cursor-grabbing shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full bg-[#99ccff] ${engine.isPlaying ? 'animate-ping' : ''}`} />
            <span className="text-[11px] font-bold text-[#99ccff] tracking-widest uppercase">AUDIO REACTOR // PLAYER</span>
          </div>
          <ModeButtons mode={mode} onModeChange={onModeChange} />
        </div>

        <div className="overflow-y-auto">
          {/* Display */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_230px] gap-4 p-4 bg-black/50 border-b border-white/5">
            <div className="space-y-2 min-w-0">
              <Visualizer getAudioData={getAudioData} style={vis} className="w-full h-40 bg-black/70 rounded border border-white/5" />
              <div className="flex gap-1">
                {VISUALIZER_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setVis(s.id)}
                    className={`px-2 py-0.5 text-[9px] font-bold tracking-widest rounded border ${
                      vis === s.id ? 'border-[#99ccff]/60 text-[#99ccff] bg-[#99ccff]/10' : 'border-white/10 text-white/40 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <div className="text-3xl font-bold text-[#99ccff] tabular-nums tracking-wider">{formatTime(engine.currentTime)}</div>
                <div className="text-[10px] text-white/30 tabular-nums">-{formatTime(Math.max(0, engine.duration - engine.currentTime))} remaining</div>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate" title={current?.title}>
                  {current ? current.title : 'NO TRACK LOADED'}
                </h4>
                <p className="text-[11px] text-white/50 truncate">{current?.artist || 'OMNIVOID LABS STREAM'}</p>
                {current?.editionName && <p className="text-[10px] text-[#99ccff]/70 truncate">{current.editionName}</p>}
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="p-4 space-y-3 border-b border-white/5">
            <Scrubber engine={engine} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Transport engine={engine} full />
              </div>
              <Volume engine={engine} className="w-44" />
            </div>
          </div>

          {/* Playlist */}
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {playlistSelect}
              <select value={editionFilter} onChange={(e) => setEditionFilter(e.target.value)} className={control} aria-label="Filter by edition">
                <option value="">All editions</option>
                {editionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select value={performerFilter} onChange={(e) => setPerformerFilter(e.target.value)} className={control} aria-label="Filter by performer">
                <option value="">All performers</option>
                {performerOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[9px] text-white/30 uppercase tracking-widest">
              {activePlaylist ? activePlaylist.name : 'All tracks'} · {shown.length} track{shown.length === 1 ? '' : 's'}
            </p>
            {trackList('max-h-60', true)}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
