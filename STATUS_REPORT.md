# OMNIVOID Project Status Report - October 8, 2026

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

### 5. Foundation (earlier work)
- Supabase Postgres + Supabase Auth with route protection via `middleware.ts`.
- Web Audio analyzer hook, audio player window, and Agent dialogue overlay.
- Direct browser-to-Supabase signed-URL uploads (`/api/admin/upload-url`, with per-type size limits).

---

## ⚠️ Known Gaps
- **Radio has no admin.** The old `/admin/links` page was removed; the RADIO window still reads legacy `Link` rows.
- Deleting a paper or track removes the database row but not the file in Supabase Storage.
- The 10MB PDF limit relies on the size the browser declares; it is not enforced by the storage bucket.
- The legacy YouTube `Link` rows remain in the database after migration, pending cleanup once the new site is verified.
- Performers are per edition, so the same artist on two editions is two rows (search by name finds both).
- Edition theme switching is not wired up yet (data field exists).
- Starfield audio reactivity is disconnected.

## 📈 System Summary
* **Database**: Supabase Postgres via Prisma (Edition, Performer, Transmission, Resource, Link, Document, SiteSettings)
* **Auth**: Supabase Auth (`@supabase/ssr`)
* **Storage**: Supabase Storage (`media` bucket: `audio/`, `research/`, `posters/`, `branding/`)
* **Visuals**: 2D plexus agents (always on), Three.js starfield (toggle, off by default)
* **Deploy steps for this release**: `npx prisma db push`, `npx prisma generate`, then `npx tsx --env-file=.env scripts/migrate-links-to-transmissions.ts`
