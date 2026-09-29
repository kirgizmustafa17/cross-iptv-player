import React, { useState } from 'react';
import type { SeriesItem } from '../types/iptv';
import { Clapperboard, Star, Layers } from 'lucide-react';

interface SeriesCardProps {
  series: SeriesItem;
  isFocused: boolean;
  onSelect: (series: SeriesItem) => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
  series,
  isFocused,
  onSelect,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onSelect(series)}
      className={`group relative rounded-2xl bg-slate-900/80 border border-slate-800/90 overflow-hidden cursor-pointer flex flex-col tv-focusable transition-all select-none hover:bg-slate-800 hover:border-slate-700 ${
        isFocused ? 'tv-focused bg-slate-800 border-blue-500' : ''
      }`}
    >
      {/* Poster Image (2:3 ratio) */}
      <div className="relative aspect-[2/3] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {series.cover && !imgError ? (
          <img
            src={series.cover}
            alt={series.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2 p-4 text-center">
            <Clapperboard className="w-10 h-10 text-slate-500" />
            <span className="text-xs font-medium text-slate-400 line-clamp-2">
              {series.name}
            </span>
          </div>
        )}

        {/* Hover / Focus Overlay */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center transition-opacity ${
            isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-xl shadow-blue-600/50">
            <Layers className="w-4 h-4" />
            <span>Bölümleri Gör</span>
          </div>
        </div>

        {/* Series Badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-purple-600/80 backdrop-blur-md text-[10px] font-bold tracking-wider uppercase text-white border border-purple-400/40">
          Dizi
        </div>

        {/* Rating Badge */}
        {series.rating && series.rating !== '0' && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-bold text-amber-400 border border-amber-500/30">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{parseFloat(series.rating).toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Series Details */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-white transition-colors">
          {series.name}
        </h4>
        {series.genre && (
          <p className="text-[11px] text-slate-500 truncate mt-1">
            {series.genre}
          </p>
        )}
      </div>
    </div>
  );
};
