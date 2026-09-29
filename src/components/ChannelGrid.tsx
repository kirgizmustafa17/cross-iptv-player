import React, { useEffect, useRef } from 'react';
import type { LiveStream, FocusSection } from '../types/iptv';
import { ChannelCard } from './ChannelCard';
import { SearchX } from 'lucide-react';

interface ChannelGridProps {
  channels: LiveStream[];
  focusedIndex: number;
  currentSection: FocusSection;
  favorites: number[];
  onSelectChannel: (channel: LiveStream) => void;
  onToggleFavorite: (e: React.MouseEvent, streamId: number) => void;
  isLoading: boolean;
}

export const ChannelGrid: React.FC<ChannelGridProps> = ({
  channels,
  focusedIndex,
  currentSection,
  favorites,
  onSelectChannel,
  onToggleFavorite,
  isLoading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isSectionFocused = currentSection === 'content';

  // Auto-scroll the focused channel card into view smoothly
  useEffect(() => {
    if (isSectionFocused && containerRef.current) {
      const activeEl = containerRef.current.children[focusedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [focusedIndex, isSectionFocused]);

  if (isLoading) {
    return (
      <div className="flex-1 h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">Kanallar yükleniyor...</p>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex-1 h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
          <SearchX className="w-7 h-7 text-slate-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-300">Kanal Bulunamadı</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Bu kategoride kanal bulunamadı veya arama kriterinize uygun sonuç yok.
        </p>
      </div>
    );
  }

  return (
    <main className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Mevcut Kanallar
        </span>
        <span className="text-xs font-mono text-slate-500">
          Toplam {channels.length} yayın
        </span>
      </div>

      <div
        ref={containerRef}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-12"
      >
        {channels.map((channel, idx) => (
          <ChannelCard
            key={channel.stream_id}
            channel={channel}
            isFocused={isSectionFocused && focusedIndex === idx}
            isFavorite={favorites.includes(channel.stream_id)}
            onSelect={onSelectChannel}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </main>
  );
};
