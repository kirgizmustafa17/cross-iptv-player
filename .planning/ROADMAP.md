# Cross IPTV Player - GSD Roadmap & Milestones

## Milestone 1: Device ID Architecture & Backend Web Portal (Hot Player / SS IPTV Model)
- [x] **Phase 1.1**: Human-readable Device ID (`mavi-kartal-7421`) & PIN generation utility (`src/services/device.ts`).
- [x] **Phase 1.2**: Express REST API backend with JSON-based persistence (`server/data/devices.json`).
  - Endpoints: Device registration, playlist CRUD (Xtream Codes & M3U), active playlist selection, stream test.
- [x] **Phase 1.3**: Hot Player-style Web Management Portal (`server/public/index.html`):
  - Mobile & desktop friendly web portal at `/portal` or port 5050.
  - Device ID & PIN authentication with URL parameter auto-connect (`?device=...`).
  - Playlist management interface: Add Xtream / M3U, edit, delete, activate, test connection.

## Milestone 2: TopBar Simplification & TV Ergonomics (Impeccable UI/UX)
- [x] **Phase 2.1**: Streamline `TvTopBar.tsx`:
  - Removed unreachable "Ana Ekran" button (relies on remote Back / Esc / Backspace).
  - Removed redundant category pills and breadcrumbs (sidebar already shows active category).
  - Removed user/expiry pills from inner player top bar.
  - Slimmed height to 44px (h-11) for maximum video/content visibility.
  - Subtle live clock, network status indicator, and minimalist brand mark.
- [x] **Phase 2.2**: Updated `LiveTvView`, `VodView`, and `SeriesDetailView` to match the refined header layout.
- [x] **Phase 2.3**: Ensured universal remote BACK / ESC navigation handles return flow seamlessly without needing mouse or top-bar button focus.

## Milestone 3: Landing Screen Redesign & Multi-Playlist Cloud Sync
- [x] **Phase 3.1**: Display readable Device ID badge (`mavi-kartal-7421`) and PIN prominently on the Home screen.
- [x] **Phase 3.2**: Added `DevicePortalModal` with dynamic QR Code for instant phone camera scanning (`qrcode.react`).
- [x] **Phase 3.3**: Account & Active Playlist Card on Landing screen:
  - Displays active playlist name, username, expiry date, status cleanly in home status bar.
- [x] **Phase 3.4**: Multi-Playlist Selector Modal (`PlaylistSwitcherModal.tsx`) & Backend Sync integration:
  - Fetches playlists from backend by Device ID on launch and on manual refresh.
  - Allows switching between multiple playlists on the TV screen via remote control.

## Milestone 4: Integration, Build Verification & Polish
- [x] **Phase 4.1**: Full build verification (`tsc -b && vite build`) passing with zero errors.
- [x] **Phase 4.2**: End-to-end testing of backend API, web portal, and TV player synchronization confirmed with automated tests.
- [x] **Phase 4.3**: TV-first D-pad focus states, accessibility, and error fallbacks verified.
