# OMNIVOID LABS - Next Steps & Feature Roadmap

## ✅ Recently Completed
*October 8, 2026* — see `STATUS_REPORT.md` for detail.
* Modular editions (performers, transmissions, workshop slot, ticket links on the Latest Ritual only)
* Research PDFs (10MB), audio playlist with performers, editable YouTube display names
* Dynamic logo and menu icons with solid/gradient tint
* Plexus background restored; starfield behind a toggle (off by default)

---

## 🎯 Next Order of Business

### 1. 📻 Radio (Mixcloud) — NEXT
The RADIO window still reads legacy `Link` rows and has no admin page (`/admin/links` was removed).
* Add a **Radio admin page** to manage Mixcloud links: URL, display name (editable, like transmissions), optional edition and performer, sort order, visibility.
* Decide the model: either a `RadioShow` table, or `Transmission` extended with a `MIXCLOUD` kind. Recommendation: a separate table, since radio is not tied to an edition.
* Auto-fetch the show title and thumbnail from the Mixcloud oEmbed endpoint when a URL is pasted.
* Rebuild the RADIO window as a React component with an embedded Mixcloud player.
* Migrate existing Mixcloud `Link` rows, then remove the leftover legacy YouTube `Link` rows once verified.

### 2. 🖼️ Research Paper Thumbnails
* Add a thumbnail slot to each research paper (image upload on `/admin/research`, stored on the `Document`).
* Show the thumbnail in the RESEARCH window cards. Consider optional auto-generation from the first PDF page as a fallback.

### 3. 🧭 Dynamic Menu Link Names
* Make the menu labels editable from the Dashboard (RESEARCH, RITUALS, TRANSMISSIONS, RADIO, GALLERY, LABS, CONUNDRUM, CONTACT), alongside the existing icon controls.
* Store them in the `siteBranding` setting (or a sibling key) and apply them in the Start menu and window titles. Keep the built-in names as defaults.

---

## 🔜 Later
* **Per-edition theming**: apply each edition's `themeColors` when it is selected (field already exists).
* **Audio reactivity**: reconnect the analyzer to the plexus.
* **Housekeeping**: remove files from Supabase Storage when a paper or track is deleted; enforce the PDF size limit at the bucket level.
