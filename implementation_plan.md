# OMNIVOID LABS - Backend CMS & Content Architecture Plan (Next Session)

## 🎯 Architecture Overview
Refine the OMNIVOID CMS and frontend components to ensure complete modular independence between Info Pages, Edition Portfolios (Latest Ritual/Event), PDF Research Resources, and Audio Stream Management.

---

### 1. 📄 Standalone Info Pages & Text Content (`/admin/documents`)
* **Objective**: Separate static text pages (Conundrum, Contact, About/Labs) from standard media resources.
* **Backend CMS (`/admin/documents`)**:
  * Dedicated management for `Document` model entries where `type IN ('CONUNDRUM', 'CONTACT', 'LABS', 'RESEARCH')`.
  * Independent rich-text / markdown editor with live preview for Conundrum text and Contact information.
* **Frontend UI**:
  * "CONUNDRUM" and "CONTACT" windows pull directly from these independent `Document` records without reliance on edition filters.

---

### 2. 🏛️ Edition Portfolio & "Latest Ritual" System (`/admin/editions`)
* **Core Concept**: "Rituals" is not a separate entity type; it represents the **Featured / Active Edition Portfolio** (e.g. Edition 010).
* **Edition Data Structure Enhancement**:
  * `Edition` model extended with structured metadata:
    * **Primary Edition Poster**: Image URL / Supabase Storage path.
    * **Workshop Details**: Poster URL, workshop title, description, materials, schedule.
    * **Performers & Lineup**: Array of performer objects `{ name, role, bio, image }`.
    * **Edition Media Gallery**: Images and posters specifically linked to this edition.
    * **Edition YouTube Links**: Live transmission video links associated with this edition.
* **Frontend "Latest Ritual" Window**:
  * Dynamically renders the currently active / upcoming edition (e.g. Edition 010).
  * Displays tabs for: `MAIN POSTER`, `WORKSHOP & MATERIALS`, `PERFORMERS & LINEUP`, `TRANSMISSION VIDEOS`, `GALLERY`.

---

### 3. 📚 Dedicated Research PDF Resources (`/admin/resources`)
* **Objective**: Scope the "Resources" section exclusively to PDF research papers and downloadable documentation.
* **Backend CMS (`/admin/resources`)**:
  * Filter view exclusively for `ResourceType === 'DOCUMENT'` / PDF files.
  * Direct PDF upload via Supabase Storage signed URLs (`media/docs/`).
* **Frontend UI ("RESEARCH" Window)**:
  * Renders clean research library cards with PDF download/view buttons and research excerpts.

---

### 4. 🎧 Dedicated Audio Player & Stream Management (`/admin/audio`)
* **Objective**: Independent management of MP3 audio tracks and playlists.
* **Backend CMS (`/admin/audio`)**:
  * Dedicated route/view for uploading MP3s, setting track titles, artists, sort orders, and linking to editions.
* **Frontend UI ("AUDIO STREAM PLAYER")**:
  * Standalone floating Audio Player Window (`AudioPlayerWindow.tsx`) streaming MP3s directly from Supabase Storage, driving the 3D WebGL particle visualizer (`ThreeCanvas.tsx`).

---

## 🛠️ Step-by-Step Implementation Roadmap for Next Session

1. **Step 1: Database & API Refinement**
   - Update Prisma schema / API endpoints to cleanly isolate `Document` (Info Pages), `Edition` (Performers, Posters, Workshop), `Resource` (PDFs only), and `Audio` (MP3s).
2. **Step 2: Admin Panel Restructuring**
   - Create separate admin navigation items:
     - 📁 **Info Pages** (`/admin/documents`) - Conundrum & Contact text
     - 🎨 **Editions & Rituals** (`/admin/editions`) - Edition posters, workshops, performers, videos
     - 📄 **Research PDFs** (`/admin/resources`) - PDF research documents only
     - 🎧 **Audio Streams** (`/admin/audio`) - MP3 audio tracks & metadata
3. **Step 3: Frontend Window Integration**
   - Refactor `RetroWindow` content loaders in `src/app/page.tsx` so each window fetches from its dedicated modular API route.
   - Update "RITUALS" window to render full Edition 010 / Latest Edition poster, workshop details, performers, and gallery.
