'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WindowShell, type ShellSection } from '@/components/shell/WindowShell';
import { ResearchSection, ConundrumSection, ContactSection, GallerySection } from '@/components/sections/StaticSections';
import { ProfilesSection } from '@/components/sections/ProfilesSection';
import { SplashScreen } from '@/components/SplashScreen';
import { StartScreen } from '@/components/StartScreen';
import { AgentSystem } from '@/components/AgentSystem';
import { ThreeCanvas } from '@/components/ThreeCanvas';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { AudioPlayerWindow, AudioTrack } from '@/components/AudioPlayerWindow';
import { AgentOverlay } from '@/components/AgentOverlay';
import { TintedImage } from '@/components/TintedImage';
import { DEFAULT_LOGO_URL, LOGO_ASPECT, MENU_ICON_SLOTS, iconUrlFor, menuLabelFor, resolveBranding, type SiteBranding } from '@/lib/branding';
import { RitualsWindow } from '@/components/edition/RitualsWindow';
import { TransmissionsWindow } from '@/components/edition/TransmissionsWindow';
import { RadioWindow, type PublicRadioShow } from '@/components/edition/RadioWindow';
import { mixcloudEmbedSrc } from '@/lib/mixcloud';
import type { PublicEdition, PublicProfile } from '@/components/edition/types';

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
  profiles?: PublicProfile[];
  branding?: SiteBranding;
  conundrumText?: string;
  contactInfo?: { contactEmail: string; submissionsEmail: string };
  editions: PublicEdition[];
  currentEdition: any | null;
}

// Section order in the window's navigation strip and the Start menu.
// Profile sections only appear once they have something to show.
const SECTION_ORDER = [
  'rituals',
  'transmissions',
  'radio',
  'labs',
  'performers',
  'collaborators',
  'affiliates',
  'research',
  'gallery',
  'conundrum',
  'contact',
];

const PROFILE_SECTIONS: Record<string, { type: PublicProfile['type']; heading: string }> = {
  performers: { type: 'PERFORMER', heading: 'PERFORMERS' },
  collaborators: { type: 'COLLABORATOR', heading: 'COLLABORATORS' },
  affiliates: { type: 'AFFILIATE', heading: 'AFFILIATES' },
};

const SECTION_FOR_PROFILE_TYPE: Record<PublicProfile['type'], string> = {
  PERFORMER: 'performers',
  COLLABORATOR: 'collaborators',
  AFFILIATE: 'affiliates',
};

// Tracks served from /public/audio (no database entry needed)
const BUILT_IN_TRACKS: AudioTrack[] = [
  { id: 'builtin-47k-phase-01', title: '47K - Phase 01', artist: '47K', url: '/audio/47K_Phase_01.mp3', editionName: '47K' },
];

export default function Home() {
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [isStartComplete, setIsStartComplete] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [content, setContent] = useState<ContentStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shellOpen, setShellOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('rituals');
  const [profileFocus, setProfileFocus] = useState<string | null>(null);
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

  const branding = resolveBranding(content?.branding);

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

  // Deep link: /?section=rituals opens the window on that section once the site is ready
  const initialSectionRef = useRef<string | null>(null);
  useEffect(() => {
    initialSectionRef.current = new URLSearchParams(window.location.search).get('section');
  }, []);

  useEffect(() => {
    const wanted = initialSectionRef.current;
    if (wanted && isSplashComplete && content && SECTION_ORDER.includes(wanted)) {
      initialSectionRef.current = null;
      setActiveSection(wanted);
      setShellOpen(true);
    }
  }, [isSplashComplete, content]);

  useEffect(() => {
    if (initialSectionRef.current) return; // do not clobber the link before it has been applied
    const url = new URL(window.location.href);
    if (shellOpen) url.searchParams.set('section', activeSection);
    else url.searchParams.delete('section');
    window.history.replaceState(null, '', url.toString());
  }, [shellOpen, activeSection]);

  // Expose global functions for media links
  useEffect(() => {
    (window as any).openYouTube = (url: string) => {
      setActiveVideoUrl(url);
    };
    (window as any).openMixcloud = (url: string) => {
      setActiveAudioUrl(url);
    };
  }, []);

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

  const profiles = content?.profiles || [];

  // Sections that currently have something to show
  const visibleSectionIds = SECTION_ORDER.filter((id) => {
    const profileSection = PROFILE_SECTIONS[id];
    return profileSection ? profiles.some((p) => p.type === profileSection.type) : true;
  });

  const openSection = (id: string, focusProfile: string | null = null) => {
    setActiveSection(id);
    setProfileFocus(focusProfile);
    setShellOpen(true);
    setIsMenuOpen(false);
  };

  const openProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) openSection(SECTION_FOR_PROFILE_TYPE[profile.type], profile.id);
  };

  const openEdition = (editionId: string) => {
    setSelectedEditionId(editionId);
    openSection('rituals');
  };

  const renderSection = (sectionId: string) => {
    if (!content) return null;
    const play = (url: string) => setActiveVideoUrl(url);

    const profileSection = PROFILE_SECTIONS[sectionId];
    if (profileSection) {
      return (
        <ProfilesSection
          profiles={profiles}
          type={profileSection.type}
          heading={menuLabelFor(branding, sectionId)}
          icon={MENU_ICON_SLOTS.find((sl) => sl.id === sectionId)?.fallback || ''}
          focusId={profileFocus}
          onFocus={setProfileFocus}
          onOpenEdition={openEdition}
        />
      );
    }

    switch (sectionId) {
      case 'rituals':
        return (
          <RitualsWindow
            editions={content.editions}
            selectedEditionId={selectedEditionId}
            onSelectEdition={setSelectedEditionId}
            onPlayVideo={play}
            profiles={profiles}
            onOpenProfile={openProfile}
          />
        );
      case 'transmissions':
        return <TransmissionsWindow editions={content.editions} kinds={['SET', 'WORKSHOP', 'OTHER']} title="Transmissions" onPlayVideo={play} />;
      case 'labs':
        return <TransmissionsWindow editions={content.editions} kinds={['LABS']} title="Labs sessions" onPlayVideo={play} />;
      case 'radio':
        return <RadioWindow shows={content.radioShows || []} />;
      case 'research':
        return <ResearchSection documents={content.documents.filter((d) => d.type === 'RESEARCH')} />;
      case 'gallery':
        return <GallerySection items={content.gallery.filter((g) => g.type === 'image')} />;
      case 'conundrum':
        return <ConundrumSection text={content.conundrumText || 'OMNIVOID is an autonomous sonic & visual research lab.'} />;
      case 'contact':
        return <ContactSection info={content.contactInfo || { contactEmail: 'contact@omnivoid.dev', submissionsEmail: 'submissions@omnivoid.dev' }} />;
      default:
        return null;
    }
  };

  // Section icon from branding (uploaded or built-in), else the emoji fallback
  const renderIcon = (sectionId: string, size = 22) => {
    const url = iconUrlFor(branding, sectionId);
    return url ? (
      <TintedImage src={url} tint={branding.iconTint} alt="" style={{ width: size, height: size }} />
    ) : (
      <span style={{ fontSize: size - 4 }}>{MENU_ICON_SLOTS.find((sl) => sl.id === sectionId)?.fallback}</span>
    );
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

      {/* Shared window: sections swap inside it */}
      <WindowShell
        isOpen={shellOpen}
        onClose={() => setShellOpen(false)}
        title={`${menuLabelFor(branding, activeSection)} // ${
          profileFocus ? profiles.find((p) => p.id === profileFocus)?.name || '...' : selectedEditionName || '...'
        }`}
        sections={visibleSectionIds.map<ShellSection>((id) => ({ id, label: menuLabelFor(branding, id), icon: renderIcon(id) }))}
        activeId={activeSection}
        onSelect={(id) => openSection(id)}
        onBack={profileFocus ? () => setProfileFocus(null) : undefined}
      >
        <div key={`${activeSection}:${profileFocus ?? ''}`}>{renderSection(activeSection)}</div>
      </WindowShell>

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
              {visibleSectionIds.map((id) => (
                <button
                  key={id}
                  onClick={() => openSection(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 hover:text-[#99ccff] hover:bg-white/5 rounded transition-all text-xs font-mono text-left ${
                    shellOpen && activeSection === id ? 'text-[#99ccff] bg-white/5' : 'text-white/60'
                  }`}
                >
                  {renderIcon(id)}
                  {menuLabelFor(branding, id)}
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