import React, { useState, useEffect, useRef, useMemo } from 'react';
import type {
  Category,
  MovieItem,
  SeriesItem,
  PlayableMedia,
  XtreamCredentials,
  XtreamUserInfo,
} from '../types/iptv';
import { getMovieStreamUrl } from '../services/xtream';
import { TvTopBar } from './TvTopBar';
import {
  Film,
  Clapperboard,
  Star,
  Heart,
  Loader2,
  SearchX,
} from 'lucide-react';

interface VodViewProps {
  type: 'movies' | 'series';
  categories: Category[];
  credentials: XtreamCredentials;
  userInfo: XtreamUserInfo | null;
  favorites: number[];
  onToggleFavorite: (e: React.MouseEvent, streamId: number) => void;
  onPlayMovie: (media: PlayableMedia) => void;
  onSelectSeries: (series: SeriesItem) => void;
  onBackToLanding: () => void;
  fetchMovies?: (catId: string) => Promise<MovieItem[]>;
  fetchSeries?: (catId: string) => Promise<SeriesItem[]>;
}

export const VodView: React.FC<VodViewProps> = ({
  type,
  categories,
  credentials,
  userInfo: _userInfo,
  favorites,
  onToggleFavorite,
  onPlayMovie,
  onSelectSeries,
  onBackToLanding,
  fetchMovies,
  fetchSeries,
}) => {
  // Navigation Sections: 'categories' (Sol) | 'grid' (Sağ)
  const [activeSection, setActiveSection] = useState<'categories' | 'grid'>('grid');

  // Selected Category
  const [selectedCatId, setSelectedCatId] = useState<string>(
    categories.length > 0 ? categories[0].category_id : 'all'
  );
  const [focusedCatIndex, setFocusedCatIndex] = useState<number>(1); // 0: All, 1+: Categories

  // Items state
  const [moviesList, setMoviesList] = useState<MovieItem[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [focusedGridIndex, setFocusedGridIndex] = useState<number>(0);

  // Refs
  const categoriesListRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const lastKeyTimeRef = useRef<number>(0);

  const GRID_COLUMNS = 5;

  // Active Category Name
  const activeCategoryName = useMemo(() => {
    if (selectedCatId === 'all') return 'Tüm İçerikler';
    const found = categories.find((c) => c.category_id === selectedCatId);
    return found ? found.category_name : 'İçerikler';
  }, [categories, selectedCatId]);

  const currentItemsCount =
    type === 'movies' ? moviesList.length : seriesList.length;

  const totalCategoriesCount = categories.length + 1; // +1 for "Tüm İçerikler"

  // Fetch Items when category changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    if (type === 'movies' && fetchMovies) {
      fetchMovies(selectedCatId)
        .then((data) => {
          if (!cancelled) {
            setMoviesList(data);
            setFocusedGridIndex(0);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    } else if (type === 'series' && fetchSeries) {
      fetchSeries(selectedCatId)
        .then((data) => {
          if (!cancelled) {
            setSeriesList(data);
            setFocusedGridIndex(0);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [type, selectedCatId, fetchMovies, fetchSeries]);

  // Scroll focused category into view
  useEffect(() => {
    if (activeSection === 'categories' && categoriesListRef.current) {
      const el = categoriesListRef.current.children[focusedCatIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedCatIndex, activeSection]);

  // Scroll focused grid item into view
  useEffect(() => {
    if (activeSection === 'grid' && gridContainerRef.current) {
      const el = gridContainerRef.current.children[focusedGridIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedGridIndex, activeSection]);

  // Remote key handling
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

      // Throttle (160ms)
      const now = Date.now();
      const throttleDuration = e.repeat ? 200 : 160;
      if (now - lastKeyTimeRef.current < throttleDuration) {
        e.preventDefault();
        return;
      }
      lastKeyTimeRef.current = now;

      // Back navigation
      if (isBack) {
        e.preventDefault();
        if (activeSection === 'grid') {
          setActiveSection('categories');
        } else {
          onBackToLanding();
        }
        return;
      }

      // CATEGORIES Navigation
      if (activeSection === 'categories') {
        if (isUp) {
          e.preventDefault();
          setFocusedCatIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (isDown) {
          e.preventDefault();
          setFocusedCatIndex((prev) => (prev < totalCategoriesCount - 1 ? prev + 1 : prev));
        } else if (isRight || isOk) {
          e.preventDefault();
          if (focusedCatIndex === 0) setSelectedCatId('all');
          else {
            const cat = categories[focusedCatIndex - 1];
            if (cat) setSelectedCatId(cat.category_id);
          }
          setActiveSection('grid');
        }
        return;
      }

      // POSTER GRID Navigation (5 columns)
      if (activeSection === 'grid') {
        if (isUp) {
          e.preventDefault();
          setFocusedGridIndex((prev) => {
            const next = prev - GRID_COLUMNS;
            return next >= 0 ? next : prev;
          });
        } else if (isDown) {
          e.preventDefault();
          setFocusedGridIndex((prev) => {
            const next = prev + GRID_COLUMNS;
            return next < currentItemsCount ? next : prev;
          });
        } else if (isLeft) {
          e.preventDefault();
          if (focusedGridIndex % GRID_COLUMNS === 0) {
            setActiveSection('categories');
          } else {
            setFocusedGridIndex((prev) => Math.max(0, prev - 1));
          }
        } else if (isRight) {
          e.preventDefault();
          setFocusedGridIndex((prev) => Math.min(currentItemsCount - 1, prev + 1));
        } else if (isOk) {
          e.preventDefault();
          if (type === 'movies') {
            const movie = moviesList[focusedGridIndex];
            if (movie) {
              onPlayMovie({
                id: movie.stream_id,
                title: movie.name,
                type: 'movie',
                streamUrl: getMovieStreamUrl(
                  credentials,
                  movie.stream_id,
                  movie.container_extension || 'mp4'
                ),
                streamType: 'mp4',
                poster: movie.stream_icon,
                subTitle: 'Film (VOD)',
              });
            }
          } else {
            const series = seriesList[focusedGridIndex];
            if (series) {
              onSelectSeries(series);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSection,
    focusedCatIndex,
    focusedGridIndex,
    totalCategoriesCount,
    currentItemsCount,
    type,
    moviesList,
    seriesList,
    categories,
    credentials,
    onBackToLanding,
    onPlayMovie,
    onSelectSeries,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070e1e] text-white overflow-hidden select-none font-sans">
      {/* Clean & Sleek TV Top Bar */}
      <TvTopBar tab={type} onBack={onBackToLanding} />

      {/* 2-Column Split: Categories (Sol) & 5-Column Poster Grid (Sağ) */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left: Categories Sidebar */}
        <div className="w-72 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden shadow-xl flex-shrink-0">
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {type === 'movies' ? 'Film Grupları' : 'Dizi Grupları'}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
              {categories.length} Grup
            </span>
          </div>

          <div
            ref={categoriesListRef}
            className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5"
          >
            {/* 1. Tüm İçerikler */}
            {(() => {
              const isSelected = selectedCatId === 'all';
              const isFocused = activeSection === 'categories' && focusedCatIndex === 0;

              return (
                <button
                  onClick={() => {
                    setSelectedCatId('all');
                    setFocusedCatIndex(0);
                    setActiveSection('grid');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                    isFocused
                      ? 'bg-amber-400 text-slate-950 scale-102 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                      : isSelected
                      ? 'bg-slate-800 text-amber-400 border border-amber-400/40'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {type === 'movies' ? (
                      <Clapperboard
                        className={`w-4 h-4 ${isFocused ? 'text-slate-950' : 'text-blue-400'}`}
                      />
                    ) : (
                      <Film
                        className={`w-4 h-4 ${isFocused ? 'text-slate-950' : 'text-purple-400'}`}
                      />
                    )}
                    <span className="truncate">Tüm İçerikler</span>
                  </div>
                </button>
              );
            })()}

            {/* Dynamic Categories */}
            {categories.map((cat, idx) => {
              const itemIndex = idx + 1;
              const isSelected = selectedCatId === cat.category_id;
              const isFocused = activeSection === 'categories' && focusedCatIndex === itemIndex;

              return (
                <button
                  key={cat.category_id}
                  onClick={() => {
                    setSelectedCatId(cat.category_id);
                    setFocusedCatIndex(itemIndex);
                    setActiveSection('grid');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                    isFocused
                      ? 'bg-amber-400 text-slate-950 scale-102 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                      : isSelected
                      ? 'bg-slate-800 text-amber-400 border border-amber-400/40'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isFocused ? 'bg-slate-950' : isSelected ? 'bg-amber-400' : 'bg-slate-600'
                      }`}
                    />
                    <span className="truncate">{cat.category_name}</span>
                  </div>

                  {cat.stream_count !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        isFocused
                          ? 'bg-slate-900/20 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {cat.stream_count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: 5-Column Poster Grid */}
        <div className="flex-1 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden shadow-xl">
          {/* Header count info */}
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {activeCategoryName}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
              Toplam {currentItemsCount} İçerik
            </span>
          </div>

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-xs font-medium">İçerikler yükleniyor...</p>
            </div>
          ) : currentItemsCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <SearchX className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">Bu grupta içerik bulunamadı</p>
            </div>
          ) : (
            <div
              ref={gridContainerRef}
              className="flex-1 overflow-y-auto no-scrollbar p-4 grid grid-cols-5 gap-4 content-start"
            >
              {type === 'movies'
                ? moviesList.map((movie, idx) => {
                    const isFocused = activeSection === 'grid' && focusedGridIndex === idx;
                    const rating = movie.rating_5based ? (movie.rating_5based * 2).toFixed(1) : (movie.rating ? Number(movie.rating).toFixed(1) : '8.0');
                    const cleanName = movie.name.replace(/^[*|\-_\s]+|[*|\-_\s]+$/g, '');

                    return (
                      <div
                        key={movie.stream_id}
                        onClick={() => {
                          setFocusedGridIndex(idx);
                          onPlayMovie({
                            id: movie.stream_id,
                            title: movie.name,
                            type: 'movie',
                            streamUrl: getMovieStreamUrl(
                              credentials,
                              movie.stream_id,
                              movie.container_extension || 'mp4'
                            ),
                            streamType: 'mp4',
                            poster: movie.stream_icon,
                            subTitle: 'Film (VOD)',
                          });
                        }}
                        className={`group relative w-full h-[360px] flex flex-col rounded-2xl bg-slate-950 overflow-hidden cursor-pointer transition-all duration-200 border shadow-lg ${
                          isFocused
                            ? 'border-amber-400 scale-105 shadow-2xl shadow-amber-400/25 ring-4 ring-amber-400/40 z-10'
                            : 'border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Poster Image Container */}
                        <div className="relative flex-1 w-full bg-slate-900 overflow-hidden">
                          {movie.stream_icon ? (
                            <img
                              src={movie.stream_icon}
                              alt={cleanName}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-900 text-slate-500">
                              <Clapperboard className="w-10 h-10 mb-2 text-slate-600" />
                              <span className="text-xs font-semibold line-clamp-2">{cleanName}</span>
                            </div>
                          )}

                          {/* Top Rating Badge (Hot IPTV style) */}
                          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-bold text-amber-400 shadow">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{rating}</span>
                          </div>

                          {/* Top Right Favorite Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(e, movie.stream_id);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 backdrop-blur-md text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                favorites.includes(movie.stream_id)
                                  ? 'text-rose-500 fill-rose-500'
                                  : 'text-white/70'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Bottom Title Pill */}
                        <div
                          className={`h-12 px-2.5 py-1.5 flex items-center justify-center text-center transition-colors ${
                            isFocused ? 'bg-amber-400' : 'bg-slate-950/95 border-t border-slate-800/80'
                          }`}
                        >
                          <h4
                            className={`text-xs truncate drop-shadow ${
                              isFocused ? 'text-slate-950 font-extrabold' : 'text-slate-200 font-bold'
                            }`}
                          >
                            {cleanName}
                          </h4>
                        </div>
                      </div>
                    );
                  })
                : seriesList.map((series, idx) => {
                    const isFocused = activeSection === 'grid' && focusedGridIndex === idx;
                    const rating = series.rating ? Number(series.rating).toFixed(1) : '8.5';
                    const cleanName = series.name.replace(/^[*|\-_\s]+|[*|\-_\s]+$/g, '');

                    return (
                      <div
                        key={series.series_id}
                        onClick={() => {
                          setFocusedGridIndex(idx);
                          onSelectSeries(series);
                        }}
                        className={`group relative w-full h-[360px] flex flex-col rounded-2xl bg-slate-950 overflow-hidden cursor-pointer transition-all duration-200 border shadow-lg ${
                          isFocused
                            ? 'border-amber-400 scale-105 shadow-2xl shadow-amber-400/25 ring-4 ring-amber-400/40 z-10'
                            : 'border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Poster Image Container */}
                        <div className="relative flex-1 w-full bg-slate-900 overflow-hidden">
                          {series.cover ? (
                            <img
                              src={series.cover}
                              alt={cleanName}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-900 text-slate-500">
                              <Film className="w-10 h-10 mb-2 text-slate-600" />
                              <span className="text-xs font-semibold line-clamp-2">{cleanName}</span>
                            </div>
                          )}

                          {/* Top Rating Badge */}
                          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-bold text-amber-400 shadow">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{rating}</span>
                          </div>
                        </div>

                        {/* Bottom Title Pill */}
                        <div
                          className={`h-12 px-2.5 py-1.5 flex items-center justify-center text-center transition-colors ${
                            isFocused ? 'bg-amber-400' : 'bg-slate-950/95 border-t border-slate-800/80'
                          }`}
                        >
                          <h4
                            className={`text-xs truncate drop-shadow ${
                              isFocused ? 'text-slate-950 font-extrabold' : 'text-slate-200 font-bold'
                            }`}
                          >
                            {cleanName}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
