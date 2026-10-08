# OMNIVOID LABS - Next Steps & Feature Roadmap

## ✅ Recently Completed
*October 8-9, 2026* — see `STATUS_REPORT.md` for detail.
* Modular editions (performers, transmissions, workshop slot, ticket links on the Latest Ritual only)
* Research PDFs (10MB) with thumbnails (3MB, optimised to WebP), audio playlist with performers, editable YouTube display names
* Radio: Mixcloud admin and a React RADIO window
* Dynamic logo and menu icons with solid/gradient tint
* Serverless image optimiser, save-and-purge storage cleanup
* Plexus background restored; starfield behind a toggle (off by default)

> **Deploy first:** `npx prisma db push`, `npx prisma generate`, then `scripts/migrate-links-to-transmissions.ts`, `scripts/seed-radio.ts` and `scripts/migrate-performers-to-profiles.ts`.

---

## 🎯 Next Order of Business

### 0. 🎨 Edition Themes + GLSL Effects — COLOURS DONE, SHADERS NEXT
* **Done:** each edition has a theme (preset + palette) edited in the Theme tab of the edition editor. Selecting an edition applies it: the agents crossfade to the edition's ink and the page background follows. Windows stay constant. The site opens on the neutral look; a footer chip returns to it. Presets live in `src/lib/themes.ts` (Edition 008 and 010 palettes are placeholders).
* **Dither built (Edition 001 and 007):** `BackgroundFX` redraws the plexus through an 8x8 Bayer dither at a low "cell" resolution (3px; chunkier on phones), with a drifting noise field, a glow under the cursor and the beat pulse feeding the threshold. Crossfades in and out, has a footer FX toggle, and falls back to the plain plexus without WebGL or with reduced motion. Add `?fxdebug=1` to the URL for live tuning sliders (cell, contrast, field, glow, beat). It hides the starfield while active.
* **Riso (Edition 002) and Glitch (Edition 008) built** on the same layer: riso = two spot-colour halftone layers (ink, accent) on grainy paper with misregistration and ink dropout; glitch = row tearing, block swaps, ink/accent channel split, scanlines, faint print-layer lines, with bursts on their own, on the beat and on every theme change. All three effects have tuning sliders under `?fxdebug=1`.
* **ASCII (Edition 003) built**, two passes: a tiny one-pixel-per-character pass measures the plexus (49 taps per cell) and bakes the background field, then a full-resolution pass draws glyphs from a rasterised atlas (a 70-character ramp from empty to dense). Agents print in the ink colour, the field in dim accent grey, with shimmer that grows near the cursor. Tunable: glyph size, contrast, field, flicker, beat.
* **Oscilloscope (004) built:** feedback buffer with phosphor persistence; beams from the agents, the cursor and a scope trace drawn from the live audio waveform (an idle wave when silent); CRT display pass with bloom, raster lines, curvature, vignette, flicker and sync jitter.
* **Vanity (La Nuit Blanche special, theme "Moulin Rouge") built as a Broadway marquee:** a wall of big bulbs on bright maroon that flash in cycling patterns (alternating, sweep chase, radial pulse, twinkle) with the border always chasing; agents switch bulbs on, the cursor lights its neighbourhood, and every beat or theme change flashes the wall. Palette: bright maroon, warm bulb white, amber glow.
* **Next:** AI goo (005), cyanotype (009), Mandelbrot (010). Oscilloscope and goo will need a feedback buffer (previous frame), which the framebuffer plumbing from ASCII now makes straightforward. for the agents and background, one effect per edition: dither (001, 007), riso halftone (002), ASCII cell mosaic (003), vanity glow and grain (special), oscilloscope phosphor trails (004), liquid metallic goo (005), glitch / block displacement (008, also as short bursts), cyanotype (009), Mandelbrot (010). Start with dither, riso and glitch. Needs a playground page to tune each effect, a footer toggle, lower resolution on phones, and a static fallback for reduced motion or no WebGL.
* **Data still to confirm:** the performer lineups (stage B of `scripts/populate-editions.ts`, review first) and the dates for Editions 008 and 009.

### 1. 🤖 Agent System Improvement — FIRST PASS DONE
* **Done:** agents gather around and scale up near the cursor (with lines from the cursor), and drawing pauses when the tab is hidden.
* **Remaining:** define further behaviour, edition-themed colours, mobile density and a spatial grid for the connection checks.
* The plexus (`AgentSystem.ts`) is currently a faithful port of the original: random agents bouncing around with distance-based connection lines.
* Define the desired behaviour with the owner (what the agents should *do*), then improve it. Candidates: cursor interaction, clustering around the open window, edition-themed colours, density that responds to screen size, and a pause when the tab is hidden.
* Reconcile the plexus with the `AgentOverlay` dialogue HUD so they feel like one system.
* Performance pass: spatial grid for the connection checks, and a lower agent count on mobile.

### 2. 🎚️ Audio Reactivity — PLEXUS DONE, STARFIELD PENDING
* **Done:** the plexus pulses in scale with the beat and bass (per-agent frequency bins), driven by the audio player. A built-in demo track (`47K - Phase 01`) is loaded from `public/audio`.
* **Also done:** MP3 compression: a browser-side bitrate option on upload (default 128 kbps) and `scripts/compress-audio.ts` for existing files.
* **Remaining:** starfield reactivity, an intensity control, and showing a playlist name in the player.
* Reconnect the Web Audio analyzer (`useAudioAnalyzer`: bass / mid / treble / beat) to the plexus and the starfield. Reactivity is currently disconnected.
* Map the bands to specific visuals (for example bass to agent size and connection distance, treble to colour or sparkle, beat to a pulse) and make the intensity adjustable.
* Fix the effect's dependence on play state so the scene is not rebuilt when audio starts or stops.

### 3-6. Performers, Collaborators, Affiliates, Menu Names — ADMIN BUILT, public pages deferred
Built as one shared `Profile` model (type PERFORMER / COLLABORATOR / AFFILIATE) with one editor and three admin pages.
* `/admin/performers`, `/admin/collaborators`, `/admin/affiliates`: name, role or category, photo or logo (3MB, optimised to WebP), **write-up**, website, Instagram, YouTube, order and visibility.
* Performers link to edition appearances: adding a performer to an edition finds or creates their shared profile by name (case-insensitive). `scripts/migrate-performers-to-profiles.ts` back-fills the existing rows.
* Menu names: each menu entry on the Dashboard branding panel has a name field (empty = default). Stored in `siteBranding.labels`, with three new icon/name slots for the new sections.
* `/api/content` already returns `profiles` (with each performer's editions) and `branding.labels`, ready for the front end.
* **To deploy:** `npx prisma db push`, `npx prisma generate`, then `scripts/migrate-performers-to-profiles.ts`.
* **Deferred (front end, do together):** PERFORMERS, COLLABORATORS and AFFILIATES windows in the Start menu; apply `menuLabelFor()` to menu items and window titles; render the write-up (decide Markdown vs plain paragraphs, and sanitise); performer pages showing their editions, videos, tracks and radio shows; link edition line-up names to profiles.

---

## 🔜 Later
* **Per-edition theming**: apply each edition's `themeColors` when it is selected (field already exists).
* **Housekeeping**: remove the leftover legacy YouTube `Link` rows once verified; schedule the storage cleanup; enforce the PDF size limit at the bucket level.
