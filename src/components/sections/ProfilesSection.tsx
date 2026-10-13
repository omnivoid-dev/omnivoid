'use client';

import { PublicProfile } from '@/components/edition/types';
import { profilePath, profileSocials } from '@/lib/profileLinks';

interface ProfilesSectionProps {
  profiles: PublicProfile[];
  type: PublicProfile['type'];
  heading: string;
  icon: string;
  /** Id of the profile open in detail view (owned by the page so edition lineups can link here). */
  focusId: string | null;
  onFocus: (id: string | null) => void;
  onOpenEdition?: (editionId: string) => void;
}

/** Master/detail inside the shared window: a list of profiles, or one profile with its bio, socials and links. */
export function ProfilesSection({ profiles, type, heading, icon, focusId, onFocus, onOpenEdition }: ProfilesSectionProps) {
  const list = profiles.filter((p) => p.type === type);
  const focus = focusId ? list.find((p) => p.id === focusId) : null;

  if (focus) {
    const paragraphs = (focus.bio || '').split(/\n\s*\n/).filter((p) => p.trim());
    const socials = profileSocials(focus);
    const related = focus.links || [];

    return (
      <div className="font-mono space-y-5">
        <div className="flex gap-4 items-start">
          {focus.imageUrl && <img src={focus.imageUrl} alt={focus.name} className="w-28 h-28 object-cover rounded border border-white/10 shrink-0" />}
          <div className="min-w-0">
            <span className="text-[10px] text-[#99ccff] tracking-widest font-bold">{heading}</span>
            <h3 className="text-lg font-bold">{focus.name}</h3>
            {focus.role && <p className="text-xs text-white/50">{focus.role}</p>}
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="me noopener noreferrer"
                    className="text-[10px] px-2.5 py-1 border border-[#99ccff]/30 text-[#99ccff] rounded hover:bg-[#99ccff]/10 transition-colors"
                  >
                    {s.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {paragraphs.length > 0 ? (
          <div className="space-y-3 text-xs text-white/80 leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {p}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30">No bio yet.</p>
        )}

        {related.length > 0 && (
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
            <span className="text-[10px] text-[#99ccff] font-bold tracking-widest block">RELATED</span>
            <ul className="space-y-1.5">
              {related.map((l, i) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-white/80 hover:text-[#99ccff] underline decoration-dotted underline-offset-4 break-all">
                    {l.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {type === 'PERFORMER' && focus.editions.length > 0 && (
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
            <span className="text-[10px] text-[#99ccff] font-bold tracking-widest block">APPEARED AT</span>
            <div className="flex flex-wrap gap-2">
              {focus.editions.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onOpenEdition?.(e.id)}
                  className="text-[10px] px-2.5 py-1 border border-[#99ccff]/30 text-[#99ccff] rounded hover:bg-[#99ccff]/10"
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <a href={profilePath(focus.type, focus.slug)} className="inline-block text-[10px] text-white/35 hover:text-[#99ccff] tracking-widest">
          OPEN PROFILE PAGE ↗
        </a>
      </div>
    );
  }

  return (
    <div className="font-mono space-y-4">
      <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#99ccff]/30 pb-3">
        {icon} {heading}
      </h3>
      {list.length === 0 && <p className="text-white/40 text-xs">Nothing here yet.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => onFocus(p.id)}
            className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded text-left hover:border-[#99ccff]/50 hover:bg-[#99ccff]/5 transition-all group"
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
            ) : (
              <span className="w-12 h-12 rounded bg-black/40 flex items-center justify-center text-lg shrink-0">{icon}</span>
            )}
            <span className="min-w-0">
              <span className="block text-xs font-bold truncate group-hover:text-[#99ccff]">{p.name}</span>
              {p.role && <span className="block text-[10px] text-white/40 truncate">{p.role}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
