import { useRef, useEffect, useState, useCallback } from 'react';

export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  bass: number;          // 0 to 1
  midrange: number;      // 0 to 1
  treble: number;        // 0 to 1
  overallEnergy: number; // 0 to 1
  isBeat: boolean;       // Transient beat detection
}

// Global WeakSet to prevent re-connecting MediaElementSourceNode to the same audio element
const connectedElements = new WeakSet<HTMLAudioElement>();
let globalAudioContext: AudioContext | null = null;
let globalAnalyserNode: AnalyserNode | null = null;

export function getGlobalAudioContext(): AudioContext {
  if (!globalAudioContext) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioContext = new AudioCtx();
  }
  return globalAudioContext;
}

export function getGlobalAnalyser(): AnalyserNode {
  const ctx = getGlobalAudioContext();
  if (!globalAnalyserNode) {
    globalAnalyserNode = ctx.createAnalyser();
    globalAnalyserNode.fftSize = 1024;
    globalAnalyserNode.smoothingTimeConstant = 0.8;
  }
  return globalAnalyserNode;
}

export function useAudioAnalyzer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const beatHistoryRef = useRef<number[]>([]);

  const [isAudioReady, setIsAudioReady] = useState(false);

  useEffect(() => {
    const ctx = getGlobalAudioContext();
    const analyser = getGlobalAnalyser();
    
    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    setIsAudioReady(true);
  }, []);

  const resumeAudioContext = useCallback(async () => {
    const ctx = audioContextRef.current || getGlobalAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, []);

  const connectAudioElement = useCallback((element: HTMLAudioElement) => {
    if (!element) return;

    try {
      const ctx = audioContextRef.current || getGlobalAudioContext();
      const analyser = analyserRef.current || getGlobalAnalyser();

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (!connectedElements.has(element)) {
        element.crossOrigin = 'anonymous';
        const source = ctx.createMediaElementSource(element);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        connectedElements.add(element);
      }
    } catch (err) {
      console.warn('AudioContext media element connection note:', err);
    }
  }, []);

  const getAudioData = useCallback((): AudioAnalysisData => {
    const defaultData: AudioAnalysisData = {
      frequencyData: new Uint8Array(0),
      timeDomainData: new Uint8Array(0),
      bass: 0,
      midrange: 0,
      treble: 0,
      overallEnergy: 0,
      isBeat: false,
    };

    const analyser = analyserRef.current || globalAnalyserNode;
    if (!analyser) return defaultData;

    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);

    // Calculate frequency bands (assuming sampleRate ~44.1kHz, 512 bins, ~43Hz per bin)
    // Bass: bins 0..12 (~0-500Hz)
    // Midrange: bins 13..100 (~500-4300Hz)
    // Treble: bins 101..256 (~4300-11000Hz)
    let bassSum = 0;
    const bassCount = Math.min(16, bufferLength);
    for (let i = 0; i < bassCount; i++) {
      bassSum += freqData[i];
    }
    const bass = bassSum / (bassCount * 255);

    let midSum = 0;
    const midStart = 16;
    const midEnd = Math.min(120, bufferLength);
    for (let i = midStart; i < midEnd; i++) {
      midSum += freqData[i];
    }
    const midrange = midSum / ((midEnd - midStart) * 255);

    let trebleSum = 0;
    const trebleStart = 120;
    const trebleEnd = Math.min(256, bufferLength);
    for (let i = trebleStart; i < trebleEnd; i++) {
      trebleSum += freqData[i];
    }
    const treble = trebleSum / ((trebleEnd - trebleStart) * 255);

    let totalSum = 0;
    for (let i = 0; i < bufferLength; i++) {
      totalSum += freqData[i];
    }
    const overallEnergy = totalSum / (bufferLength * 255);

    // Simple transient beat detection
    const history = beatHistoryRef.current;
    history.push(bass);
    if (history.length > 20) history.shift();

    const avgBass = history.reduce((a, b) => a + b, 0) / history.length;
    const isBeat = bass > 0.4 && bass > avgBass * 1.35;

    return {
      frequencyData: freqData,
      timeDomainData: timeData,
      bass,
      midrange,
      treble,
      overallEnergy,
      isBeat,
    };
  }, []);

  return {
    isAudioReady,
    audioContext: audioContextRef.current,
    analyserNode: analyserRef.current,
    connectAudioElement,
    resumeAudioContext,
    getAudioData,
  };
}
