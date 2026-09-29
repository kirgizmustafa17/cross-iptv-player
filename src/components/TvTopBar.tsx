import React, { useState, useEffect } from 'react';
import type { MainTab } from '../types/iptv';
import { Flame, Clock, Wifi } from 'lucide-react';

interface TvTopBarProps {
  tab: MainTab;
  onBack?: () => void;
}

export const TvTopBar: React.FC<TvTopBarProps> = ({ tab, onBack }) => {
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

  const tabLabel =
    tab === 'live' ? 'Canlı TV' : tab === 'movies' ? 'Filmler' : 'Diziler';

  return (
    <header className="h-11 w-full bg-[#060b17]/90 border-b border-slate-800/60 px-5 flex items-center justify-between select-none z-20 flex-shrink-0 backdrop-blur-md">
      {/* Left: Minimalist Brand Logo & Subtle Section Tag */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <div className="flex items-baseline gap-0.5 text-sm tracking-wide">
            <span className="font-light text-slate-300">Cross</span>
            <span className="font-extrabold text-white">IPTV</span>
          </div>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <span className="px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wider uppercase bg-amber-400/10 text-amber-400 border border-amber-400/20">
          {tabLabel}
        </span>
      </div>

      {/* Right: Remote Control Back Hint, Online Status & Digital Clock */}
      <div className="flex items-center gap-3 text-xs">
        {/* Remote Navigation Hint (informational, non-stealing of focus) */}
        <div
          onClick={onBack}
          className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800/80 text-[10px] font-medium text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
          title="Kumandadan Geri (Back) tuşuna basarak ana ekrana dönebilirsiniz"
        >
          <span className="font-mono text-slate-500 font-bold">GERİ ↩</span>
          <span>Ana Ekran</span>
        </div>

        {/* Live Network Status Indicator */}
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Wifi className="w-3 h-3 text-emerald-400" />
        </div>

        {/* Digital Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs font-semibold">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{currentTimeStr || '00:00'}</span>
        </div>
      </div>
    </header>
  );
};

export default TvTopBar;
