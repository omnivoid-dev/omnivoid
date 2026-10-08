# OMNIVOID LABS - Next Steps & Feature Roadmap

## ✅ Recently Completed
*October 8-9, 2026* — see `STATUS_REPORT.md` for detail.
* Modular editions (performers, transmissions, workshop slot, ticket links on the Latest Ritual only)
* Research PDFs (10MB) with thumbnails (3MB, optimised to WebP), audio playlist with performers, editable YouTube display names
* Radio: Mixcloud admin and a React RADIO window
* Dynamic logo and menu icons with solid/gradient tint
* Serverless image optimiser, save-and-purge storage cleanup
* Plexus background restored; starfield behind a toggle (off by default)

> **Deploy first:** `npx prisma db push`, `npx prisma generate`, then `scripts/migrate-links-to-transmissions.ts` and `scripts/seed-radio.ts`.

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

### 3. 🎤 Performers Page
* A public PERFORMERS window and an admin page for managing performers on their own, with a **write-up** (bio) per performer, photo, and Instagram / YouTube handles.
* Performers are currently per edition, so this needs a shared artist record that links to each edition they played. Migrate the existing rows and merge duplicates by name.
* From a performer's page: their editions, videos (transmissions), audio tracks and radio shows.

### 4. 🤝 Collaborators Page
* A COLLABORATORS window and admin page: name, logo or photo, role, **write-up**, and links.
* Same editing pattern as performers (write-up, image uploaded through the WebP optimiser, order, visibility).

### 5. 🏢 Affiliates Page
* An AFFILIATES window and admin page for businesses aligned with OMNIVOID LABS: name, logo, **write-up**, website and social links.
* Consider one shared "people and organisations" model with a type (Performer, Collaborator, Affiliate) so the three pages share one editor, rather than three copies.
* Decide how write-ups are authored (plain text with line breaks, Markdown, or a rich-text editor) and sanitise them on display.

### 6. 🧭 Dynamic Menu Link Names
* Make the menu labels editable from the Dashboard (RESEARCH, RITUALS, TRANSMISSIONS, RADIO, GALLERY, LABS, CONUNDRUM, CONTACT, and the new PERFORMERS, COLLABORATORS, AFFILIATES) alongside the icon controls.
* Store them in the `siteBranding` setting and apply them in the Start menu and window titles. Keep the built-in names as defaults.

---

## 🔜 Later
* **Per-edition theming**: apply each edition's `themeColors` when it is selected (field already exists).
* **Housekeeping**: remove the leftover legacy YouTube `Link` rows once verified; schedule the storage cleanup; enforce the PDF size limit at the bucket level.
