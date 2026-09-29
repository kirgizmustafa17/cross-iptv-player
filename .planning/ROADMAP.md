# Cross IPTV Player - GSD Roadmap & Milestones

## Milestone 1: Device ID Architecture & Backend Web Portal (Hot Player / SS IPTV Model)
- [x] **Phase 1.1**: Human-readable Device ID (`mavi-kartal-7421`) & PIN generation utility.
- [ ] **Phase 1.2**: Express REST API backend with JSON-based persistence (`server/data/devices.json`).
  - Endpoints: Device registration, playlist CRUD (Xtream Codes & M3U), active playlist selection, stream test.
- [ ] **Phase 1.3**: Hot Player-style Web Management Portal:
  - Mobile & desktop friendly web portal at `/portal` or port 5050.
  - Device ID & PIN authentication.
  - Playlist management interface: Add Xtream / M3U, edit, delete, activate, test connection.

## Milestone 2: TopBar Simplification & TV Ergonomics (Impeccable UI/UX)
- [ ] **Phase 2.1**: Streamline `TvTopBar.tsx`:
  - Remove unreachable "Ana Ekran" button (relies on remote Back / Esc / Backspace).
  - Remove redundant category pills and breadcrumbs.
  - Remove user/expiry pills from top bar.
  - Craft a sleek, unobtrusive, modern TV status bar (subtle live time, connection status, minimalist brand).
- [ ] **Phase 2.2**: Update `LiveTvView`, `VodView`, and `SeriesDetailView` to match the refined header layout.
- [ ] **Phase 2.3**: Ensure universal remote BACK / ESC navigation handles return flow seamlessly without needing mouse or top-bar button focus.

## Milestone 3: Landing Screen Redesign & Multi-Playlist Cloud Sync
- [ ] **Phase 3.1**: Display readable Device ID badge (`mavi-kartal-7421`) prominently on the Home screen.
- [ ] **Phase 3.2**: Add Web Portal Modal / QR Code card on TV screen for easy phone scanning.
- [ ] **Phase 3.3**: Account & Active Playlist Card on Landing screen:
  - Show active playlist name, username, expiry date, status cleanly.
- [ ] **Phase 3.4**: Multi-Playlist Selector Modal & Backend Sync integration:
  - Fetch playlists from backend by Device ID on launch and on manual refresh.
  - Allow switching between multiple playlists on the TV screen.

## Milestone 4: Integration, Build Verification & Polish
- [ ] **Phase 4.1**: Full build verification (`npm run build`).
- [ ] **Phase 4.2**: End-to-end testing of backend API, web portal, and TV player synchronization.
- [ ] **Phase 4.3**: Final UI/UX inspection and performance optimization.
