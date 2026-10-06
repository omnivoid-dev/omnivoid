# Handoff prompt (paste into a new Claude Code session opened at E:\Projects\omnivoid)

You are continuing work on OMNIVOID LABS, a Next.js 14 (App Router) + Prisma 5 + Tailwind site. The working folder is E:\Projects\omnivoid. Ignore the old copy at K:\H DRIVE\Quantum Climb\APPS\OMNIVOID\LABS3.

## State
- Git remote: https://github.com/omnivoid-dev/omnivoid.git (branch master, up to date). Do not commit fluid.zip.
- Hosting: Vercel. Database: Supabase Postgres (project ref szmrtuugvczsnhhmjixl, region ap-southeast-2) accessed via Prisma. Neon is the old database and still holds the original content.
- `prisma db push` has been run against Supabase. All 7 tables exist and are empty. `seed:admin` and `migrate:content` have NOT been run.
- The start screen now has a live "ENTER OMNIVOID" button (src/components/StartScreen.tsx) and a secondary "LEGACY SITE" link.
- Auth is currently a single shared ADMIN_PASSWORD + JWT (src/lib/auth.ts, src/app/api/admin/login/route.ts).
- .env (git-ignored) holds: DATABASE_URL (transaction pooler, 6543, pgbouncer=true), DATABASE_URL_UNPOOLED (session pooler, 5432), JWT_SECRET, ADMIN_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY. The database password contains + and # and must stay URL-encoded (%2B, %23). Never print secret values.
- Prisma connects as the database owner and bypasses RLS. Only server routes may touch these tables.

## Known issue to fix first (Vercel)
The Vercel Prisma integration injected DATABASE_URL, POSTGRES_URL and PRISMA_DATABASE_URL pointing at a Prisma-hosted DB, overriding Supabase. These must be removed and replaced with the Supabase pooled values from .env, then redeploy without build cache.

## Tasks, in order
1. Decide with me how to move content: dump/restore from Neon (old URLs are in git history of .env.example only, ask me for the Neon string) or re-enter via admin.
2. Replace the shared-password admin login with Supabase Auth users: install @supabase/supabase-js and @supabase/ssr, add server/browser clients, protect /admin and /api/admin/* via session + an admin role (app_metadata.role), remove ADMIN_PASSWORD and the AdminUser model once migrated. Supabase redirect URLs: production domain, the Vercel preview wildcard, and http://localhost:8080/**.
3. Media uploads (audio, video, gallery): create Supabase Storage buckets, add an admin route that returns signed upload URLs so the browser uploads directly (Vercel body limit is about 4.5 MB), store the path in Resource.filePath, and add *.supabase.co to images.remotePatterns in next.config.mjs.
4. Cleanup: delete the dead src/api/ tree (the live routes are in src/app/api/), move public/audio and public/gallery into Storage, update package.json repository/homepage URLs to the new repo.

Run `npx tsc --noEmit` after each change. Dev server: `npm run dev` (port 8080). Ask before pushing or touching production settings.
