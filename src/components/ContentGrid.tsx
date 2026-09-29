import React, { useEffect, useRef } from 'react';
import type {
  LiveStream,
  MovieItem,
  SeriesItem,
  FocusSection,
  MainTab,
} from '../types/iptv';
import { ChannelCard } from './ChannelCard';
import { MovieCard } from './MovieCard';
import { SeriesCard } from './SeriesCard';
import { SearchX, Loader2 } from 'lucide-react';

interface ContentGridProps {
  activeTab: MainTab;
  liveChannels: LiveStream[];
  movies: MovieItem[];
  seriesList: SeriesItem[];
  focusedIndex: number;
  currentSection: FocusSection;
  favorites: number[];
  onSelectLiveChannel: (channel: LiveStream) => void;
  onSelectMovie: (movie: MovieItem) => void;
  onSelectSeries: (series: SeriesItem) => void;
  onToggleFavorite: (e: React.MouseEvent, streamId: number) => void;
  isLoading: boolean;
}

export const ContentGrid: React.FC<ContentGridProps> = ({
  activeTab,
  liveChannels,
  movies,
  seriesList,
  focusedIndex,
  currentSection,
  favorites,
  onSelectLiveChannel,
  onSelectMovie,
  onSelectSeries,
  onToggleFavorite,
  isLoading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isSectionFocused = currentSection === 'content';

  // Smooth scroll focused element into view
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
      <div className="flex-1 h-[calc(100vh-5rem)] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm font-medium">İçerikler yükleniyor...</p>
      </div>
    );
  }

  const currentCount =
    activeTab === 'live'
      ? liveChannels.length
      : activeTab === 'movies'
      ? movies.length
      : seriesList.length;

  if (currentCount === 0) {
    return (
      <div className="flex-1 h-[calc(100vh-5rem)] flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
          <SearchX className="w-7 h-7 text-slate-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-300">İçerik Bulunamadı</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Bu grupta henüz içerik bulunamadı veya arama kriterinize uygun sonuç yok.
        </p>
      </div>
    );
  }

  return (
    <main className="flex-1 h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {activeTab === 'live'
            ? 'Canlı Kanallar'
            : activeTab === 'movies'
            ? 'Filmler'
            : 'Diziler'}
        </span>
        <span className="text-xs font-mono text-slate-500">
          Toplam {currentCount} içerik
        </span>
      </div>

      {/* List for live channels (Up/Down moves 1 channel), grid for movie/series posters */}
      <div
        ref={containerRef}
        className={
          activeTab === 'live'
            ? 'flex flex-col gap-2.5 max-w-4xl pb-16'
            : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-16'
        }
      >
        {activeTab === 'live' &&
          liveChannels.map((channel, idx) => (
            <ChannelCard
              key={channel.stream_id}
              channel={channel}
              isFocused={isSectionFocused && focusedIndex === idx}
              isFavorite={favorites.includes(channel.stream_id)}
              onSelect={onSelectLiveChannel}
              onToggleFavorite={onToggleFavorite}
            />
          ))}

        {activeTab === 'movies' &&
          movies.map((movie, idx) => (
            <MovieCard
              key={movie.stream_id}
              movie={movie}
              isFocused={isSectionFocused && focusedIndex === idx}
              onSelect={onSelectMovie}
            />
          ))}

        {activeTab === 'series' &&
          seriesList.map((series, idx) => (
            <SeriesCard
              key={series.series_id}
              series={series}
              isFocused={isSectionFocused && focusedIndex === idx}
              onSelect={onSelectSeries}
            />
          ))}
      </div>
    </main>
  );
};
