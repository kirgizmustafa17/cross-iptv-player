import React, { useState, useEffect } from 'react';
import { Tv, Clapperboard, Film, Search, Settings, Wifi, Home } from 'lucide-react';
import type { MainTab, FocusSection } from '../types/iptv';

interface HeaderProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onGoHome?: () => void;
  currentSection: FocusSection;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSettings: () => void;
  accountStatus?: string;
  activeCategoryName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onGoHome,
  searchQuery,
  onSearchChange,
  onOpenSettings,
  accountStatus = 'Aktif',
  activeCategoryName,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const tabs: Array<{ id: MainTab; label: string; icon: React.ReactNode }> = [
    { id: 'live', label: 'Canlı TV', icon: <Tv className="w-4 h-4" /> },
    { id: 'movies', label: 'Filmler', icon: <Film className="w-4 h-4" /> },
    { id: 'series', label: 'Diziler', icon: <Clapperboard className="w-4 h-4" /> },
  ];

  return (
    <header className="h-20 px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between z-20 backdrop-blur-md">
      {/* Brand & Main Tabs */}
      <div className="flex items-center gap-6">
        {/* Brand with Click to go Home */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-2.5 text-blue-500 font-bold text-xl tracking-wider select-none cursor-pointer hover:opacity-90 transition-opacity"
          title="Ana Sayfaya Dön"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Tv className="w-5 h-5" />
          </div>
          <span>CROSS<span className="text-white">IPTV</span></span>
        </div>

        {/* Home Button */}
        {onGoHome && (
          <button
            onClick={onGoHome}
            title="Ana Menüye Dön"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Ana Menü</span>
          </button>
        )}

        {/* 3 Main Header Tabs */}
        <nav className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all tv-focusable ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {activeCategoryName && (
          <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-800 text-sm font-medium text-slate-400">
            <span className="text-slate-500">Kategori:</span>
            <span className="text-blue-400 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold">
              {activeCategoryName}
            </span>
          </div>
        )}
      </div>

      {/* Search Input & Status */}
      <div className="flex items-center gap-5">
        <div className="relative w-64 md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'live'
                ? 'Kanal ara...'
                : activeTab === 'movies'
                ? 'Film ara...'
                : 'Dizi ara...'
            }
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950 text-sm text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <Wifi className="w-3.5 h-3.5 animate-pulse" />
          <span>{accountStatus}</span>
        </div>

        <button
          onClick={onOpenSettings}
          title="Ayarlar / Hesap Bilgileri"
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/80"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="text-slate-200 font-mono text-base font-semibold tracking-wider pl-2 border-l border-slate-800">
          {time}
        </div>
      </div>
    </header>
  );
};
