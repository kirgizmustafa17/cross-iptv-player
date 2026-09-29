import React, { useState } from 'react';
import type { LiveStream } from '../types/iptv';
import { Tv, Star } from 'lucide-react';

interface ChannelCardProps {
  channel: LiveStream;
  isFocused: boolean;
  isFavorite: boolean;
  onSelect: (channel: LiveStream) => void;
  onToggleFavorite: (e: React.MouseEvent, streamId: number) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isFocused,
  isFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  const [imgError, setImgError] = useState(false);

  // Extract clean display name by stripping prefixes if any
  const cleanName = channel.name.replace(/^[*|\-_\s]+|[*|\-_\s]+$/g, '');

  return (
    <div
      onClick={() => onSelect(channel)}
      className={`group relative p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 cursor-pointer flex items-center gap-3.5 tv-focusable transition-all select-none hover:bg-slate-800/70 hover:border-slate-700 ${
        isFocused ? 'tv-focused bg-slate-800 border-blue-500' : ''
      }`}
    >
      {/* Channel Logo / Fallback */}
      <div className="w-14 h-14 rounded-xl bg-slate-950 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-800 group-hover:border-slate-700 p-1.5 shadow-inner">
        {channel.stream_icon && !imgError ? (
          <img
            src={channel.stream_icon}
            alt={cleanName}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain filter drop-shadow"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Tv className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
          </div>
        )}
      </div>

      {/* Channel Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {channel.num > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
              #{channel.num}
            </span>
          )}
          <span className="text-xs text-blue-400 font-semibold tracking-wide uppercase">
            Canlı
          </span>
        </div>
        <h4 className="text-sm font-semibold text-slate-100 truncate mt-1 group-hover:text-white transition-colors">
          {cleanName || 'Kanal'}
        </h4>
      </div>

      {/* Favorite Button */}
      <button
        type="button"
        onClick={(e) => onToggleFavorite(e, channel.stream_id)}
        title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        className="p-2 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800/80 transition-colors"
      >
        <Star
          className={`w-4 h-4 ${
            isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
          }`}
        />
      </button>
    </div>
  );
};
