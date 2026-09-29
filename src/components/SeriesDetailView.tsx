import React, { useState, useEffect, useRef } from 'react';
import type {
  SeriesItem,
  EpisodeItem,
  PlayableMedia,
  XtreamCredentials,
  XtreamUserInfo,
} from '../types/iptv';
import { getSeriesInfo, getSeriesStreamUrl } from '../services/xtream';
import { TvTopBar } from './TvTopBar';
import {
  Film,
  Play,
  Star,
  Calendar,
  Layers,
  Loader2,
  Tv,
} from 'lucide-react';

interface SeriesDetailViewProps {
  series: SeriesItem;
  credentials: XtreamCredentials;
  userInfo: XtreamUserInfo | null;
  onBack: () => void;
  onPlayEpisode: (media: PlayableMedia) => void;
}

export const SeriesDetailView: React.FC<SeriesDetailViewProps> = ({
  series,
  credentials,
  userInfo,
  onBack,
  onPlayEpisode,
}) => {
  // Navigation Sections: 'seasons' (Sol) | 'episodes' (Orta) | 'play' (Sağ)
  const [activeSection, setActiveSection] = useState<'episodes' | 'seasons' | 'play'>('episodes');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('1');
  const [episodesBySeason, setEpisodesBySeason] = useState<{ [key: string]: EpisodeItem[] }>({});
  const [focusedSeasonIndex, setFocusedSeasonIndex] = useState<number>(0);
  const [focusedEpisodeIndex, setFocusedEpisodeIndex] = useState<number>(0);

  // Metadata from API
  const [seriesInfo, setSeriesInfo] = useState<{
    genre?: string;
    plot?: string;
    releaseDate?: string;
    director?: string;
    cast?: string;
    rating?: string;
  }>({});

  const seasonsListRef = useRef<HTMLDivElement>(null);
  const episodesListRef = useRef<HTMLDivElement>(null);
  const lastKeyTimeRef = useRef<number>(0);

  // Fetch Series Info and Episodes from Xtream API
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getSeriesInfo(credentials, series.series_id)
      .then((data) => {
        if (cancelled) return;

        const info = data.info || {};
        const infoAny = info as any;
        setSeriesInfo({
          genre: info.genre,
          plot: info.plot,
          releaseDate: info.releaseDate || infoAny.release_date,
          director: info.director,
          cast: info.cast,
          rating: infoAny.rating_5based ? (Number(infoAny.rating_5based) * 2).toFixed(1) : info.rating,
        });

        const epsMap: { [key: string]: EpisodeItem[] } = data.episodes || {};
        setEpisodesBySeason(epsMap);

        const seasonKeys = Object.keys(epsMap);
        if (seasonKeys.length > 0) {
          setSeasons(seasonKeys);
          setSelectedSeason(seasonKeys[0]);
          setFocusedSeasonIndex(0);
        }
      })
      .catch((err) => {
        console.error('Error fetching series details:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [series.series_id, credentials]);

  // Current Season's Episodes
  const currentEpisodes = episodesBySeason[selectedSeason] || [];
  const currentSelectedEpisode = currentEpisodes[focusedEpisodeIndex] || currentEpisodes[0];

  // Scroll focused season into view
  useEffect(() => {
    if (activeSection === 'seasons' && seasonsListRef.current) {
      const el = seasonsListRef.current.children[focusedSeasonIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedSeasonIndex, activeSection]);

  // Scroll focused episode into view
  useEffect(() => {
    if (episodesListRef.current) {
      const el = episodesListRef.current.children[focusedEpisodeIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedEpisodeIndex]);

  // TV Remote Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isBack =
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.keyCode === 10009 ||
        e.keyCode === 461 ||
        e.keyCode === 4;

      const isUp = e.key === 'ArrowUp' || e.keyCode === 19;
      const isDown = e.key === 'ArrowDown' || e.keyCode === 20;
      const isLeft = e.key === 'ArrowLeft' || e.keyCode === 21;
      const isRight = e.key === 'ArrowRight' || e.keyCode === 22;
      const isOk =
        e.key === 'Enter' ||
        e.key === 'Select' ||
        e.keyCode === 13 ||
        e.keyCode === 23 ||
        e.keyCode === 66;

      if (!isBack && !isUp && !isDown && !isLeft && !isRight && !isOk) return;

      const now = Date.now();
      const throttleDuration = e.repeat ? 200 : 160;
      if (now - lastKeyTimeRef.current < throttleDuration) {
        e.preventDefault();
        return;
      }
      lastKeyTimeRef.current = now;

      if (isBack) {
        e.preventDefault();
        if (activeSection === 'play') {
          setActiveSection('episodes');
        } else if (activeSection === 'episodes') {
          setActiveSection('seasons');
        } else {
          onBack();
        }
        return;
      }

      // 1. SEASONS Section
      if (activeSection === 'seasons') {
        if (isUp) {
          e.preventDefault();
          setFocusedSeasonIndex((prev) => {
            const next = prev > 0 ? prev - 1 : 0;
            setSelectedSeason(seasons[next] || selectedSeason);
            setFocusedEpisodeIndex(0);
            return next;
          });
        } else if (isDown) {
          e.preventDefault();
          setFocusedSeasonIndex((prev) => {
            const next = prev < seasons.length - 1 ? prev + 1 : prev;
            setSelectedSeason(seasons[next] || selectedSeason);
            setFocusedEpisodeIndex(0);
            return next;
          });
        } else if (isRight || isOk) {
          e.preventDefault();
          setActiveSection('episodes');
        }
        return;
      }

      // 2. EPISODES Section
      if (activeSection === 'episodes') {
        if (isUp) {
          e.preventDefault();
          setFocusedEpisodeIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (isDown) {
          e.preventDefault();
          setFocusedEpisodeIndex((prev) =>
            prev < currentEpisodes.length - 1 ? prev + 1 : prev
          );
        } else if (isLeft) {
          e.preventDefault();
          setActiveSection('seasons');
        } else if (isRight) {
          e.preventDefault();
          setActiveSection('play');
        } else if (isOk) {
          e.preventDefault();
          const ep = currentEpisodes[focusedEpisodeIndex];
          if (ep) {
            onPlayEpisode({
              id: ep.id,
              title: `${series.name} - ${ep.title || `${ep.episode_num}. Bölüm`}`,
              type: 'series',
              streamUrl: getSeriesStreamUrl(
                credentials,
                ep.id,
                ep.container_extension || 'mp4'
              ),
              streamType: 'mp4',
              poster: ep.info?.movie_image || series.cover,
              subTitle: `${selectedSeason}. Sezon • ${ep.episode_num}. Bölüm`,
            });
          }
        }
        return;
      }

      // 3. PLAY Section
      if (activeSection === 'play') {
        if (isLeft) {
          e.preventDefault();
          setActiveSection('episodes');
        } else if (isOk) {
          e.preventDefault();
          const ep = currentSelectedEpisode;
          if (ep) {
            onPlayEpisode({
              id: ep.id,
              title: `${series.name} - ${ep.title || `${ep.episode_num}. Bölüm`}`,
              type: 'series',
              streamUrl: getSeriesStreamUrl(
                credentials,
                ep.id,
                ep.container_extension || 'mp4'
              ),
              streamType: 'mp4',
              poster: ep.info?.movie_image || series.cover,
              subTitle: `${selectedSeason}. Sezon • ${ep.episode_num}. Bölüm`,
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSection,
    focusedSeasonIndex,
    focusedEpisodeIndex,
    seasons,
    currentEpisodes,
    currentSelectedEpisode,
    selectedSeason,
    series,
    credentials,
    onBack,
    onPlayEpisode,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070e1e] text-white overflow-hidden select-none font-sans">
      {/* Top Bar matching Hot IPTV series details */}
      <TvTopBar
        tab="series"
        categoryName={series.name}
        subTitle={
          currentSelectedEpisode
            ? `${selectedSeason}. Sezon • ${currentSelectedEpisode.episode_num}. Bölüm`
            : undefined
        }
        userInfo={userInfo}
        credentials={credentials}
        onBack={onBack}
      />

      {/* Main 3-Column Layout: Left (Poster & Seasons) | Center (Episodes) | Right (Preview & Synopsis) */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* COLUMN 1: Poster & Season Selector (Sol Kolon) */}
        <div className="w-80 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden shadow-xl p-3 gap-3 flex-shrink-0">
          {/* Large Series Poster with Rating */}
          <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
            {series.cover ? (
              <img
                src={series.cover}
                alt={series.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <Tv className="w-12 h-12 text-slate-600 mb-2" />
                <span className="text-xs">{series.name}</span>
              </div>
            )}

            <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-xs font-bold text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{seriesInfo.rating || '8.5'}</span>
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
              <h3 className="text-sm font-black text-white truncate">{series.name}</h3>
            </div>
          </div>

          {/* Seasons Stack (Hot IPTV style) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Sezonlar ({seasons.length})
            </span>

            <div
              ref={seasonsListRef}
              className="flex-1 overflow-y-auto no-scrollbar space-y-1.5"
            >
              {seasons.map((seasonNum, idx) => {
                const isSelected = selectedSeason === seasonNum;
                const isFocused = activeSection === 'seasons' && focusedSeasonIndex === idx;
                const epsCount = episodesBySeason[seasonNum]?.length || 0;

                return (
                  <button
                    key={seasonNum}
                    onClick={() => {
                      setSelectedSeason(seasonNum);
                      setFocusedSeasonIndex(idx);
                      setFocusedEpisodeIndex(0);
                      setActiveSection('episodes');
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                      isFocused
                        ? 'bg-amber-400 text-slate-950 scale-102 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                        : isSelected
                        ? 'bg-slate-800 text-amber-400 border border-amber-400/40'
                        : 'bg-slate-950/40 text-slate-300 hover:bg-slate-800/70 border border-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>{seasonNum}. Sezon</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        isFocused
                          ? 'bg-slate-900 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {epsCount} Bölüm
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 2: Episodes List (Orta Kolon) */}
        <div className="w-96 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden shadow-xl flex-shrink-0">
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {selectedSeason}. Sezon Bölümleri
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
              {currentEpisodes.length} Bölüm
            </span>
          </div>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-xs font-medium">Bölümler yükleniyor...</p>
            </div>
          ) : currentEpisodes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <Film className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">Bu sezonda bölüm bulunamadı</p>
            </div>
          ) : (
            <div
              ref={episodesListRef}
              className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5"
            >
              {currentEpisodes.map((ep, idx) => {
                const isFocused = activeSection === 'episodes' && focusedEpisodeIndex === idx;

                return (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setFocusedEpisodeIndex(idx);
                      onPlayEpisode({
                        id: ep.id,
                        title: `${series.name} - ${ep.title || `${ep.episode_num}. Bölüm`}`,
                        type: 'series',
                        streamUrl: getSeriesStreamUrl(
                          credentials,
                          ep.id,
                          ep.container_extension || 'mp4'
                        ),
                        streamType: 'mp4',
                        poster: ep.info?.movie_image || series.cover,
                        subTitle: `${selectedSeason}. Sezon • ${ep.episode_num}. Bölüm`,
                      });
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all select-none text-left ${
                      isFocused
                        ? 'bg-amber-400 text-slate-950 scale-101 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                        : 'bg-slate-950/40 text-slate-200 hover:bg-slate-800/70 border border-slate-800/40'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                        isFocused ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      HD
                    </span>

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-xs font-bold truncate ${
                          isFocused ? 'text-slate-950' : 'text-slate-100'
                        }`}
                      >
                        {ep.title || `${ep.episode_num}. Bölüm`}
                      </h4>
                      <span
                        className={`text-[10px] ${
                          isFocused ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        S{selectedSeason.padStart(2, '0')} - E{String(ep.episode_num).padStart(2, '0')}
                      </span>
                    </div>

                    <Play
                      className={`w-4 h-4 flex-shrink-0 ${
                        isFocused ? 'text-slate-950 fill-slate-950' : 'text-slate-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 3: Right Preview & Detailed Metadata (Sağ Kolon) */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          {/* Upper: Episode Banner / Preview */}
          <div className="relative w-full aspect-video max-h-64 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
            {currentSelectedEpisode?.info?.movie_image || series.cover ? (
              <img
                src={currentSelectedEpisode?.info?.movie_image || series.cover}
                alt="Episode Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500">
                <Film className="w-12 h-12 text-slate-600 mb-2" />
                <span className="text-xs">Önizleme Yok</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-5 flex flex-col justify-end">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                {selectedSeason}. Sezon • Bölüm {currentSelectedEpisode?.episode_num}
              </span>
              <h2 className="text-xl font-black text-white mt-1 drop-shadow-md">
                {currentSelectedEpisode?.title || `${currentSelectedEpisode?.episode_num}. Bölüm`}
              </h2>
            </div>
          </div>

          {/* Lower: Detailed Synopsis Card matching Hot IPTV */}
          <div className="flex-1 bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 flex flex-col justify-between overflow-y-auto no-scrollbar shadow-xl">
            <div className="space-y-2.5 text-xs">
              {seriesInfo.releaseDate && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-white">Yayın Tarihi:</span>
                  <span>{seriesInfo.releaseDate}</span>
                </div>
              )}

              {seriesInfo.genre && (
                <div className="text-slate-300">
                  <span className="font-bold text-white">Tür: </span>
                  <span className="text-slate-300">{seriesInfo.genre}</span>
                </div>
              )}

              {seriesInfo.plot && (
                <div className="pt-1">
                  <span className="font-bold text-white block mb-1">Açıklama:</span>
                  <p className="text-slate-400 leading-relaxed line-clamp-4">
                    {seriesInfo.plot}
                  </p>
                </div>
              )}

              {seriesInfo.cast && (
                <div className="text-slate-400 pt-1 truncate">
                  <span className="font-bold text-white">Oyuncular: </span>
                  <span>{seriesInfo.cast}</span>
                </div>
              )}
            </div>

            {/* Play Button & TV Guide */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-3">
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono font-bold">
                    OK
                  </span>
                  <span>Oynat</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono font-bold">
                    GERİ
                  </span>
                  <span>Dizi Listesi</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (currentSelectedEpisode) {
                    onPlayEpisode({
                      id: currentSelectedEpisode.id,
                      title: `${series.name} - ${currentSelectedEpisode.title || `${currentSelectedEpisode.episode_num}. Bölüm`}`,
                      type: 'series',
                      streamUrl: getSeriesStreamUrl(
                        credentials,
                        currentSelectedEpisode.id,
                        currentSelectedEpisode.container_extension || 'mp4'
                      ),
                      streamType: 'mp4',
                      poster: currentSelectedEpisode.info?.movie_image || series.cover,
                      subTitle: `${selectedSeason}. Sezon • ${currentSelectedEpisode.episode_num}. Bölüm`,
                    });
                  }
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-xl active:scale-95 cursor-pointer ${
                  activeSection === 'play'
                    ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-300'
                    : 'bg-amber-400/90 hover:bg-amber-300 text-slate-950'
                }`}
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Bölümü Başlat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
