'use client';

import type { AudioPlayerEngine } from '@/hooks/useAudioPlayer';
import type { PlayerMode } from './AudioPlayer';

interface TaskbarPlayerProps {
  engine: AudioPlayerEngine;
  mode: PlayerMode;
  onToggleOpen: () => void;
}

const mini =
  'w-6 h-6 rounded-full border border-white/10 bg-white/5 hover:border-[#99ccff]/50 hover:text-[#99ccff] flex items-center justify-center text-[10px] text-white/70 transition-all';

/** The player's footprint in the taskbar: open/close button, and the current track with transport once something is loaded. */
export function TaskbarPlayer({ engine, mode, onToggleOpen }: TaskbarPlayerProps) {
  const open = mode !== 'hidden';
  const { current, isPlaying } = engine;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleOpen}
        title={open ? 'Hide the audio player (music keeps playing)' : 'Open the audio player'}
        className={`flex items-center gap-2 text-[10px] font-mono tracking-widest px-3 py-1 rounded transition-all border ${
          open ? 'bg-[#99ccff]/20 text-[#99ccff] border-[#99ccff]/40' : 'bg-white/5 text-white/60 border-white/10 hover:border-[#99ccff]/30 hover:text-white'
        }`}
      >
        <span>🎵</span> AUDIO PLAYER
        {isPlaying && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />}
      </button>
      {current && (
        <div className="hidden md:flex items-center gap-2 max-w-[340px] pl-1">
          <button onClick={engine.prev} className={mini} aria-label="Previous track">
            ⏮
          </button>
          <button onClick={engine.toggle} className={mini} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={engine.next} className={mini} aria-label="Next track">
            ⏭
          </button>
          <button onClick={onToggleOpen} className="min-w-0 text-left" title="Show the player">
            <span className={`block text-[10px] font-mono truncate ${isPlaying ? 'text-[#99ccff]' : 'text-white/50'}`}>
              {current.title}
              {current.artist ? <span className="text-white/30"> · {current.artist}</span> : null}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
