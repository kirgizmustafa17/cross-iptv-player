import React, { useState, useEffect } from 'react';
import type { MainTab, XtreamUserInfo, XtreamCredentials } from '../types/iptv';
import type { StoredPlaylist } from '../services/device';
import {
  Tv,
  Clapperboard,
  Film,
  RefreshCw,
  ListPlus,
  Flame,
  Globe,
  Hourglass,
  QrCode,
  Layers,
  Clock,
  Wifi,
  User,
  ShieldCheck,
} from 'lucide-react';

interface LandingPageProps {
  userInfo: XtreamUserInfo | null;
  credentials: XtreamCredentials;
  deviceInfo: { deviceId: string; pin: string };
  activePlaylist: StoredPlaylist | null;
  playlistsCount: number;
  liveCount: number;
  movieCount: number;
  seriesCount: number;
  isSyncing?: boolean;
  onSelectSection: (tab: MainTab) => void;
  onRefresh: () => void;
  onOpenPlaylistSwitcher: () => void;
  onOpenPortalModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  userInfo,
  credentials,
  deviceInfo,
  activePlaylist,
  playlistsCount,
  liveCount,
  movieCount,
  seriesCount,
  isSyncing = false,
  onSelectSection,
  onRefresh,
  onOpenPlaylistSwitcher,
  onOpenPortalModal,
}) => {
  // Focus Index for TV Remote:
  // 0: Live TV, 1: Movies, 2: Series
  // 3: Refresh / Sync, 4: Playlist Switcher, 5: Web Portal QR, 6: Language
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [lang, setLang] = useState<'TR' | 'EN'>('TR');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Format expiration date from epoch timestamp
  const formatExpiry = (epochStr?: string) => {
    if (!epochStr) return 'Süresiz';
    const num = parseInt(epochStr, 10);
    if (isNaN(num) || num <= 0) return 'Süresiz';
    const date = new Date(num * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const expiryText = formatExpiry(userInfo?.exp_date);
  const accountStatus = userInfo?.status || 'Aktif';

  // Keyboard / TV Remote navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === 0) return 1;
          if (prev === 1) return 2;
          if (prev >= 3 && prev < 6) return prev + 1;
          return prev;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === 2) return 1;
          if (prev === 1) return 0;
          if (prev > 3 && prev <= 6) return prev - 1;
          return prev;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === 0) return 3;
          if (prev === 1) return 4;
          if (prev === 2) return 5;
          return prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === 3) return 0;
          if (prev === 4) return 1;
          if (prev === 5 || prev === 6) return 2;
          return prev;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex === 0) onSelectSection('live');
        else if (focusedIndex === 1) onSelectSection('movies');
        else if (focusedIndex === 2) onSelectSection('series');
        else if (focusedIndex === 3) onRefresh();
        else if (focusedIndex === 4) onOpenPlaylistSwitcher();
        else if (focusedIndex === 5) onOpenPortalModal();
        else if (focusedIndex === 6) setLang((prev) => (prev === 'TR' ? 'EN' : 'TR'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    focusedIndex,
    onSelectSection,
    onRefresh,
    onOpenPlaylistSwitcher,
    onOpenPortalModal,
  ]);

  const cards = [
    {
      id: 'live' as MainTab,
      index: 0,
      title: lang === 'TR' ? 'Canlı TV' : 'Live TV',
      subtitle: `${liveCount} Kanal Grubu`,
      gradient: 'from-amber-500/20 via-slate-900/60 to-slate-900/90',
      icon: (
        <div className="relative flex items-center justify-center">
          <Tv className="w-16 h-16 text-amber-400 stroke-[1.8]" />
          <div className="absolute w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-amber-400 border-b-[7px] border-b-transparent ml-1" />
        </div>
      ),
    },
    {
      id: 'movies' as MainTab,
      index: 1,
      title: lang === 'TR' ? 'Filmler' : 'Movies',
      subtitle: `${movieCount} Film Kategorisi`,
      gradient: 'from-blue-500/20 via-slate-900/60 to-slate-900/90',
      icon: <Clapperboard className="w-16 h-16 text-blue-400 stroke-[1.8]" />,
    },
    {
      id: 'series' as MainTab,
      index: 2,
      title: lang === 'TR' ? 'Diziler' : 'Series',
      subtitle: `${seriesCount} Dizi Kategorisi`,
      gradient: 'from-purple-500/20 via-slate-900/60 to-slate-900/90',
      icon: <Film className="w-16 h-16 text-purple-400 stroke-[1.8]" />,
    },
  ];

  const playlistTitle = activePlaylist?.name || credentials.username || 'Varsayılan Liste';

  return (
    <div className="relative w-screen h-screen bg-[#050b14] text-white flex flex-col justify-between items-center p-6 md:p-8 select-none overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/6 left-1/2 -translate-x-1/2 w-[700px] h-[260px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Header: Brand, Device ID Pill & Digital Clock */}
      <div className="w-full max-w-6xl flex items-center justify-between z-10">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Flame className="w-10 h-10 text-amber-500 fill-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl md:text-3xl font-light text-slate-200 tracking-wide">
              Cross
            </span>
            <span className="text-2xl md:text-3xl font-black text-white tracking-wider">
              IPTV
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 ml-1 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
              Pro Player
            </span>
          </div>
        </div>

        {/* Center: Device ID Hero Badge (Hot Player / SS IPTV Style) */}
        <button
          onClick={onOpenPortalModal}
          className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/60 shadow-lg backdrop-blur-md transition-all cursor-pointer group"
          title="Web Yönetim Portalını Açmak için Tıklayın"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">Device ID:</span>
            <span className="text-xs font-mono font-black text-amber-400 tracking-wider group-hover:text-amber-300">
              {deviceInfo.deviceId}
            </span>
          </div>

          <div className="h-3.5 w-px bg-slate-700" />

          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
            <span className="text-slate-500">PIN:</span>
            <span className="font-bold text-white">{deviceInfo.pin}</span>
          </div>

          <div className="px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[10px] font-extrabold uppercase flex items-center gap-1">
            <QrCode className="w-3 h-3" />
            <span>Web Portalı</span>
          </div>
        </button>

        {/* Right: Digital Clock & Network */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Bağlı</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 font-mono text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTimeStr || '00:00'}</span>
          </div>
        </div>
      </div>

      {/* Center: 3 Big Interactive Media Cards */}
      <div className="w-full max-w-5xl grid grid-cols-3 gap-6 my-auto z-10 px-4">
        {cards.map((card) => {
          const isFocused = focusedIndex === card.index;

          return (
            <button
              key={card.id}
              onClick={() => onSelectSection(card.id)}
              onMouseEnter={() => setFocusedIndex(card.index)}
              className={`group relative flex flex-col items-center justify-center aspect-[16/11] rounded-3xl bg-gradient-to-b ${card.gradient} border-2 transition-all duration-200 cursor-pointer shadow-2xl tv-focusable ${
                isFocused
                  ? 'border-amber-400 bg-slate-800/90 scale-105 shadow-2xl shadow-amber-400/25 ring-4 ring-amber-400/40'
                  : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              {/* Inner Icon */}
              <div className="mb-4 transform transition-transform group-hover:scale-110">
                {card.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl md:text-2xl font-black text-white tracking-wide">
                {card.title}
              </h3>

              {/* Subtitle / Counts */}
              <span className="text-xs text-slate-400 font-semibold mt-1 font-mono">
                {card.subtitle}
              </span>

              {/* Selection Indicator on Focus */}
              {isFocused && (
                <div className="absolute bottom-3 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-bounce">
                  Giriş Yap [OK]
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Account Info Pill & TV Action Row */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-4 z-10">
        {/* Active Account Status Bar (Cleaned from top bar to home screen as requested) */}
        <div className="flex flex-wrap items-center justify-center gap-4 px-6 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-semibold shadow-xl backdrop-blur-md">
          {/* Active Playlist */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Aktif Liste:</span>
            <span className="text-amber-400 font-bold tracking-wide truncate max-w-xs">
              {playlistTitle}
            </span>
          </div>

          <div className="w-px h-3.5 bg-slate-800 hidden sm:block" />

          {/* User */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Kullanıcı:</span>
            <span className="text-white font-mono font-bold">
              {credentials.username || 'Default'}
            </span>
          </div>

          <div className="w-px h-3.5 bg-slate-800 hidden sm:block" />

          {/* Status */}
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>{accountStatus}</span>
          </div>

          <div className="w-px h-3.5 bg-slate-800 hidden sm:block" />

          {/* Expiration */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <Hourglass className="w-4 h-4 text-amber-400" />
            <span>Bitiş: {expiryText}</span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* 3: Refresh & Sync */}
          <button
            onClick={onRefresh}
            onMouseEnter={() => setFocusedIndex(3)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all tv-focusable cursor-pointer ${
              focusedIndex === 3
                ? 'bg-amber-400 text-slate-950 border-amber-300 scale-105 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{lang === 'TR' ? 'Yenile & Senkronize Et' : 'Sync & Refresh'}</span>
          </button>

          {/* 4: Change Playlist / Switcher */}
          <button
            onClick={onOpenPlaylistSwitcher}
            onMouseEnter={() => setFocusedIndex(4)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all tv-focusable cursor-pointer ${
              focusedIndex === 4
                ? 'bg-amber-400 text-slate-950 border-amber-300 scale-105 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>
              {lang === 'TR' ? `Oynatma Listeleri (${playlistsCount})` : `Playlists (${playlistsCount})`}
            </span>
          </button>

          {/* 5: Web Portal QR Modal */}
          <button
            onClick={onOpenPortalModal}
            onMouseEnter={() => setFocusedIndex(5)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all tv-focusable cursor-pointer ${
              focusedIndex === 5
                ? 'bg-blue-600 text-white border-blue-400 scale-105 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'TR' ? 'Web Yönetim Portalı (QR)' : 'Web Portal (QR)'}</span>
          </button>

          {/* 6: Language */}
          <button
            onClick={() => setLang((prev) => (prev === 'TR' ? 'EN' : 'TR'))}
            onMouseEnter={() => setFocusedIndex(6)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all tv-focusable cursor-pointer ${
              focusedIndex === 6
                ? 'bg-amber-400 text-slate-950 border-amber-300 scale-105 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang}</span>
          </button>
        </div>
      </div>

      {/* Footer Legal Disclaimer */}
      <div className="text-[11px] text-slate-500 font-medium text-center z-10">
        Cross IPTV Player © • Media Player Platform (Hot Player & SS IPTV Sync Compatible)
      </div>
    </div>
  );
};

export default LandingPage;
