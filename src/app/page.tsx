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
}

interface ContentStructure {
  audio: ContentItem[];
  gallery: ContentItem[];
  gigs: ContentItem[];
  links: ContentItem[];
  documents: ContentItem[];
  resources: any[];
  editions: { id: string; name: string; slug: string; isActive: boolean; sortOrder: number }[];
  latestGig: any | null;
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
  }, [isSplashComplete]);

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

  // Collect audio tracks from database resources
  const audioTracks: AudioTrack[] = (content?.resources || [])
    .filter(r => (r.type === 'AUDIO' || r.type === 'audio') && (r.editionId === selectedEditionId || !selectedEditionId))
    .map(r => ({
      id: r.id,
      title: r.title,
      artist: r.metadata?.artist || 'OMNIVOID AUDIO LABS',
      url: r.url || r.filePath || '',
      duration: r.metadata?.duration,
      editionName: content?.editions.find(e => e.id === r.editionId)?.name,
    }));

  const formatSectionContent = (section: MenuSection): { content: string; tabs: Tab[] } => {
    if (!content) return { content: '', tabs: [] };

    let items: any[] = [];
    let html = '';

    switch (section.type) {
      case 'documents':
        items = content.documents.filter(d => 
          (d.editionId === selectedEditionId || !d.editionId) && 
          d.type === section.docType
        );
        
        if (section.docType === 'CONUNDRUM' || section.docType === 'CONTACT') {
          const doc = items[0];
          html = doc ? `
            <div class="prose prose-invert max-w-none font-mono text-xs leading-relaxed text-[#99ccff]">
              <h3 class="text-lg font-bold text-white mb-4 border-b border-[#99ccff]/20 pb-2">${doc.title}</h3>
              <div class="whitespace-pre-wrap">${doc.content}</div>
            </div>
          ` : '<p class="text-white/40">Knowledge base record not found.</p>';
        } else {
          html = `
            <div class="space-y-4">
              ${items.length === 0 ? '<p class="text-white/40">No research papers available for this iteration.</p>' : ''}
              ${items.map(doc => `
                <div class="p-4 bg-white/5 border border-white/10 rounded group hover:border-[#99ccff]/50 transition-all">
                  <h4 class="text-[#99ccff] font-bold mb-1">${doc.title}</h4>
                  <p class="text-[10px] text-white/40 mb-3">${doc.excerpt || 'Research artifact from the OMNIVOID repository.'}</p>
                  <div class="flex justify-between items-center">
                    <span class="text-[9px] text-white/20 font-mono tracking-tighter uppercase">ID: ${doc.id.slice(-8)}</span>
                    <button class="text-[10px] px-2 py-1 bg-[#99ccff]/10 text-[#99ccff] border border-[#99ccff]/20 rounded">ACCESS DATA</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
        return { content: html, tabs: [] };

      case 'resources':
        items = content.resources.filter(r => r.editionId === selectedEditionId && r.type === section.resourceType?.toLowerCase());
        html = `
          <div class="grid grid-cols-1 gap-2">
             ${items.length === 0 ? '<p class="text-white/40">No media assets found in this sector.</p>' : ''}
             ${items.map(res => `
              <div class="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded group hover:border-[#99ccff]/40 transition-all cursor-pointer">
                <div class="w-10 h-10 bg-black flex items-center justify-center border border-white/5 rounded text-xl">
                  ${section.resourceType === 'AUDIO' ? '🎵' : '🖼️'}
                </div>
                <div>
                  <div class="text-[11px] font-bold text-white">${res.title}</div>
                  <div class="text-[9px] text-[#99ccff]/40 font-mono">HASH: ${res.id.slice(0, 12)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        return { content: html, tabs: [] };

      case 'links':
        items = content.links.filter(l => 
          l.category === section.categoryId && 
          (l.editionId === selectedEditionId || !l.editionId)
        );
        html = `
          <div class="space-y-3">
            ${items.length === 0 ? `<p class="text-white/40">No ${section.label.toLowerCase()} links active for this edition.</p>` : ''}
            ${items.map(link => {
              const isYouTube = link.linkType === 'YOUTUBE';
              const isMixcloud = link.linkType === 'MIXCLOUD';
              const clickHandler = isYouTube ? `window.openYouTube('${link.path}')` : isMixcloud ? `window.openMixcloud('${link.path}')` : `window.open('${link.path}', '_blank')`;
              
              return `
                <div 
                  onclick="${clickHandler}"
                  class="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded hover:bg-[#99ccff]/10 hover:border-[#99ccff]/40 transition-all cursor-pointer group"
                >
                  <div class="flex items-center gap-3">
                    <span class="text-lg opacity-40 group-hover:opacity-100">
                      ${isYouTube ? '📺' : isMixcloud ? '📻' : '🔗'}
                    </span>
                    <span class="text-xs font-mono tracking-tight">${link.title}</span>
                  </div>
                  <span class="text-[10px] text-[#99ccff] opacity-0 group-hover:opacity-100 transition-opacity">
                    ${isYouTube || isMixcloud ? 'PLAY ▶' : 'OPEN ↗'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        `;
        return { content: html, tabs: [] };

      case 'gigs': {
        const currentEditionObj = content.editions.find(e => e.id === selectedEditionId) || content.editions[0];
        const editionVideos = content.links.filter(l => (l.editionId === selectedEditionId || !l.editionId) && l.linkType === 'YOUTUBE');
        const editionGallery = content.resources.filter(r => r.editionId === selectedEditionId);
        const gigData = content.latestGig;

        html = `
          <div class="space-y-6 font-mono">
            <div class="p-4 bg-[#99ccff]/10 border border-[#99ccff]/30 rounded-lg flex items-center justify-between">
              <div>
                <span class="text-[10px] text-[#99ccff] tracking-widest uppercase font-bold">CURRENT EDITION</span>
                <h3 class="text-lg font-bold text-white mb-0.5">${currentEditionObj?.name || 'OMNIVOID RITUAL'}</h3>
                <p class="text-xs text-white/50">${currentEditionObj?.slug ? `SLUG: /${currentEditionObj.slug}` : 'LIVE PERFORMANCE ARCHIVE'}</p>
              </div>
              <span class="text-xs px-3 py-1 bg-[#99ccff] text-[#050505] font-bold rounded-full">ACTIVE EDITION</span>
            </div>

            <!-- Event Poster & Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-black/40 border border-white/10 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                <div class="w-full aspect-[3/4] bg-white/5 rounded border border-white/10 flex items-center justify-center mb-3 relative overflow-hidden group">
                  ${gigData?.images && gigData.images[0] ? `
                    <img src="${gigData.images[0]}" alt="Poster" class="w-full h-full object-cover" />
                  ` : `
                    <div class="text-center p-6">
                      <span class="text-4xl mb-2 block">🖼️</span>
                      <p class="text-xs text-[#99ccff] font-bold">${currentEditionObj?.name || 'EDITION POSTER'}</p>
                      <p class="text-[10px] text-white/40 mt-1">MAIN RITUAL ARTWORK</p>
                    </div>
                  `}
                </div>
                <span class="text-xs text-[#99ccff] font-bold uppercase tracking-wider">MAIN EVENT POSTER</span>
              </div>

              <!-- Workshop & Lineup -->
              <div class="space-y-4">
                <div class="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
                  <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">🛠️ WORKSHOP DETAILS</span>
                  <h4 class="text-sm font-bold text-white">${gigData?.workshopTitle || 'SYNTHESIS & AUDIO VISUAL WORKSHOP'}</h4>
                  <p class="text-xs text-white/60 leading-relaxed">${gigData?.workshopDescription || 'Hands-on sound design, WebGL shader modulation, and audio reactive geometry assembly.'}</p>
                  ${gigData?.workshopMaterials ? `
                    <div class="pt-2 text-[10px] text-[#99ccff]/80 font-mono">
                      <strong>REQUIRED MATERIALS:</strong> ${Array.isArray(gigData.workshopMaterials) ? gigData.workshopMaterials.join(', ') : gigData.workshopMaterials}
                    </div>
                  ` : ''}
                </div>

                <div class="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
                  <span class="text-[10px] text-[#99ccff] font-bold uppercase tracking-widest">🎭 PERFORMERS & LINEUP</span>
                  <div class="space-y-1.5 pt-1">
                    <div class="flex justify-between items-center text-xs">
                      <span class="text-white font-bold">OMNIVOID AUDIO COLLECTIVE</span>
                      <span class="text-[10px] text-white/40">LIVE SET & VISUALS</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                      <span class="text-white font-bold">QUANTUM CLIMB LABS</span>
                      <span class="text-[10px] text-white/40">ANALOG SYNTHESIS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- YouTube Videos for this Edition -->
            <div class="pt-2">
              <h4 class="text-xs font-bold text-[#99ccff] uppercase tracking-widest mb-3">📡 TRANSMISSION VIDEOS (${editionVideos.length})</h4>
              <div class="space-y-2">
                ${editionVideos.map(vid => `
                  <div 
                    onclick="window.openYouTube('${vid.path}')"
                    class="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded hover:border-[#99ccff]/50 cursor-pointer transition-all group"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-lg">📺</span>
                      <span class="text-xs font-bold text-white group-hover:text-[#99ccff]">${vid.title}</span>
                    </div>
                    <span class="text-[10px] px-2 py-1 bg-[#99ccff]/10 text-[#99ccff] border border-[#99ccff]/20 rounded">WATCH ▶</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
        return { content: html, tabs: [] };
      }

      default:
        return { content: 'CONTENT_UNAVAILABLE', tabs: [] };
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

  const selectedEditionName = content?.editions.find(e => e.id === selectedEditionId)?.name;

  return (
    <main className="fixed inset-0 bg-[#050505] overflow-hidden flex flex-col">
      {/* 3D WebGL Canvas Background */}
      <ThreeCanvas getAudioData={getAudioData} isPlaying={isPlayingAudio} />

      {/* 2D Agent Canvas Overlay */}
      <canvas id="agents" className="fixed inset-0 z-0 opacity-25 pointer-events-none" />
      
      {/* Agent Dialogue HUD Overlay */}
      <AgentOverlay
        currentTrackTitle={currentTrack?.title}
        isPlaying={isPlayingAudio}
        selectedEditionName={selectedEditionName}
      />

      {/* Main OMNIVOID Central Logo watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
        <motion.img 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.12, scale: 1 }}
          transition={{ duration: 2 }}
          src="/logo.svg" 
          alt="OMNIVOID" 
          style={{ 
            width: '15vw',
            maxWidth: '250px',
            filter: 'brightness(1.5)',
          }}
        />
      </div>

      {/* Edition Selectors */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex gap-8 z-[100]">
        {content?.editions.slice(0, 3).map((edition, idx) => (
          <motion.button
            key={edition.id}
            whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(153, 204, 255, 0.4)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedEditionId(edition.id)}
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-mono text-xl transition-all duration-500 shadow-lg backdrop-blur-md ${
              selectedEditionId === edition.id 
                ? 'bg-[#99ccff] text-[#050505] border-[#99ccff]' 
                : 'bg-black/60 text-[#99ccff] border-[#99ccff]/40 hover:border-[#99ccff]'
            }`}
          >
            {idx + 1}
          </motion.button>
        ))}
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
          />
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
                  <span className="text-lg">{item.icon}</span>
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
                  src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=0&autoplay=1&feed=${encodeURIComponent(activeAudioUrl)}`} 
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