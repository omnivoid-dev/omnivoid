'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioAnalysisData } from '@/hooks/useAudioAnalyzer';

export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  url: string;
  duration?: number;
  editionName?: string;
}

interface AudioPlayerWindowProps {
  tracks: AudioTrack[];
  isOpen: boolean;
  onClose: () => void;
  connectAudioElement: (element: HTMLAudioElement) => void;
  getAudioData: () => AudioAnalysisData;
  onTrackChange?: (track: AudioTrack | null) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export function AudioPlayerWindow({
  tracks,
  isOpen,
  onClose,
  connectAudioElement,
  getAudioData,
  onTrackChange,
  onPlaybackStateChange,
}: AudioPlayerWindowProps) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTrack = tracks[currentTrackIndex] || null;

  // Sync audio element with analyzer on mount or source change
  useEffect(() => {
    if (audioRef.current) {
      connectAudioElement(audioRef.current);
    }
  }, [connectAudioElement, currentTrackIndex]);

  useEffect(() => {
    if (onTrackChange) {
      onTrackChange(currentTrack);
    }
  }, [currentTrackIndex, currentTrack, onTrackChange]);

  useEffect(() => {
    if (onPlaybackStateChange) {
      onPlaybackStateChange(isPlaying);
    }
  }, [isPlaying, onPlaybackStateChange]);

  // Handle Play/Pause
  const togglePlay = async () => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Audio playback error:', err);
      }
    }
  };

  const playTrack = async (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setTimeout(async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
        } catch (err) {
          console.error('Playback error:', err);
        }
      }
    }, 50);
  };

  const handleNext = () => {
    if (tracks.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % tracks.length;
    playTrack(nextIdx);
  };

  const handlePrev = () => {
    if (tracks.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrack(prevIdx);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
  };

  // Mini Visualizer bar canvas rendering
  useEffect(() => {
    let animFrame: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawVisualizer = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const audioData = getAudioData();
      const freq = audioData.frequencyData;

      if (freq && freq.length > 0) {
        const barWidth = 4;
        const gap = 2;
        const totalBars = Math.floor(canvas.width / (barWidth + gap));
        const step = Math.floor(freq.length / totalBars);

        for (let i = 0; i < totalBars; i++) {
          const val = freq[i * step] || 0;
          const barHeight = (val / 255) * canvas.height;
          const x = i * (barWidth + gap);
          const y = canvas.height - barHeight;

          ctx.fillStyle = audioData.isBeat ? '#ffffff' : '#99ccff';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else {
        // Fallback static idle line
        ctx.fillStyle = 'rgba(153, 204, 255, 0.2)';
        ctx.fillRect(0, canvas.height / 2, canvas.width, 2);
      }

      animFrame = requestAnimationFrame(drawVisualizer);
    };

    drawVisualizer();
    return () => cancelAnimationFrame(animFrame);
  }, [getAudioData]);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-16 right-6 w-96 bg-[#080808]/95 border border-[#99ccff]/30 rounded-xl shadow-2xl z-[250] overflow-hidden backdrop-blur-2xl text-white font-mono"
      >
        {/* Hidden Audio Element */}
        {currentTrack && (
          <audio
            ref={audioRef}
            src={currentTrack.url}
            crossOrigin="anonymous"
            onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
            onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
            onEnded={handleNext}
          />
        )}

        {/* Window Title Bar */}
        <div className="px-4 py-2.5 bg-[#99ccff]/10 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#99ccff] animate-ping" />
            <span className="text-[11px] font-bold text-[#99ccff] tracking-widest uppercase">
              AUDIO REACTOR // STREAM
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Visualizer Canvas Header */}
        <div className="p-4 bg-black/50 border-b border-white/5 space-y-3">
          <canvas
            ref={canvasRef}
            width={350}
            height={48}
            className="w-full h-12 bg-black/60 rounded border border-white/5"
          />

          {/* Current Track Info */}
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <h4 className="text-xs font-bold text-[#99ccff] truncate">
                {currentTrack ? currentTrack.title : 'NO TRACK LOADED'}
              </h4>
              <p className="text-[9px] text-white/40 truncate">
                {currentTrack?.artist || 'OMNIVOID LABS STREAM'}
              </p>
            </div>
            <span className="text-[10px] text-white/30 font-mono whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Scrubber */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#99ccff]"
          />

          {/* Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:border-[#99ccff]/50 flex items-center justify-center text-xs transition-all"
              >
                ⏮
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-[#99ccff] text-[#050505] font-bold flex items-center justify-center text-sm hover:scale-105 transition-all shadow-lg shadow-[#99ccff]/20"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                onClick={handleNext}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:border-[#99ccff]/50 flex items-center justify-center text-xs transition-all"
              >
                ⏭
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 w-28">
              <span className="text-[10px] text-white/40">{isMuted ? '🔇' : '🔊'}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={handleVolume}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#99ccff]"
              />
            </div>
          </div>
        </div>

        {/* Playlist Items */}
        <div className="max-h-48 overflow-y-auto p-2 space-y-1">
          <p className="text-[9px] text-white/30 px-2 py-1 uppercase tracking-widest">
            AVAILABLE TRANSMISSIONS ({tracks.length})
          </p>
          {tracks.length === 0 ? (
            <p className="text-xs text-white/30 p-4 text-center">No audio tracks uploaded for this edition.</p>
          ) : (
            tracks.map((track, idx) => (
              <div
                key={track.id}
                onClick={() => playTrack(idx)}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all text-xs ${
                  currentTrackIndex === idx
                    ? 'bg-[#99ccff]/15 border border-[#99ccff]/40 text-[#99ccff]'
                    : 'bg-white/2 hover:bg-white/5 text-white/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-[10px] opacity-40 font-mono">0{idx + 1}</span>
                  <span className="truncate">{track.title}</span>
                </div>
                {currentTrackIndex === idx && isPlaying && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#99ccff] text-[#050505] font-bold animate-pulse">
                    PLAYING
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
