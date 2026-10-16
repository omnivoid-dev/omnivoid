'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WindowShell, type ShellSection } from '@/components/shell/WindowShell';
import { ResearchSection, ConundrumSection, ContactSection, GallerySection, type GalleryItem } from '@/components/sections/StaticSections';
import { ProfilesSection } from '@/components/sections/ProfilesSection';
import { SplashScreen } from '@/components/SplashScreen';
import { AgentSystem } from '@/components/AgentSystem';
import { ThreeCanvas } from '@/components/ThreeCanvas';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useAudioPlayer, type AudioTrack } from '@/hooks/useAudioPlayer';
import { AudioPlayer, type PlayerMode, type PlaylistInfo } from '@/components/audio/AudioPlayer';
import { TaskbarPlayer } from '@/components/audio/TaskbarPlayer';
import { AgentOverlay } from '@/components/AgentOverlay';
import { TintedImage } from '@/components/TintedImage';
import { DEFAULT_LOGO_URL, LOGO_ASPECT, MENU_ICON_SLOTS, iconUrlFor, menuLabelFor, resolveBranding, type SiteBranding } from '@/lib/branding';
import { RitualsWindow } from '@/components/edition/RitualsWindow';
import { LatestRitualWindow } from '@/components/edition/LatestRitualWindow';
import { TransmissionsWindow } from '@/components/edition/TransmissionsWindow';
import { RadioWindow, type PublicRadioShow } from '@/components/edition/RadioWindow';
import { mixcloudEmbedSrc } from '@/lib/mixcloud';
import type { PublicEdition, PublicProfile } from '@/components/edition/types';
import { NEUTRAL_THEME, resolveTheme } from '@/lib/themes';
import { BackgroundFX } from '@/components/fx/BackgroundFX';
import { fxForPreset } from '@/lib/fx/presets';

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
  playlists?: { id: string; name: string; description?: string | null; trackIds: string[] }[];
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
  'latest',
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

export default function Home() {
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [content, setContent] = useState<ContentStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shellOpen, setShellOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('rituals');
  const [profileFocus, setProfileFocus] = useState<string | null>(null);
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
  // The edition whose theme is applied. Null = the neutral OMNIVOID look (the default on arrival).
  const [themeEditionId, setThemeEditionId] = useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  // Audio & 3D Visualizer state
  // The player window is hidden by default; hiding it never stops the music (the engine lives here)
  const [playerMode, setPlayerMode] = useState<PlayerMode>('hidden');
  const lastPlayerMode = useRef<Exclude<PlayerMode, 'hidden'>>('compact');
  const openPlayer = (mode: Exclude<PlayerMode, 'hidden'> = lastPlayerMode.current) => setPlayerMode(mode);
  const changePlayerMode = (mode: PlayerMode) => {
    if (mode !== 'hidden') lastPlayerMode.current = mode;
    setPlayerMode(mode);
  };

  const [showStarfield, setShowStarfield] = useState(false);
  // Post-effect layer (dither etc.): user toggle, and whether it is actually drawing
  const [fxEnabled, setFxEnabled] = useState(true);
  const [fxActive, setFxActive] = useState(false);

  const { connectAudioElement, getAudioData } = useAudioAnalyzer();
  const player = useAudioPlayer(connectAudioElement);
  const currentTrack = player.current;
  const isPlayingAudio = player.isPlaying;

  const agentSystemRef = useRef<AgentSystem | null>(null);

  const branding = resolveBranding(content?.branding);

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setContent(data.data);
          // Start on the most recent past edition; the latest ritual has its own section
          const past = [...data.data.editions].filter((e: PublicEdition) => !e.isLatestRitual).sort((a: PublicEdition, b: PublicEdition) => b.sortOrder - a.sortOrder);
          if (past.length > 0) setSelectedEditionId(past[0].id);
          else if (data.data.editions.length > 0) setSelectedEditionId(data.data.editions[0].id);
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

  // Edition theme: the agents crossfade to the edition's ink; the page background follows via CSS
  useEffect(() => {
    const edition = content?.editions.find((e) => e.id === themeEditionId);
    const palette = resolveTheme(edition?.themeColors)?.palette ?? NEUTRAL_THEME;
    agentSystemRef.current?.setTheme({ ink: palette.ink, accent: palette.accent });
  }, [content, themeEditionId, isSplashComplete]);

  // Deep link: /?section=rituals opens the window on that section once the site is ready
  const initialSectionRef = useRef<string | null>(null);
  const initialProfileRef = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    initialSectionRef.current = params.get('section');
    initialProfileRef.current = params.get('profile');
  }, []);

  useEffect(() => {
    const wanted = initialSectionRef.current;
    if (wanted && isSplashComplete && content && SECTION_ORDER.includes(wanted)) {
      initialSectionRef.current = null;
      const wantedProfile = initialProfileRef.current;
      initialProfileRef.current = null;
      if (wantedProfile) {
        const match = (content.profiles || []).find((p) => p.slug === wantedProfile && SECTION_FOR_PROFILE_TYPE[p.type] === wanted);
        if (match) setProfileFocus(match.id);
      }
      setActiveSection(wanted);
      setShellOpen(true);
    }
  }, [isSplashComplete, content]);

  useEffect(() => {
    if (initialSectionRef.current) return; // do not clobber the link before it has been applied
    const url = new URL(window.location.href);
    if (shellOpen) url.searchParams.set('section', activeSection);
    else url.searchParams.delete('section');
    url.searchParams.delete('profile');
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
  // Every active audio track, with its edition and performer so the player can filter by them
  const audioTracks: AudioTrack[] = (content?.resources || [])
    .filter((r) => (r.type === 'AUDIO' || r.type === 'audio') && r.path)
    .map((r) => {
      const edition = content?.editions.find((e) => e.id === r.editionId);
      return {
        id: r.id,
        title: r.title,
        artist: edition?.performers.find((p) => p.id === r.performerId)?.name || r.metadata?.artist || 'OMNIVOID AUDIO LABS',
        url: r.path,
        duration: r.metadata?.duration,
        editionId: r.editionId,
        editionName: edition?.name,
        performerId: r.performerId,
      };
    });
  const playlists: PlaylistInfo[] = (content?.playlists || []).map((p) => ({ id: p.id, name: p.name, trackIds: p.trackIds }));

  const profiles = content?.profiles || [];

  // The edition flagged "Latest Ritual" also has its own section; the Editions list holds every edition, newest first
  const allEditions = [...(content?.editions || [])].sort((a, b) => b.sortOrder - a.sortOrder);

  // Gallery: photos uploaded per edition (tagged with edition and performer) plus the legacy folder images
  const galleryItems: GalleryItem[] = [
    ...(content?.resources || [])
      .filter((r) => r.type === 'gallery' && r.path)
      .map((r) => {
        const ed = content?.editions.find((e) => e.id === r.editionId);
        return {
          id: r.id,
          title: r.title,
          url: r.path,
          editionId: r.editionId,
          editionName: ed?.name ?? null,
          eventDate: ed?.eventDate ?? null,
          performerName: ed?.performers.find((p) => p.id === r.performerId)?.name ?? null,
        };
      }),
    ...(content?.gallery || []).filter((g) => g.type === 'image').map((g) => ({ id: g.id, title: g.title, url: g.path })),
  ];
  const latestEdition = allEditions.find((e) => e.isLatestRitual) ?? null;

  // Sections that currently have something to show
  const visibleSectionIds = SECTION_ORDER.filter((id) => {
    if (id === 'latest') return !!latestEdition;
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

  const selectEdition = (editionId: string) => {
    setSelectedEditionId(editionId);
    setThemeEditionId(editionId);
  };

  // Save tuned effect parameters to the active edition (needs an admin session)
  const saveThemeParams = async (params: Record<string, number>) => {
    if (!themeEditionId) return 'No edition theme is active.';
    const res = await fetch(`/api/admin/editions/${themeEditionId}/theme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return 'Sign in to /admin first, then save again.';
    if (!res.ok || !data.success) return data.error || 'Could not save.';
    // Keep the loaded content in step so re-selecting the edition keeps the tuned values
    setContent((c) =>
      c ? { ...c, editions: c.editions.map((e) => (e.id === themeEditionId ? { ...e, themeColors: data.data } : e)) } : c
    );
    return 'Saved to this edition.';
  };

  // Opening the latest ritual also applies its theme, like selecting any edition
  const openLatest = () => {
    if (latestEdition) selectEdition(latestEdition.id);
    openSection('latest');
  };

  // Menu / navigation entry point for a section
  const goToSection = (id: string) => (id === 'latest' ? openLatest() : openSection(id));

  const openEdition = (editionId: string) => {
    if (editionId === latestEdition?.id) return openLatest();
    selectEdition(editionId);
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
      case 'latest':
        return <LatestRitualWindow edition={latestEdition} profiles={profiles} onOpenProfile={openProfile} />;
      case 'rituals':
        return (
          <RitualsWindow
            editions={allEditions}
            selectedEditionId={selectedEditionId}
            onSelectEdition={selectEdition}
            onPlayVideo={play}
            profiles={profiles}
            onOpenProfile={openProfile}
          />
        );
      case 'transmissions':
        return <TransmissionsWindow editions={allEditions} kinds={['SET', 'WORKSHOP', 'OTHER']} title="Transmissions" onPlayVideo={play} />;
      case 'labs':
        return <TransmissionsWindow editions={allEditions} kinds={['LABS']} title="Labs sessions" onPlayVideo={play} />;
      case 'radio':
        return <RadioWindow shows={content.radioShows || []} />;
      case 'research':
        return <ResearchSection documents={content.documents.filter((d) => d.type === 'RESEARCH')} />;
      case 'gallery':
        return <GallerySection items={galleryItems} editions={allEditions.map((e) => ({ id: e.id, name: e.name }))} />;
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

  if (!isSplashComplete) {
    return <SplashScreen onComplete={() => setIsSplashComplete(true)} />;
  }

  const selectedEditionName = content?.editions.find(e => e.id === selectedEditionId)?.name;

  const themeEdition = content?.editions.find((e) => e.id === themeEditionId);
  const activeTheme = resolveTheme(themeEdition?.themeColors);
  const palette = activeTheme?.palette ?? NEUTRAL_THEME;
  const fxEffect = fxEnabled ? fxForPreset(activeTheme?.id) : null;

  return (
    <main
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ backgroundColor: palette.bg, transition: 'background-color 800ms ease' }}
    >
      {/* 3D WebGL Canvas Background */}
      {showStarfield && <ThreeCanvas />}

      {/* 2D Agent Canvas Overlay (plexus) */}
      <canvas
        id="agents"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ opacity: fxActive ? 0 : 0.6, transition: 'opacity 800ms ease' }}
      />

      {/* Post-effect layer: the plexus re-drawn through the edition's shader */}
      <BackgroundFX
        effect={fxEffect}
        palette={{ bg: palette.bg, ink: palette.ink, accent: palette.accent }}
        storedParams={activeTheme?.params}
        editionName={themeEdition?.name}
        onSaveParams={themeEditionId ? saveThemeParams : undefined}
        getPulse={() => agentSystemRef.current?.getPulse() ?? 0}
        getWave={() => (isPlayingAudio ? getAudioData().timeDomainData : null)}
        onActiveChange={setFxActive}
      />
      
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

      {/* Latest Ritual: a pill above the logo, as on the original site */}
      {latestEdition && (
        <button
          onClick={openLatest}
          title="See the upcoming edition: poster, workshop and tickets"
          className="fixed left-1/2 top-[calc(50%-190px)] -translate-x-1/2 z-[100] flex flex-col items-center gap-0.5 px-5 py-2 rounded-full bg-[#111111]/90 border border-[#99ccff] text-[#99ccff] font-mono font-bold uppercase tracking-[0.15em] backdrop-blur-md shadow-[0_0_20px_rgba(153,204,255,0.25),4px_4px_8px_rgba(0,0,0,0.5)] transition-all hover:bg-[#99ccff] hover:text-black hover:scale-105"
        >
          <span className="flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {menuLabelFor(branding, 'latest')}
          </span>
          <span className="text-[9px] opacity-60 tracking-widest">
            {latestEdition.name}
            {latestEdition.eventDate ? ` · ${new Date(latestEdition.eventDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
          </span>
        </button>
      )}

      {/* Shared window: sections swap inside it */}
      <WindowShell
        isOpen={shellOpen}
        onClose={() => setShellOpen(false)}
        title={`${menuLabelFor(branding, activeSection)} // ${
          profileFocus
            ? profiles.find((p) => p.id === profileFocus)?.name || '...'
            : activeSection === 'latest'
              ? latestEdition?.name || '...'
              : selectedEditionName || '...'
        }`}
        sections={visibleSectionIds.map<ShellSection>((id) => ({ id, label: menuLabelFor(branding, id), icon: renderIcon(id) }))}
        activeId={activeSection}
        onSelect={goToSection}
        onBack={profileFocus ? () => setProfileFocus(null) : undefined}
      >
        <div key={`${activeSection}:${profileFocus ?? ''}`}>{renderSection(activeSection)}</div>
      </WindowShell>

      {/* Audio engine: always mounted so the music survives hiding the player */}
      <audio ref={player.audioRef} {...player.audioProps} />

      <AudioPlayer
        engine={player}
        mode={playerMode}
        onModeChange={changePlayerMode}
        tracks={audioTracks}
        playlists={playlists}
        getAudioData={getAudioData}
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
          <TaskbarPlayer engine={player} mode={playerMode} onToggleOpen={() => (playerMode === 'hidden' ? openPlayer() : changePlayerMode('hidden'))} />
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
          <button
            onClick={() => setFxEnabled((v) => !v)}
            title="Edition post-effects (dither, ...)"
            className={`flex items-center gap-2 text-[10px] font-mono tracking-widest px-3 py-1 rounded transition-all border ${
              fxEnabled
                ? 'bg-[#99ccff]/20 text-[#99ccff] border-[#99ccff]/40'
                : 'bg-white/5 text-white/60 border-white/10 hover:border-[#99ccff]/30 hover:text-white'
            }`}
          >
            <span>▚</span> FX {fxEnabled ? 'ON' : 'OFF'}
          </button>
          {themeEdition && activeTheme && (
            <button
              onClick={() => setThemeEditionId(null)}
              title="Return to the neutral OMNIVOID look"
              className="flex items-center gap-2 text-[10px] font-mono tracking-widest px-3 py-1 rounded border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-[#99ccff]/40 transition-all"
            >
              <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ background: palette.ink }} />
              THEME: {themeEdition.name.toUpperCase()} ✕
            </button>
          )}
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
                onClick={() => { openPlayer(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-[#99ccff] hover:bg-white/5 rounded transition-all text-xs font-mono text-left font-bold"
              >
                <span className="text-lg">🎧</span> AUDIO STREAM PLAYER
              </button>
              <div className="h-[1px] bg-white/10 my-1" />
              {visibleSectionIds.map((id) => (
                <button
                  key={id}
                  onClick={() => goToSection(id)}
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