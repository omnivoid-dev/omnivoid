import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProfile, profileJsonLd, TYPE_LABEL, type ProfileType } from '@/lib/profileSeo';
import { profileSocials } from '@/lib/profileLinks';
import type { RelatedLink } from '@/lib/profileLinks';

/**
 * A server-rendered profile page: everything a search engine needs (name, role, bio, image, socials,
 * related links, structured data) in the HTML, styled like the rest of the site.
 */
export async function ProfilePage({ type, slug }: { type: ProfileType; slug: string }) {
  const profile = await getProfile(type, slug);
  if (!profile) notFound();

  const label = TYPE_LABEL[type];
  const socials = profileSocials(profile);
  const related = (Array.isArray(profile.links) ? profile.links : []) as unknown as RelatedLink[];
  const paragraphs = (profile.bio || '').split(/\n\s*\n/).filter((p) => p.trim());
  const editions = profile.performers.map((x) => x.edition);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: profileJsonLd(profile, type) }} />

      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <nav aria-label="Breadcrumb" className="text-[10px] tracking-widest text-white/40 flex items-center gap-2">
          <Link href="/" className="hover:text-[#99ccff]">
            OMNIVOID LABS
          </Link>
          <span>/</span>
          <Link href={`/${label.segment}`} className="hover:text-[#99ccff]">
            {label.plural.toUpperCase()}
          </Link>
          <span>/</span>
          <span className="text-white/70">{profile.name.toUpperCase()}</span>
        </nav>
        <Link
          href={`/?section=${label.segment}&profile=${profile.slug}`}
          className="text-[10px] tracking-widest text-[#99ccff] border border-[#99ccff]/30 rounded px-3 py-1.5 hover:bg-[#99ccff]/10"
        >
          OPEN IN OMNIVOID ↗
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <article className="space-y-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {profile.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.imageUrl} alt={profile.name} width={224} height={224} className="w-56 h-56 object-cover rounded border border-white/10 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[10px] text-[#99ccff] tracking-[0.25em] font-bold">{label.plural.toUpperCase().slice(0, -1)}</p>
              <h1 className="text-3xl font-bold mt-1">{profile.name}</h1>
              {profile.role && <p className="text-sm text-white/55 mt-1">{profile.role}</p>}

              {socials.length > 0 && (
                <ul className="flex flex-wrap gap-2 mt-5">
                  {socials.map((s) => (
                    <li key={s.key}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="me noopener noreferrer"
                        className="inline-block text-[11px] px-3 py-1.5 border border-[#99ccff]/30 text-[#99ccff] rounded hover:bg-[#99ccff]/10 transition-colors"
                      >
                        {s.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {paragraphs.length > 0 && (
            <section aria-label="Bio" className="space-y-4 text-sm text-white/80 leading-relaxed">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  {p}
                </p>
              ))}
            </section>
          )}

          {related.length > 0 && (
            <section aria-labelledby="related" className="p-5 bg-white/5 border border-white/10 rounded-lg">
              <h2 id="related" className="text-[10px] text-[#99ccff] font-bold tracking-widest mb-3">
                RELATED
              </h2>
              <ul className="space-y-2">
                {related.map((l, i) => (
                  <li key={i}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-white/80 hover:text-[#99ccff] underline decoration-dotted underline-offset-4 break-all">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {type === 'PERFORMER' && editions.length > 0 && (
            <section aria-labelledby="appeared" className="p-5 bg-white/5 border border-white/10 rounded-lg">
              <h2 id="appeared" className="text-[10px] text-[#99ccff] font-bold tracking-widest mb-3">
                APPEARED AT OMNIVOID
              </h2>
              <ul className="flex flex-wrap gap-2">
                {editions.map((e) => (
                  <li key={e.id} className="text-xs px-3 py-1.5 border border-white/15 rounded text-white/70">
                    {e.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </main>
    </div>
  );
}
