import React, { useState, useEffect, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type {
  Category,
  SeriesItem,
  XtreamCredentials,
  XtreamUserInfo,
  PlayableMedia,
} from './types/iptv';
import {
  getStoredCredentials,
  saveCredentials,
  getFavorites,
  toggleFavorite,
} from './services/storage';
import {
  authenticateXtream,
  getLiveCategories,
  getLiveStreams,
  getVodCategories,
  getVodStreams,
  getSeriesCategories,
  getSeriesList,
} from './services/xtream';
import { LandingPage } from './components/LandingPage';
import { LiveTvView } from './components/LiveTvView';
import { VodView } from './components/VodView';
import { SeriesDetailView } from './components/SeriesDetailView';
import { PlayerView } from './components/PlayerView';
import { LoginModal } from './components/LoginModal';

type AppScreen = 'landing' | 'live' | 'movies' | 'series' | 'series-detail';

export const App: React.FC = () => {
  // Current Active Screen
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');

  // Credentials & User Info
  const [credentials, setCredentials] = useState<XtreamCredentials>(getStoredCredentials);
  const [userInfo, setUserInfo] = useState<XtreamUserInfo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Categories
  const [liveCategories, setLiveCategories] = useState<Category[]>([]);
  const [movieCategories, setMovieCategories] = useState<Category[]>([]);
  const [seriesCategories, setSeriesCategories] = useState<Category[]>([]);

  // Selected series for SeriesDetailView
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);

  // Active playing media (Fullscreen Player)
  const [activeMedia, setActiveMedia] = useState<PlayableMedia | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<number[]>(getFavorites);

  // Initial load: authenticate and fetch all 3 category sets
  const loadInitialData = useCallback(async (creds: XtreamCredentials) => {
    try {
      const auth = await authenticateXtream(creds);
      setUserInfo(auth.user_info);

      const [liveCats, vodCats, serCats] = await Promise.all([
        getLiveCategories(creds).catch(() => []),
        getVodCategories(creds).catch(() => []),
        getSeriesCategories(creds).catch(() => []),
      ]);

      setLiveCategories(liveCats);
      setMovieCategories(vodCats);
      setSeriesCategories(serCats);
    } catch (err: unknown) {
      console.error('Initialization error:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData(credentials);
  }, [credentials, loadInitialData]);

  // Android TV Hardware Back Button listener
  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    try {
      CapacitorApp.addListener('backButton', () => {
        if (activeMedia) {
          setActiveMedia(null);
        } else if (currentScreen === 'series-detail') {
          setCurrentScreen('series');
          setSelectedSeries(null);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (currentScreen !== 'landing') {
          setCurrentScreen('landing');
        } else {
          CapacitorApp.exitApp();
        }
      }).then((handle) => {
        listenerHandle = handle;
      });
    } catch (e) {
      console.warn('Capacitor App listener not active on web', e);
    }

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [activeMedia, currentScreen, isSettingsOpen]);

  // Favorite toggle handler
  const handleToggleFavorite = (e: React.MouseEvent, streamId: number) => {
    e.stopPropagation();
    const updated = toggleFavorite(streamId);
    setFavorites(updated);
  };

  // Helper fetch functions passed to sub-views
  const fetchLiveStreams = useCallback(
    async (categoryId: string) => {
      if (categoryId === 'favorites') {
        const all = await getLiveStreams(credentials);
        return all.filter((s) => favorites.includes(s.stream_id));
      }
      return getLiveStreams(credentials, categoryId);
    },
    [credentials, favorites]
  );

  const fetchVodStreams = useCallback(
    async (categoryId: string) => {
      return getVodStreams(credentials, categoryId);
    },
    [credentials]
  );

  const fetchSeriesStreams = useCallback(
    async (categoryId: string) => {
      return getSeriesList(credentials, categoryId);
    },
    [credentials]
  );

  // 1. FULLSCREEN VIDEO PLAYER
  if (activeMedia) {
    return (
      <PlayerView
        media={activeMedia}
        onBack={() => setActiveMedia(null)}
      />
    );
  }

  // 2. LANDING PAGE (Ana Karşılama Ekranı)
  if (currentScreen === 'landing') {
    return (
      <>
        <LandingPage
          userInfo={userInfo}
          credentials={credentials}
          liveCount={liveCategories.length}
          movieCount={movieCategories.length}
          seriesCount={seriesCategories.length}
          onSelectSection={(tab) => setCurrentScreen(tab)}
          onRefresh={() => loadInitialData(credentials)}
          onChangePlaylist={() => setIsSettingsOpen(true)}
        />

        <LoginModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialCreds={credentials}
          onSave={(newCreds) => {
            saveCredentials(newCreds);
            setCredentials(newCreds);
            setIsSettingsOpen(false);
          }}
        />
      </>
    );
  }

  // 3. DEDICATED LIVE TV SCREEN (Hot IPTV 3-Column with Mini-Player)
  if (currentScreen === 'live') {
    return (
      <LiveTvView
        categories={liveCategories}
        credentials={credentials}
        userInfo={userInfo}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onPlayFullscreen={(media) => setActiveMedia(media)}
        onBackToLanding={() => setCurrentScreen('landing')}
        fetchStreams={fetchLiveStreams}
      />
    );
  }

  // 4. DEDICATED MOVIES SCREEN (Hot IPTV 5-Column Poster Grid)
  if (currentScreen === 'movies') {
    return (
      <VodView
        type="movies"
        categories={movieCategories}
        credentials={credentials}
        userInfo={userInfo}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onPlayMovie={(media) => setActiveMedia(media)}
        onSelectSeries={() => {}}
        onBackToLanding={() => setCurrentScreen('landing')}
        fetchMovies={fetchVodStreams}
      />
    );
  }

  // 5. DEDICATED SERIES CATALOG SCREEN (Hot IPTV 5-Column Poster Grid)
  if (currentScreen === 'series') {
    return (
      <VodView
        type="series"
        categories={seriesCategories}
        credentials={credentials}
        userInfo={userInfo}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onPlayMovie={() => {}}
        onSelectSeries={(series) => {
          setSelectedSeries(series);
          setCurrentScreen('series-detail');
        }}
        onBackToLanding={() => setCurrentScreen('landing')}
        fetchSeries={fetchSeriesStreams}
      />
    );
  }

  // 6. DEDICATED SERIES DETAIL SCREEN (Hot IPTV 3-Column Seasons/Episodes/Preview)
  if (currentScreen === 'series-detail' && selectedSeries) {
    return (
      <SeriesDetailView
        series={selectedSeries}
        credentials={credentials}
        userInfo={userInfo}
        onBack={() => {
          setSelectedSeries(null);
          setCurrentScreen('series');
        }}
        onPlayEpisode={(media) => setActiveMedia(media)}
      />
    );
  }

  return null;
};

export default App;
