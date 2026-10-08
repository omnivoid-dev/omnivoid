# OMNIVOID Project Status Report - October 9, 2026

## 🎯 Completed Objectives

### 1. Modular Editions (Edition is the parent of everything)
- **Schema**: `Edition` now carries venue, city, poster, `isLatestRitual`, `ticketUrl` / `ticketLabel`, a workshop slot (title, description, date/time, poster, ticket link) and `themeColors` (reserved for per-edition theming). New `Performer` and `Transmission` tables hang off an edition. The unused `Gig` model, admin page and API were removed.
- **Latest Ritual rule** (`src/lib/editions.ts`): only one edition can be the Latest Ritual, and ticket links exist only on that edition. Saving an edition without the flag clears its ticket links, so stale links cannot linger.
- **Transactional save**: an edition saves with its performers and videos in one transaction. Performer ids are preserved across saves so audio tracks and videos stay linked.
- **Admin editor** (`EditionEditorModal.tsx`): tabs for Details, Ritual (poster upload, ticket link and label), Workshop, Performers (name, Instagram, YouTube) and Transmissions (each video can be tied to a performer).
- **Public site**: `RitualsWindow` has a collapsible edition list, poster, tickets button (Latest Ritual only), workshop block, lineup and videos. `TransmissionsWindow` groups videos by edition with a performer/title search and edition filter. Labs reuses the same component.

### 2. Content Management Split
- **Research Papers** (`/admin/research`): PDF-only uploads, 10MB limit (checked in the browser and on the server), shown in the RESEARCH window.
- **Audio Player** (`/admin/audio`): MP3 upload with an editable track name, performer association, and an inline "add performer" for the selected edition. Existing tracks can be edited.
- **YouTube Transmissions** (`/admin/transmissions`): an editable display name separate from the original YouTube title, a "fetch title" button (oEmbed), and filters by edition and performer. The 25 legacy YouTube `Link` rows are copied across by `scripts/migrate-links-to-transmissions.ts`.
- **Media Library** (`/admin/media`): the former Resources page, now for non-audio assets only.

### 3. Dynamic Branding
- **Logo and menu icons** are replaceable from the Dashboard (SVG, or PNG with transparency, up to 1MB, with reset to default).
- **Tinting** (`TintedImage.tsx`): original, solid colour or gradient (two colours and an angle), applied by using the image's alpha as a mask. The logo has its own tint; menu icons share one.
- The seven original project menu icons are restored in the Start menu. Settings are stored in `SiteSettings` under `siteBranding` and served through `/api/content`.

### 4. Visual Layer
- **Plexus** (`AgentSystem.ts`) is the original project's agent network, ported to TypeScript. A missing `--fg-color` had left it invisible; it now falls back to `#99ccff`.
- **Starfield** (`ThreeCanvas.tsx`): the rotating sphere and rings were removed. 900 particles at half the previous speed, behind a footer toggle that starts **off**. Audio reactivity is disconnected for now.

### 5. Radio (Mixcloud)
- **`RadioShow` table** (display name, original Mixcloud title, cover art, author, optional edition and performer, order, visibility) with `/admin/radio`.
- **Fetch details**: pasting a Mixcloud URL pulls title, author and cover art via Mixcloud oEmbed (`/api/admin/mixcloud-meta`). The display name stays editable.
- **RADIO window** (`RadioWindow.tsx`): React window with an embedded Mixcloud player, previous/next, search, and cover-art cards. The old popup's incorrect feed path was fixed through the shared `src/lib/mixcloud.ts`.
- `scripts/seed-radio.ts` imports the 8 legacy shows from `mixcloudPlaylists.js`.

### 6. Research Thumbnails, Image Optimisation and Storage Cleanup
- **Thumbnails**: optional image per research paper (3MB limit, enforced server-side), shown on the paper cards.
- **Serverless WebP optimiser** (`/api/admin/images`, `sharp`): validates the real file format, auto-rotates, resizes (thumbnails 800px, posters 1600px) and converts to WebP. Edition posters use it too (4MB limit, under Vercel's 4.5MB cap).
- **Save-and-purge** (`src/lib/storage.ts`): replaced or deleted papers, posters, tracks and branding images remove their old files unless something still references them. A Dashboard **Storage cleanup** panel finds uploads that were never saved (older than 24h) and purges them on request.
- Uploads now keep their folder (`research/`, `audio/`, `posters/`, `thumbnails/`, `branding/`).

### 7. Profiles (Performers, Collaborators, Affiliates) and Menu Names — admin only
- **Shared `Profile` model** with a type; one reusable editor (`ProfileManager.tsx`) drives `/admin/performers`, `/admin/collaborators` and `/admin/affiliates`: photo or logo (WebP-optimised), role or category, write-up, website, Instagram, YouTube, order, visibility.
- Edition performers now link to a shared profile (found or created by name when an edition is saved); a back-fill script handles existing rows. Profile images take part in storage cleanup.
- **Menu names**: editable per menu entry from the Dashboard branding panel (`siteBranding.labels`); three new slots for the new sections.
- `/api/content` exposes `profiles` and `branding.labels`. The public windows and applying the menu names are deferred until the remaining back-end work is done.

### 8. Foundation (earlier work)
- Supabase Postgres + Supabase Auth with route protection via `middleware.ts`.
- Web Audio analyzer hook, audio player window, and Agent dialogue overlay.
- Direct browser-to-Supabase signed-URL uploads (`/api/admin/upload-url`, with per-type size limits).

---

## ⚠️ Known Gaps
- **Database not yet updated.** `npx prisma db push` is still required for `Transmission`, `Performer`, `RadioShow` and the new `Profile`, `Document.thumbnailUrl`, `Resource.performerId`, `Performer.profileId` and `Transmission.originalTitle`. Then run `scripts/migrate-links-to-transmissions.ts`, `scripts/seed-radio.ts` and `scripts/migrate-performers-to-profiles.ts`.
- The legacy YouTube `Link` rows remain in the database after migration, pending cleanup once the new site is verified.
- Performers are per edition, so the same artist on two editions is two rows (search by name finds both). A public Performers page will need a shared artist record.
- Files uploaded before this release sit in the storage bucket root and are not covered by automatic cleanup; legacy `docs/` and `gallery/` are never purged.
- The 10MB PDF limit relies on the size the browser declares (images are enforced server-side). Storage cleanup is manual, not scheduled.
- Public PERFORMERS / COLLABORATORS / AFFILIATES windows are not built, and the public menu does not yet read the custom menu names (admin side done).
- Edition theme switching is not wired up yet (data field exists).
- Starfield audio reactivity is disconnected, and the plexus does not react to audio.

## 📈 System Summary
* **Database**: Supabase Postgres via Prisma (Edition, Performer, Profile, Transmission, RadioShow, Resource, Link, Document, SiteSettings)
* **Auth**: Supabase Auth (`@supabase/ssr`)
* **Storage**: Supabase Storage (`media` bucket: `audio/`, `research/`, `posters/`, `thumbnails/`, `branding/`)
* **Visuals**: 2D plexus agents (always on), Three.js starfield (toggle, off by default)
* **Image pipeline**: `sharp` serverless WebP conversion with server-side size limits
* **Deploy steps**: `npx prisma db push`, `npx prisma generate`, then `npx tsx --env-file=.env scripts/migrate-links-to-transmissions.ts` and `npx tsx --env-file=.env scripts/seed-radio.ts`
