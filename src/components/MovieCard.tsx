import React, { useState } from 'react';
import type { MovieItem } from '../types/iptv';
import { Film, Star, Play } from 'lucide-react';

interface MovieCardProps {
  movie: MovieItem;
  isFocused: boolean;
  onSelect: (movie: MovieItem) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  isFocused,
  onSelect,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onSelect(movie)}
      className={`group relative rounded-2xl bg-slate-900/80 border border-slate-800/90 overflow-hidden cursor-pointer flex flex-col tv-focusable transition-all select-none hover:bg-slate-800 hover:border-slate-700 ${
        isFocused ? 'tv-focused bg-slate-800 border-blue-500' : ''
      }`}
    >
      {/* Poster Image (2:3 ratio) */}
      <div className="relative aspect-[2/3] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {movie.stream_icon && !imgError ? (
          <img
            src={movie.stream_icon}
            alt={movie.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2 p-4 text-center">
            <Film className="w-10 h-10 text-slate-500" />
            <span className="text-xs font-medium text-slate-400 line-clamp-2">
              {movie.name}
            </span>
          </div>
        )}

        {/* Hover / Focus Overlay with Play button */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center transition-opacity ${
            isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/50 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Format Badge (MP4/MKV) */}
        {movie.container_extension && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold uppercase text-slate-300 border border-slate-700/60">
            {movie.container_extension}
          </div>
        )}

        {/* Rating Badge */}
        {movie.rating && movie.rating !== '0' && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-bold text-amber-400 border border-amber-500/30">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{parseFloat(movie.rating).toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Movie Details */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-white transition-colors">
          {movie.name}
        </h4>
      </div>
    </div>
  );
};
