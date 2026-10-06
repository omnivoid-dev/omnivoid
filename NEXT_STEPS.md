# OMNIVOID LABS - Next Steps & Feature Roadmap

## 🎯 Upcoming Milestone: Agent System, 3D Audio Visuals & MP3 Backend

---

### 1. 🤖 Agent System Integration
* **Agent Overlay**: Bring back and modernize the interactive Agent System (`AgentSystem.js` / React component) for autonomous, retro-futuristic site interactions.
* **State & Dialogue**: Connect agent status and text output to user interactions and audio playback events.

---

### 2. 🌌 3D Interactive Graphics Engine
* **3D Library Integration**: Integrate Three.js / WebGL canvas rendering into the application lifecycle.
* **Particle & Geometry Systems**: Create customizable 3D particle fields, tunnels, and geometric structures that respond dynamically to scene state.

---

### 3. 🎵 Audio Reactivity & Web Audio Engine
* **Frequency Analysis**: Connect Web Audio API (`AudioContext`, `AnalyserNode`, `AudioWorklet`) to live audio streams.
* **Visual Modulation**: Bind FFT audio analysis (bass, midrange, high frequencies, transients) to 3D parameters:
  * Particle scale, color shifting, and speed
  * Camera pulse and rotation
  * Mesh distortion and lighting intensity

---

### 4. 🎧 MP3 Backend Management & Audio Player
* **MP3-Only Admin Management**:
  * Dedicated MP3 upload interface in `/admin/resources` (or `/admin/audio`).
  * Direct signed URL uploads of `.mp3` files to Supabase Storage bucket (`media/audio/`).
  * Metadata editing (Track title, artist, edition association, duration, sort order).
* **Integrated Site Audio Player**:
  * Build an audio player window/modal connected to the Web Audio reactivity engine.
  * Playlist streaming directly from Supabase Storage public MP3 URLs.

---

## 🛠️ Action Items for Next Session
1. Install and configure 3D rendering packages (`three`, `@types/three`).
2. Build Web Audio API analyzer hook (`useAudioAnalyzer`) for frequency and waveform data extraction.
3. Build the MP3 upload view in the Admin Panel with Supabase Storage signed URLs.
4. Integrate the 3D canvas background and bind it to the MP3 audio player.
