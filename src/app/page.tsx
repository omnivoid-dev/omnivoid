'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RetroWindow, Tab } from '@/components/RetroWindow';
import { SplashScreen } from '@/components/SplashScreen';
import { StartScreen } from '@/components/StartScreen';
import { AgentSystem } from '@/components/AgentSystem';
import { ThreeCanvas } from '@/components/ThreeCanvas';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { AudioPlayerWindow, AudioTrack } from '@/components/AudioPlayerWindow';
import { AgentOverlay } from '@/components/AgentOverlay';
import { TintedImage } from '@/components/TintedImage';
import { DEFAULT_LOGO_URL, LOGO_ASPECT, MENU_ICON_SLOTS, iconUrlFor, resolveBranding, type SiteBranding } from '@/lib/branding';
import { RitualsWindow } from '@/components/edition/RitualsWindow';
import { TransmissionsWindow } from '@/components/edition/TransmissionsWindow';
import { RadioWindow, type PublicRadioShow } from '@/components/edition/RadioWindow';
import { mixcloudEmbedSrc } from '@/lib/mixcloud';
import type { PublicEdition } from '@/components/edition/types';

interface ContentItem {
  id: string;
  type: string;
  title: string;
  path: string;
  category?: string;
  linkType?: string;
  metadata?: any;
  editionId?: string;
  content?: string;
  excerpt?: string;
  thumbnailUrl?: string;
  fileUrl?: string;
}

interface ContentStructure {
  audio: ContentItem[];
  gallery: ContentItem[];
  links: ContentItem[];
  documents: ContentItem[];
  resources: any[];
  radioShows?: PublicRadioShow[];
  branding?: SiteBranding;
  conundrumText?: string;
  contactInfo?: { contactEmail: string; submissionsEmail: string };
  editions: PublicEdition[];
  currentEdition: any | null;
}

interface MenuSection {
  id: string;
  label: string;
  icon: string;
  type: 'documents' | 'audio' | 'gallery' | 'gigs' | 'links' | 'resources';
  categoryId?: string;
  resourceType?: string;
  docType?: string;
  windowPosition: { top: string; left: string };
}

// Tracks served from /public/audio (no database entry needed)
const BUILT_IN_TRACKS: AudioTrack[] = [
  { id: 'builtin-47k-phase-01', title: '47K - Phase 01', artist: '47K', url: '/audio/47K_Phase_01.mp3', editionName: '47K' },
];

const windowGridPositions: Record<string, { top: string; left: string }> = {
  'research': { top: '50vh', left: '50vw' },
  'rituals': { top: '50vh', left: '50vw' },
  'transmissions': { top: '50vh', left: '50vw' },
  'radio': { top: '50vh', left: '50vw' },
  'labs': { top: '50vh', left: '50vw' },
  'gallery': { top: '50vh', left: '50vw' },
  'conundrum': { top: '50vh', left: '50vw' },
  'contact': { top: '50vh', left: '50vw' },
};

const menuSections: MenuSection[] = [
  { id: 'research', label: 'RESEARCH', icon: '📚', type: 'documents', docType: 'RESEARCH', windowPosition: windowGridPositions['research'] },
  { id: 'rituals', label: 'RITUALS', icon: '🎸', type: 'gigs', windowPosition: windowGridPositions['rituals'] },
  { id: 'transmissions', label: 'TRANSMISSIONS', icon: '📡', type: 'links', categoryId: 'live_transmissions', windowPosition: windowGridPositions['transmissions'] },
  { id: 'radio', label: 'RADIO', icon: '📻', type: 'links', categoryId: 'radio', windowPosition: windowGridPositions['radio'] },
  { id: 'gallery', label: 'GALLERY', icon: '🖼️', type: 'resources', resourceType: 'GALLERY', windowPosition: windowGridPositions['gallery'] },
  { id: 'labs', label: 'LABS', icon: '🧪', type: 'links', categoryId: 'labs', windowPosition: windowGridPositions['labs'] },
  { id: 'conundrum', label: 'CONUNDRUM', icon: '🧩', type: 'documents', docType: 'CONUNDRUM', windowPosition: windowGridPositions['conundrum'] },
  { id: 'contact', label: 'CONTACT', icon: '📧', type: 'documents', docType: 'CONTACT', windowPosition: windowGridPositions['contact'] },
];

export default function Home() {
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [isStartComplete, setIsStartComplete] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [content, setContent] = useState<ContentStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openWindows, setOpenWindows] = useState<Record<string, boolean>>({});
  const [windowContents, setWindowContents] = useState<Record<string, string>>({});
  const [windowTabs, setWindowTabs] = useState<Record<string, Tab[]>>({});
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  // Audio & 3D Visualizer state
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [showStarfield, setShowStarfield] = useState(false);

  const { connectAudioElement, getAudioData } = useAudioAnalyzer();

  const agentSystemRef = useRef<AgentSystem | null>(null);

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setContent(data.data);
          if (data.data.currentEdition) {
            setSelectedEditionId(data.data.currentEdition.id);
          } else if (data.data.editions.length > 0) {
            setSelectedEditionId(data.data.editions[0].id);
          }
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load content:', err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isSplashComplete && !agentSystemRef.current) {
      agentSystemRef.current = AgentSystem.getInstance();
    }
    // The plexus pulses with the audio player's analysis
    agentSystemRef.current?.setAudioSource(getAudioData);
  }, [isSplashComplete, getAudioData]);

  // Expose global functions for media links
  useEffect(() => {
    (window as any).openYouTube = (url: string) => {
      setActiveVideoUrl(url);
    };
    (window as any).openMixcloud = (url: string) => {
      setActiveAudioUrl(url);
    };
  }, []);

  useEffect(() => {
    if (content) {
      const updatedContents: Record<string, string> = {};
      const updatedTabs: Record<string, Tab[]> = {};

      menuSections.forEach(section => {
        if (openWindows[section.id]) {
          const { content: c, tabs: t } = formatSectionContent(section);
          updatedContents[section.id] = c;
          updatedTabs[section.id] = t;
        }
      });

      setWindowContents(prev => ({ ...prev, ...updatedContents }));
      setWindowTabs(prev => ({ ...prev, ...updatedTabs }));
    }
  }, [selectedEditionId, content]);

  // Collect audio tracks from database resources, plus the built-in demo track
  const dbTracks: AudioTrack[] = (content?.resources || [])
    .filter(r => (r.type === 'AUDIO' || r.type === 'audio') && (r.editionId === selectedEditionId || !selectedEditionId))
    .map(r => ({
      id: r.id,
      title: r.title,
      artist:
        content?.editions.flatMap(e => e.performers).find(p => p.id === r.performerId)?.name ||
        r.metadata?.artist ||
        'OMNIVOID AUDIO LABS',
      url: r.url || r.filePath || '',
      duration: r.metadata?.duration,
      editionName: content?.editions.find(e => e.id === r.editionId)?.name,
    }));
  const audioTracks: AudioTrack[] = [...BUILT_IN_TRACKS, ...dbTracks];

  const formatSectionContent = (section: MenuSection): { content: string; tabs: Tab[] } => {
    if (!content) return { content: '', tabs: [] };

    let items: any[] = [];
    let html = '';

    switch (section.type) {
      case 'documents':
        if (section.docType === 'CONUNDRUM') {
          html = `
            <div class="prose prose-invert max-w-none font-mono text-xs leading-relaxed text-[#99ccff]">
              <div class="flex items-center gap-2 border-b border-[#99ccff]/30 pb-3 mb-4">
                <span class="text-xl">🧩</span>
                <h3 class="text-base font-bold text-white uppercase tracking-widest">ABOUT OMNIVOID (CONUNDRUM)</h3>
              </div>
              <div class="whitespace-pre-wrap text-white/90 leading-relaxed font-mono bg-white/5 p-4 rounded-lg border border-white/10">
                ${(content as any).conundrumText || 'OMNIVOID is an autonomous sonic & visual research lab.'}
              </div>
            </div>
          `;
        } else if (section.docType === 'CONTACT') {
          const contactInfo = (content as any).contactInfo || { contactEmail: 'contact@omnivoid.dev', submissionsEmail: 'submissions@omnivoid.dev' };
          html = `
            <div class="font-mono space-y-6">
              <div class="flex items-center gap-2 border-b border-[#99ccff]/30 pb-3">
                <span class="text-xl">📧</span>
                <h3 class="text-base font-bold text-white uppercase tracking-widest">CONTACT & SUBMISSIONS</h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-5 bg-white/5 border border-white/10 rounded-xl space-y-2 hover:border-[#99ccff]/40 transition-all">
                  <span class="text-[10px] text-[#99ccff] font-bold uppercase tracking-widest block">GENERAL ENQUIRIES</span>
                  <a href="mailto:${contactInfo.contactEmail}" class="text-sm font-bold text-white hover:text-[#99ccff] transition-colors break-all">
                    ${contactInfo.contactEmail}
                  </a>
                  <p class="text-[10px] text-white/40 pt-1">For general inquiries, collaborations, and media access.</p>
                </div>

                <div class="p-5 bg-white/5 border border-white/10 rounded-xl space-y-2 hover:border-[#99ccff]/40 transition-all">
                  <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">TRACK & DEMO SUBMISSIONS</span>
                  <a href="mailto:${contactInfo.submissionsEmail}" class="text-sm font-bold text-white hover:text-emerald-400 transition-colors break-all">
                    ${contactInfo.submissionsEmail}
                  </a>
                  <p class="text-[10px] text-white/40 pt-1">For audio submissions, stems, and mix proposals.</p>
                </div>
              </div>
            </div>
          `;
        } else {
          // RESEARCH PAPERS & DOCUMENTS
          items = content.documents.filter(d => d.type === 'RESEARCH');
          html = `
            <div class="space-y-4 font-mono">
              ${items.length === 0 ? '<p class="text-white/40">No research papers available in this iteration.</p>' : ''}
              ${items.map(doc => `
                <div class="p-4 bg-white/5 border border-white/10 rounded-lg group hover:border-[#99ccff]/50 transition-all flex gap-4">
                  ${doc.thumbnailUrl ? `<img src="${doc.thumbnailUrl}" alt="" class="w-20 h-28 object-cover rounded border border-white/10 shrink-0" />` : ''}
                  <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-[#99ccff] font-bold text-xs">${doc.title}</h4>
                    <span class="text-[9px] px-2 py-0.5 rounded bg-white/10 text-white/60 font-bold">PDF DOCUMENT</span>
                  </div>
                  <p class="text-[10px] text-white/50 mb-3">${doc.excerpt || 'Research artifact from the OMNIVOID repository.'}</p>
                  <div class="flex justify-between items-center">
                    <span class="text-[9px] text-white/30 font-mono">ID: ${doc.id.slice(-8)}</span>
                    ${doc.fileUrl ? `
                      <a href="${doc.fileUrl}" target="_blank" class="text-[10px] px-3 py-1 bg-[#99ccff] text-[#050505] font-bold rounded hover:bg-[#7ab8e6]">DOWNLOAD PDF ↗</a>
                    ` : `
                      <button class="text-[10px] px-3 py-1 bg-[#99ccff]/10 text-[#99ccff] border border-[#99ccff]/20 rounded">ACCESS DATA</button>
                    `}
                  </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
        return { content: html, tabs: [] };

      case 'resources':
        items = content.resources.filter(r => r.type === 'document' || r.type === 'pdf' || r.type === 'doc');
        html = `
          <div class="space-y-3 font-mono">
             ${items.length === 0 ? '<p class="text-white/40">No research PDF assets found.</p>' : ''}
             ${items.map(res => `
              <div class="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded group hover:border-[#99ccff]/40 transition-all">
                <div class="flex items-center gap-3">
                  <span class="text-xl">📄</span>
                  <div>
                    <div class="text-[11px] font-bold text-white">${res.title}</div>
                    <div class="text-[9px] text-[#99ccff]/50 font-mono">PDF RESEARCH ARTIFACT</div>
                  </div>
                </div>
                ${res.path ? `
                  <a href="${res.path}" target="_blank" class="text-[10px] px-3 py-1 bg-[#99ccff]/10 text-[#99ccff] border border-[#99ccff]/20 rounded hover:bg-[#99ccff]/20">VIEW PDF ↗</a>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `;
        return { content: html, tabs: [] };

      default:
        return { content: 'CONTENT_UNAVAILABLE', tabs: [] };
    }
  };

  const renderLiveSection = (sectionId: string) => {
    if (!content) return null;
    const play = (url: string) => setActiveVideoUrl(url);
    switch (sectionId) {
      case 'rituals':
        return (
          <RitualsWindow
            editions={content.editions}
            selectedEditionId={selectedEditionId}
            onSelectEdition={setSelectedEditionId}
            onPlayVideo={play}
          />
        );
      case 'transmissions':
        return <TransmissionsWindow editions={content.editions} kinds={['SET', 'WORKSHOP', 'OTHER']} title="Transmissions" onPlayVideo={play} />;
      case 'radio':
        return <RadioWindow shows={content.radioShows || []} />;
      case 'labs':
        return <TransmissionsWindow editions={content.editions} kinds={['LABS']} title="Labs sessions" onPlayVideo={play} />;
      default:
        return null;
    }
  };

  const openWindow = (section: MenuSection) => {
    setIsMenuOpen(false);
    if (openWindows[section.id]) {
      setOpenWindows(prev => ({ ...prev, [section.id]: false }));
      return;
    }
    
    const { content: c, tabs: t } = formatSectionContent(section);
    setWindowContents(prev => ({ ...prev, [section.id]: c }));
    setWindowTabs(prev => ({ ...prev, [section.id]: t }));
    setOpenWindows(prev => ({ ...prev, [section.id]: true }));
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!isStartComplete) {
    return <StartScreen onEnter={() => setIsStartComplete(true)} />;
  }

  if (!isSplashComplete) {
    return <SplashScreen onComplete={() => setIsSplashComplete(true)} />;
  }

  const branding = resolveBranding(content?.branding);

  const selectedEditionName = content?.editions.find(e => e.id === selectedEditionId)?.name;

  return (
    <main className="fixed inset-0 bg-[#050505] overflow-hidden flex flex-col">
      {/* 3D WebGL Canvas Background */}
      {showStarfield && <ThreeCanvas />}

      {/* 2D Agent Canvas Overlay (plexus) */}
      <canvas id="agents" className="fixed inset-0 z-0 opacity-60 pointer-events-none" />
      
      {/* Agent Dialogue HUD Overlay */}
      <AgentOverlay
        currentTrackTitle={currentTrack?.title}
        isPlaying={isPlayingAudio}
        selectedEditionName={selectedEditionName}
      />

      {/* Main OMNIVOID Central Logo watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.12, scale: 1 }}
          transition={{ duration: 2 }}
          style={{ width: '15vw', maxWidth: '250px', filter: 'brightness(1.5)' }}
        >
          <TintedImage
            src={branding.logo.url || DEFAULT_LOGO_URL}
            tint={branding.logo.tint}
            aspect={LOGO_ASPECT}
            alt="OMNIVOID"
            style={{ width: '100%' }}
          />
        </motion.div>
      </div>

      {/* Retro Windows */}
      <div className="relative z-50 flex-1">
        {menuSections.map(section => (
          <RetroWindow
            key={section.id}
            id={section.id}
            title={`${section.label} [V4] - ${selectedEditionName || '...'}`}
            content={windowContents[section.id] || ''}
            isOpen={openWindows[section.id] || false}
            onClose={() => setOpenWindows(prev => ({ ...prev, [section.id]: false }))}
            position={section.windowPosition}
            tabs={windowTabs[section.id] || []}
          >
            {renderLiveSection(section.id)}
          </RetroWindow>
        ))}
      </div>

      {/* Audio Player Window */}
      <AudioPlayerWindow
        tracks={audioTracks}
        isOpen={isAudioPlayerOpen}
        onClose={() => setIsAudioPlayerOpen(false)}
        connectAudioElement={connectAudioElement}
        getAudioData={getAudioData}
        onTrackChange={setCurrentTrack}
        onPlaybackStateChange={setIsPlayingAudio}
      />

      {/* Taskbar / Footer */}
      <footer className="fixed bottom-0 left-0 right-0 h-12 bg-black/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-between px-8 z-[200]">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 text-[#99ccff] font-mono text-[10px] tracking-[0.2em] hover:text-white transition-colors"
          >
            <span className="text-sm">▦</span> START
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <button
            onClick={() => setIsAudioPlayerOpen(!isAudioPlayerOpen)}
            className={`flex items-center gap-2 text-[10px] font-mono tracking-widest px-3 py-1 rounded transition-all border ${
              isAudioPlayerOpen 
                ? 'bg-[#99ccff]/20 text-[#99ccff] border-[#99ccff]/40' 
                : 'bg-white/5 text-white/60 border-white/10 hover:border-[#99ccff]/30 hover:text-white'
            }`}
          >
            <span>🎵</span> AUDIO PLAYER {isPlayingAudio && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />}
          </button>
          <button
            onClick={() => setShowStarfield(v => !v)}
            className={`flex items-center gap-2 text-[10px] font-mono tracking-widest px-3 py-1 rounded transition-all border ${
              showStarfield
                ? 'bg-[#99ccff]/20 text-[#99ccff] border-[#99ccff]/40'
                : 'bg-white/5 text-white/60 border-white/10 hover:border-[#99ccff]/30 hover:text-white'
            }`}
          >
            <span>✦</span> STARFIELD {showStarfield ? 'ON' : 'OFF'}
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="text-[10px] text-white/30 font-mono tracking-widest uppercase">
            {selectedEditionName || 'INITIALIZING...'}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-[10px] text-[#99ccff]/40 font-mono">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          <a href="https://www.quantum-climb.com/" target="_blank" className="opacity-40 hover:opacity-100 transition-opacity">
            <img src="/qc.png" alt="QC" className="w-5 h-5 grayscale invert" />
          </a>
        </div>
      </footer>

      {/* Start Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-14 left-4 w-64 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl z-[201] overflow-hidden backdrop-blur-2xl"
          >
            <div className="p-4 bg-[#99ccff]/10 border-b border-white/5">
              <div className="text-[10px] text-[#99ccff] font-bold tracking-[0.3em]">OMNIVOID OS v1.0</div>
            </div>
            <div className="p-2">
              <button
                onClick={() => { setIsAudioPlayerOpen(true); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-[#99ccff] hover:bg-white/5 rounded transition-all text-xs font-mono text-left font-bold"
              >
                <span className="text-lg">🎧</span> AUDIO STREAM PLAYER
              </button>
              <div className="h-[1px] bg-white/10 my-1" />
              {menuSections.map(item => (
                <button
                  key={item.id}
                  onClick={() => openWindow(item)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-white/60 hover:text-[#99ccff] hover:bg-white/5 rounded transition-all text-xs font-mono text-left"
                >
                  {(() => {
                    const url = iconUrlFor(branding, item.id);
                    return url ? (
                      <TintedImage src={url} tint={branding.iconTint} alt="" style={{ width: 22, height: 22 }} />
                    ) : (
                      <span className="text-lg w-[22px] text-center">{MENU_ICON_SLOTS.find(sl => sl.id === item.id)?.fallback ?? item.icon}</span>
                    );
                  })()}
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YouTube Modal Overlay */}
      <AnimatePresence>
        {activeVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl aspect-video bg-black border border-[#99ccff]/30 shadow-2xl rounded-xl overflow-hidden"
            >
              <button 
                onClick={() => setActiveVideoUrl(null)}
                className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-black/50 border border-white/10 text-white rounded-full hover:bg-white hover:text-black transition-all"
              >
                ✕
              </button>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${getYouTubeId(activeVideoUrl)}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mixcloud Modal Overlay */}
      <AnimatePresence>
        {activeAudioUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] border border-[#99ccff]/30 shadow-2xl rounded-xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black">
                <span className="text-xs font-mono text-[#99ccff]">RADIO TRANSMISSION</span>
                <button 
                  onClick={() => setActiveAudioUrl(null)}
                  className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                  ✕
                </button>
              </div>
              <div className="p-0">
                <iframe 
                  width="100%" 
                  height="120" 
                  src={mixcloudEmbedSrc(activeAudioUrl, true)} 
                  frameBorder="0"
                  allow="autoplay"
                />
              </div>
              <div className="p-6 text-center">
                <p className="text-[10px] text-white/40 font-mono">Connecting to Mixcloud secure stream...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        body { background-color: #050505; margin: 0; padding: 0; overflow: hidden; color: white; font-family: 'Space Mono', monospace; }
        canvas#agents { width: 100vw !important; height: 100vh !important; }
      `}</style>
    </main>
  );
}