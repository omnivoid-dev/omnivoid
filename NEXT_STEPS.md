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

### 1. 🤖 Agent System Improvement
* The plexus (`AgentSystem.ts`) is currently a faithful port of the original: random agents bouncing around with distance-based connection lines.
* Define the desired behaviour with the owner (what the agents should *do*), then improve it. Candidates: cursor interaction, clustering around the open window, edition-themed colours, density that responds to screen size, and a pause when the tab is hidden.
* Reconcile the plexus with the `AgentOverlay` dialogue HUD so they feel like one system.
* Performance pass: spatial grid for the connection checks, and a lower agent count on mobile.

### 2. 🎚️ Audio Reactivity
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
