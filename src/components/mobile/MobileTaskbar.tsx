'use client';

interface MobileTaskbarProps {
  menuOpen: boolean;
  onToggleMenu: () => void;
  playerOpen: boolean;
  playerPlaying: boolean;
  onTogglePlayer: () => void;
  starfieldOn: boolean;
  onToggleStarfield: () => void;
  fxOn: boolean;
  onToggleFx: () => void;
  /** Active edition theme: shown as a colour dot that clears the theme when tapped */
  theme: { name: string; color: string } | null;
  onClearTheme: () => void;
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
  fxOn,
  onToggleFx,
  theme,
  onClearTheme,
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
      <button onClick={onToggleFx} aria-label={`Post-effects ${fxOn ? 'on' : 'off'}`} aria-pressed={fxOn} className={item(fxOn)}>
        ▚
      </button>
      {theme && (
        <button onClick={onClearTheme} aria-label={`Theme: ${theme.name}. Tap to return to the neutral look`} className={item(false)}>
          <span className="w-4 h-4 rounded-full border border-white/40" style={{ background: theme.color }} />
        </button>
      )}
    </footer>
  );
}
