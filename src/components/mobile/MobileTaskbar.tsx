'use client';

interface MobileTaskbarProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
  playerOpen: boolean;
  playerPlaying: boolean;
  onTogglePlayer: () => void;
  starfieldOn: boolean;
  onToggleStarfield: () => void;
  /** The theme picker is open */
  themeOpen: boolean;
  onToggleTheme: () => void;
  /** Ink colour of the active theme (shown as a dot on the icon), or null when the neutral look is showing */
  themeColor: string | null;
}

/** Phone taskbar: icons only, always exactly one screen wide, with room for the phone's bottom bar. */
export function MobileTaskbar({
  menuOpen,
  onToggleMenu,
  playerOpen,
  playerPlaying,
  onTogglePlayer,
  starfieldOn,
  onToggleStarfield,
  themeOpen,
  onToggleTheme,
  themeColor,
}: MobileTaskbarProps) {
  const item = (active: boolean) =>
    `relative flex-1 h-11 flex items-center justify-center rounded-lg text-lg transition-colors ${
      active ? 'text-[#99ccff] bg-[#99ccff]/15' : 'text-white/55 active:text-white active:bg-white/10'
    }`;

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/5 flex items-center gap-1 px-2 z-[200]"
      style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button onClick={onToggleMenu} aria-label={menuOpen ? 'Close the menu' : 'Open the menu'} aria-pressed={menuOpen} className={item(menuOpen)}>
        ▦
      </button>
      <button onClick={onTogglePlayer} aria-label="Audio player" aria-pressed={playerOpen} className={item(playerOpen)}>
        🎵
        {playerPlaying && <span className="absolute top-1.5 right-[calc(50%-18px)] w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </button>
      <button onClick={onToggleStarfield} aria-label={`Starfield ${starfieldOn ? 'on' : 'off'}`} aria-pressed={starfieldOn} className={item(starfieldOn)}>
        ✦
      </button>
      <button onClick={onToggleTheme} aria-label="Themes" aria-pressed={themeOpen} className={item(themeOpen || !!themeColor)}>
        ▚
        {themeColor && <span className="absolute top-1.5 right-[calc(50%-18px)] w-2.5 h-2.5 rounded-full border border-white/60" style={{ background: themeColor }} />}
      </button>
    </footer>
  );
}
