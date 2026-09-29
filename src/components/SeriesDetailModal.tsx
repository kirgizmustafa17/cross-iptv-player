import React, { useState, useEffect } from 'react';
import type {
  SeriesItem,
  SeriesInfoResponse,
  EpisodeItem,
  XtreamCredentials,
} from '../types/iptv';
import { getSeriesInfo } from '../services/xtream';
import { X, Play, Clock, Star, Film, Loader2 } from 'lucide-react';

interface SeriesDetailModalProps {
  series: SeriesItem | null;
  credentials: XtreamCredentials;
  onClose: () => void;
  onPlayEpisode: (series: SeriesItem, episode: EpisodeItem) => void;
}

export const SeriesDetailModal: React.FC<SeriesDetailModalProps> = ({
  series,
  credentials,
  onClose,
  onPlayEpisode,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfoResponse | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('1');

  useEffect(() => {
    if (!series) return;

    let isMounted = true;
    setLoading(true);

    getSeriesInfo(credentials, series.series_id)
      .then((data) => {
        if (!isMounted) return;
        setSeriesInfo(data);

        // Find initial season
        const seasonKeys = Object.keys(data.episodes || {});
        if (seasonKeys.length > 0) {
          setSelectedSeason(seasonKeys[0]);
        }
      })
      .catch((err) => {
        console.error('Error fetching series info:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [series, credentials]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 10009 || e.keyCode === 461) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!series) return null;

  const currentEpisodes: EpisodeItem[] =
    seriesInfo?.episodes?.[selectedSeason] || [];

  const backdrop =
    seriesInfo?.info?.backdrop_path?.[0] ||
    series.backdrop_path?.[0] ||
    '';

  const seasonKeys = Object.keys(seriesInfo?.episodes || {}).sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 lg:p-10 select-none">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Backdrop Header */}
        <div className="relative h-64 md:h-72 w-full overflow-hidden bg-slate-950 flex-shrink-0">
          {backdrop ? (
            <img
              src={backdrop}
              alt={series.name}
              className="w-full h-full object-cover opacity-35 filter blur-[1px]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-900/30 to-purple-900/30" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/80 z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Series Meta over Backdrop */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end gap-5">
            <div className="w-24 md:w-32 aspect-[2/3] rounded-2xl bg-slate-950 border border-slate-700 overflow-hidden shadow-2xl flex-shrink-0 hidden sm:block">
              {series.cover ? (
                <img
                  src={series.cover}
                  alt={series.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Film className="w-8 h-8 m-auto text-slate-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {series.rating && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{series.rating}</span>
                  </span>
                )}
                {series.releaseDate && (
                  <span className="text-xs text-slate-400 font-mono">
                    {series.releaseDate.slice(0, 4)}
                  </span>
                )}
                {series.genre && (
                  <span className="text-xs text-purple-400 font-medium truncate">
                    • {series.genre}
                  </span>
                )}
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-white truncate drop-shadow-md">
                {series.name}
              </h2>

              <p className="text-xs md:text-sm text-slate-300 line-clamp-2 mt-1.5 max-w-3xl leading-relaxed">
                {seriesInfo?.info?.plot || series.plot || 'Konu bilgisi bulunamadı.'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Section: Season Selector & Episodes List */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Bölümler getiriliyor...</p>
            </div>
          ) : (
            <>
              {/* Seasons Tab Bar */}
              {seasonKeys.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 border-b border-slate-800 flex-shrink-0">
                  {seasonKeys.map((seasonKey) => {
                    const isSelected = selectedSeason === seasonKey;
                    return (
                      <button
                        key={seasonKey}
                        onClick={() => setSelectedSeason(seasonKey)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all tv-focusable ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {seasonKey}. Sezon ({seriesInfo?.episodes?.[seasonKey]?.length || 0} Bölüm)
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Episodes Grid/List */}
              <div className="flex-1 overflow-y-auto no-scrollbar pt-4 space-y-2.5">
                {currentEpisodes.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-10">
                    Bu sezona ait bölüm bulunamadı.
                  </p>
                ) : (
                  currentEpisodes.map((ep) => (
                    <div
                      key={ep.id}
                      onClick={() => onPlayEpisode(series, ep)}
                      className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 hover:bg-slate-800 hover:border-blue-500/50 cursor-pointer transition-all tv-focusable"
                    >
                      <div className="flex items-center gap-3.5 truncate">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>

                        <div className="truncate">
                          <h4 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                            {ep.episode_num}. Bölüm: {ep.title || `${ep.episode_num}. Bölüm`}
                          </h4>
                          {ep.info?.plot && (
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                              {ep.info.plot}
                            </p>
                          )}
                        </div>
                      </div>

                      {ep.info?.duration && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono flex-shrink-0 pl-3">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{ep.info.duration}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
