# Cross IPTV Player - Pro TV & Web Portal Platform

## Vision & Core Objectives
Cross IPTV Player is an enterprise-grade, TV-first media player (compatible with Android TV, LG webOS, Samsung Tizen, and Web browsers) coupled with an external Web Management Portal inspired by industry leaders like Hot Player and SS IPTV.

## User Constraints & Core Directives
1. **Device ID Format**:
   - Human-readable slug format like `mavi-kartal-7421` (Turkish adjective + noun + 4-digit number), avoiding cryptic UUID strings.
   - Associated with a 4-digit Device PIN/Key for secure web portal management.
2. **Web Portal & Backend Architecture**:
   - Centralized backend providing REST API and Web Management Portal.
   - Users can visit the web portal from any mobile phone, tablet, or desktop browser.
   - Enter Device ID (and PIN) to manage playlists (Xtream Codes API credentials, M3U URLs, EPG sources).
   - Real-time or on-refresh synchronization with TV player instances.
3. **Impeccable UI/UX & TV Remote Navigation**:
   - Eliminate unreachable/redundant header controls:
     - TV remotes handle back navigation natively via the remote's `BACK` / `ESC` / `Backspace` key. No bulky "Ana Ekran" button in top bar.
     - Breadcrumb duplicates removed: Category name is already highlighted in the sidebar.
     - Account clutter removed from inner player top bars: Expiry date, list name, and credentials belong on the Landing/Home screen or Settings.
   - Clean, cinematic, high-contrast TV-first aesthetic:
     - Fluid D-pad navigation with distinct visual focus rings.
     - Fast category/channel switching with mini-player preview and instant fullscreen playback.
     - Marquee text scrolling on focus for long titles.
