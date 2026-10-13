import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { TYPE_LABEL, type ProfileType } from '@/lib/profileSeo';
import { profilePath } from '@/lib/profileLinks';

/** A crawlable list of every active profile of one type, linking to each profile page. */
export async function ProfileIndex({ type, intro }: { type: ProfileType; intro: string }) {
  const label = TYPE_LABEL[type];
  const profiles = await prisma.profile
    .findMany({
      where: { type, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, role: true, imageUrl: true },
    })
    .catch(() => []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <nav aria-label="Breadcrumb" className="text-[10px] tracking-widest text-white/40 flex items-center gap-2">
          <Link href="/" className="hover:text-[#99ccff]">
            OMNIVOID LABS
          </Link>
          <span>/</span>
          <span className="text-white/70">{label.plural.toUpperCase()}</span>
        </nav>
        <Link href={`/?section=${label.segment}`} className="text-[10px] tracking-widest text-[#99ccff] border border-[#99ccff]/30 rounded px-3 py-1.5 hover:bg-[#99ccff]/10">
          OPEN IN OMNIVOID ↗
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{label.plural}</h1>
          <p className="text-sm text-white/55 mt-2 leading-relaxed">{intro}</p>
        </div>

        {profiles.length === 0 && <p className="text-sm text-white/40">Nothing here yet.</p>}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link href={profilePath(type, p.slug)} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded hover:border-[#99ccff]/50 hover:bg-[#99ccff]/5 transition-all">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" width={48} height={48} className="w-12 h-12 rounded object-cover shrink-0" />
                ) : (
                  <span className="w-12 h-12 rounded bg-black/40 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-bold truncate">{p.name}</span>
                  {p.role && <span className="block text-[11px] text-white/45 truncate">{p.role}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
