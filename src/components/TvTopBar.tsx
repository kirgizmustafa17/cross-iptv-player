import React, { useState, useEffect } from 'react';
import type { XtreamUserInfo, XtreamCredentials, MainTab } from '../types/iptv';
import { Flame, ArrowLeft, Clock, ShieldCheck, User } from 'lucide-react';

interface TvTopBarProps {
  tab: MainTab;
  categoryName?: string;
  subTitle?: string;
  userInfo: XtreamUserInfo | null;
  credentials: XtreamCredentials;
  onBack: () => void;
}

export const TvTopBar: React.FC<TvTopBarProps> = ({
  tab,
  categoryName,
  subTitle,
  userInfo,
  credentials,
  onBack,
}) => {
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
    tab === 'live' ? 'Live TV' : tab === 'movies' ? 'Filmler' : 'Diziler';

  const formatExpiry = (epochStr?: string) => {
    if (!epochStr) return 'Aktif';
    const num = parseInt(epochStr, 10);
    if (isNaN(num) || num <= 0) return 'Süresiz';
    const date = new Date(num * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const expiryText = formatExpiry(userInfo?.exp_date);

  return (
    <header className="h-16 w-full bg-[#070e1e]/95 border-b border-slate-800/80 px-6 flex items-center justify-between select-none z-20 flex-shrink-0 backdrop-blur-md">
      {/* Left: Clock, Brand Logo & Breadcrumb Tag */}
      <div className="flex items-center gap-4">
        {/* Digital Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 font-mono text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{currentTimeStr || '00:00'}</span>
        </div>

        {/* Back to Home Hint */}
        <button
          onClick={onBack}
          title="Ana Karşılama Ekranına Dön (Kumandadan GERİ tuşu)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ana Ekran</span>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
          <div className="flex items-baseline gap-1">
            <span className="text-base font-light text-slate-200">Cross</span>
            <span className="text-base font-black text-white">IPTV</span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Section Pill (Yellow Hot IPTV Style) */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-amber-400 text-slate-950 text-xs font-extrabold tracking-wide uppercase shadow-sm">
            {tabLabel}
          </span>

          {categoryName && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 truncate max-w-xs md:max-w-md">
              <span className="text-slate-600">›</span>
              <span className="truncate text-amber-200/90">{categoryName}</span>
              {subTitle && (
                <>
                  <span className="text-slate-600">›</span>
                  <span className="truncate text-slate-400 font-normal">{subTitle}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Account & Expiry Info Pill */}
      <div className="flex items-center gap-3">
        {/* Current list */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">List:</span>
          <span className="text-amber-400 font-semibold">{credentials.username || 'Default'}</span>
        </div>

        {/* Activation pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300">Süre:</span>
          <span className="font-semibold text-emerald-400">{expiryText}</span>
        </div>
      </div>
    </header>
  );
};
