import React, { useState, useEffect } from 'react';
import type { MainTab, XtreamUserInfo, XtreamCredentials } from '../types/iptv';
import {
  Tv,
  Clapperboard,
  Film,
  RefreshCw,
  ListPlus,
  Flame,
  Globe,
  Smile,
  Hourglass,
} from 'lucide-react';

interface LandingPageProps {
  userInfo: XtreamUserInfo | null;
  credentials: XtreamCredentials;
  liveCount: number;
  movieCount: number;
  seriesCount: number;
  onSelectSection: (tab: MainTab) => void;
  onRefresh: () => void;
  onChangePlaylist: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  userInfo,
  credentials,
  liveCount,
  movieCount,
  seriesCount,
  onSelectSection,
  onRefresh,
  onChangePlaylist,
}) => {
  // Focus Index for TV Remote:
  // 0: Live TV, 1: Movies, 2: Series
  // 3: Refresh, 4: Change Playlist, 5: Language
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [lang, setLang] = useState<'TR' | 'EN'>('TR');

  // Format expiration date from epoch timestamp
  const formatExpiry = (epochStr?: string) => {
    if (!epochStr) return 'Süresiz';
    const num = parseInt(epochStr, 10);
    if (isNaN(num) || num <= 0) return 'Süresiz';
    const date = new Date(num * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const expiryText = formatExpiry(userInfo?.exp_date);
  const accountStatus = userInfo?.status || 'Active';

  // Keyboard / TV Remote navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === 0) return 1;
          if (prev === 1) return 2;
          if (prev === 3) return 4;
          if (prev === 4) return 5;
          return prev;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === 2) return 1;
          if (prev === 1) return 0;
          if (prev === 5) return 4;
          if (prev === 4) return 3;
          return prev;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev <= 2) return prev + 3;
          return prev;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev >= 3) return prev - 3;
          return prev;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex === 0) onSelectSection('live');
        else if (focusedIndex === 1) onSelectSection('movies');
        else if (focusedIndex === 2) onSelectSection('series');
        else if (focusedIndex === 3) onRefresh();
        else if (focusedIndex === 4) onChangePlaylist();
        else if (focusedIndex === 5) setLang((prev) => (prev === 'TR' ? 'EN' : 'TR'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, onSelectSection, onRefresh, onChangePlaylist]);

  const cards = [
    {
      id: 'live' as MainTab,
      index: 0,
      title: lang === 'TR' ? 'Canlı TV' : 'Live TV',
      subtitle: `${liveCount} Grup`,
      icon: (
        <div className="relative flex items-center justify-center">
          <Tv className="w-16 h-16 text-white stroke-[1.8]" />
          <div className="absolute w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-white border-b-[7px] border-b-transparent ml-1" />
        </div>
      ),
    },
    {
      id: 'movies' as MainTab,
      index: 1,
      title: lang === 'TR' ? 'Filmler' : 'Movies',
      subtitle: `${movieCount} İçerik`,
      icon: <Clapperboard className="w-16 h-16 text-white stroke-[1.8]" />,
    },
    {
      id: 'series' as MainTab,
      index: 2,
      title: lang === 'TR' ? 'Diziler' : 'Series',
      subtitle: `${seriesCount} Dizi`,
      icon: <Film className="w-16 h-16 text-white stroke-[1.8]" />,
    },
  ];

  return (
    <div className="relative w-screen h-screen bg-[#070e1e] text-white flex flex-col justify-between items-center p-6 md:p-10 select-none overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Section */}
      <div className="flex flex-col items-center gap-3 mt-4 z-10">
        {/* Brand Logo & Flame */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Flame className="w-12 h-12 text-amber-500 fill-amber-500 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-light text-slate-200 tracking-wide">
                Cross
              </span>
              <span className="text-3xl md:text-4xl font-extrabold text-white tracking-wider">
                IPTV
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-400 -mt-3">
                Xtream Code
              </span>
            </div>
          </div>
        </div>

        {/* Current list indicator */}
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <span className="text-slate-400">≡ Current list :</span>
          <span className="text-amber-400 font-semibold tracking-wide">
            {credentials.username || 'List 1'}
          </span>
        </div>

        {/* Status & Expiration Pill */}
        <div className="flex items-center gap-4 px-5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Smile className="w-4 h-4" />
            <span>{accountStatus}</span>
          </div>
          <div className="w-px h-3.5 bg-slate-700" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <Hourglass className="w-3.5 h-3.5 text-amber-400" />
            <span>Expires on {expiryText}</span>
          </div>
        </div>
      </div>

      {/* Center: 3 Big Interactive Cards */}
      <div className="w-full max-w-4xl grid grid-cols-3 gap-6 my-auto z-10 px-4">
        {cards.map((card) => {
          const isFocused = focusedIndex === card.index;

          return (
            <button
              key={card.id}
              onClick={() => onSelectSection(card.id)}
              onMouseEnter={() => setFocusedIndex(card.index)}
              className={`group relative flex flex-col items-center justify-center aspect-[4/3] rounded-3xl bg-slate-900/70 border-2 transition-all duration-200 cursor-pointer shadow-xl tv-focusable ${
                isFocused
                  ? 'border-blue-500 bg-slate-800/90 scale-105 shadow-2xl shadow-blue-500/25 ring-4 ring-blue-500/40'
                  : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              {/* Inner Icon */}
              <div className="mb-4 transform transition-transform group-hover:scale-110">
                {card.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-white tracking-wide">
                {card.title}
              </h3>

              {/* Subtle Count Badge */}
              <span className="text-xs text-slate-400 font-medium mt-1 font-mono">
                {card.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-4 z-10">
        <button
          onClick={onRefresh}
          onMouseEnter={() => setFocusedIndex(3)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold border transition-all tv-focusable ${
            focusedIndex === 3
              ? 'bg-blue-600 text-white border-blue-500 scale-105 shadow-lg shadow-blue-600/30'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{lang === 'TR' ? 'Yenile' : 'Refresh'}</span>
        </button>

        <button
          onClick={onChangePlaylist}
          onMouseEnter={() => setFocusedIndex(4)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold border transition-all tv-focusable ${
            focusedIndex === 4
              ? 'bg-blue-600 text-white border-blue-500 scale-105 shadow-lg shadow-blue-600/30'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <ListPlus className="w-3.5 h-3.5" />
          <span>{lang === 'TR' ? 'Hesap / Liste Değiştir' : 'Change Playlist'}</span>
        </button>

        <button
          onClick={() => setLang((prev) => (prev === 'TR' ? 'EN' : 'TR'))}
          onMouseEnter={() => setFocusedIndex(5)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold border transition-all tv-focusable ${
            focusedIndex === 5
              ? 'bg-blue-600 text-white border-blue-500 scale-105 shadow-lg shadow-blue-600/30'
              : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Language ({lang})</span>
        </button>
      </div>

      {/* Footer Disclaimer & MAC/Device info */}
      <div className="flex flex-col items-center gap-1 mt-6 text-center z-10">
        <div className="text-xs text-slate-400 font-mono">
          Your Device ID : <span className="text-slate-300 font-semibold tracking-wider">cross-tv-88:14:f2:9a</span>
        </div>
        <div className="text-[11px] text-amber-500 font-medium">
          CrossIPTV.app © is just a media player, No channels included
        </div>
      </div>
    </div>
  );
};
