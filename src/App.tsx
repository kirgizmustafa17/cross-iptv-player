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
  getOrCreateDeviceInfo,
  type StoredPlaylist,
} from './services/device';
import {
  syncDeviceWithBackend,
  activatePlaylist,
} from './services/deviceClient';
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
import { PlaylistSwitcherModal } from './components/PlaylistSwitcherModal';
import { DevicePortalModal } from './components/DevicePortalModal';

type AppScreen = 'landing' | 'live' | 'movies' | 'series' | 'series-detail';

export const App: React.FC = () => {
  // Current Active Screen
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');

  // Device Info (Slug ID: mavi-kartal-7421, PIN: 1234)
  const [deviceInfo] = useState(() => getOrCreateDeviceInfo());

  // Credentials & User Info
  const [credentials, setCredentials] = useState<XtreamCredentials>(getStoredCredentials);
  const [userInfo, setUserInfo] = useState<XtreamUserInfo | null>(null);

  // Playlists synced from backend
  const [playlists, setPlaylists] = useState<StoredPlaylist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<StoredPlaylist | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState<boolean>(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState<boolean>(false);

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

  // Sync with backend & load initial playlists
  const syncWithCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      const syncResult = await syncDeviceWithBackend();
      setPlaylists(syncResult.playlists);
      if (syncResult.activePlaylist) {
        setActivePlaylist(syncResult.activePlaylist);
        if (
          syncResult.activePlaylist.type === 'xtream' &&
          syncResult.activePlaylist.serverUrl &&
          syncResult.activePlaylist.username &&
          syncResult.activePlaylist.password
        ) {
          const newCreds: XtreamCredentials = {
            serverUrl: syncResult.activePlaylist.serverUrl,
            username: syncResult.activePlaylist.username,
            password: syncResult.activePlaylist.password,
          };
          setCredentials(newCreds);
        }
      }
    } catch (err) {
      console.warn('Sync with cloud failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

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

  // Initial boot effect: sync with cloud first, then load initial categories
  useEffect(() => {
    syncWithCloud();
  }, [syncWithCloud]);

  useEffect(() => {
    loadInitialData(credentials);
  }, [credentials, loadInitialData]);

  // Handler for full refresh & cloud sync
  const handleFullRefresh = useCallback(async () => {
    await syncWithCloud();
    await loadInitialData(credentials);
  }, [syncWithCloud, loadInitialData, credentials]);

  // Handler for switching active playlist
  const handleSelectPlaylist = useCallback(
    async (pl: StoredPlaylist) => {
      setActivePlaylist(pl);
      if (pl.type === 'xtream' && pl.serverUrl && pl.username && pl.password) {
        const newCreds: XtreamCredentials = {
          serverUrl: pl.serverUrl,
          username: pl.username,
          password: pl.password,
        };
        saveCredentials(newCreds);
        setCredentials(newCreds);
        await activatePlaylist(deviceInfo.deviceId, pl.id);
        await loadInitialData(newCreds);
      }
    },
    [deviceInfo.deviceId, loadInitialData]
  );

  // Android TV Hardware Back Button listener
  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    try {
      CapacitorApp.addListener('backButton', () => {
        if (activeMedia) {
          setActiveMedia(null);
        } else if (isPortalModalOpen) {
          setIsPortalModalOpen(false);
        } else if (isPlaylistModalOpen) {
          setIsPlaylistModalOpen(false);
        } else if (isLoginModalOpen) {
          setIsLoginModalOpen(false);
        } else if (currentScreen === 'series-detail') {
          setCurrentScreen('series');
          setSelectedSeries(null);
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
  }, [
    activeMedia,
    currentScreen,
    isPortalModalOpen,
    isPlaylistModalOpen,
    isLoginModalOpen,
  ]);

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
          deviceInfo={deviceInfo}
          activePlaylist={activePlaylist}
          playlistsCount={playlists.length}
          liveCount={liveCategories.length}
          movieCount={movieCategories.length}
          seriesCount={seriesCategories.length}
          isSyncing={isSyncing}
          onSelectSection={(tab) => setCurrentScreen(tab)}
          onRefresh={handleFullRefresh}
          onOpenPlaylistSwitcher={() => setIsPlaylistModalOpen(true)}
          onOpenPortalModal={() => setIsPortalModalOpen(true)}
        />

        {/* Modal: Playlist Switcher (TV friendly list selection) */}
        <PlaylistSwitcherModal
          isOpen={isPlaylistModalOpen}
          onClose={() => setIsPlaylistModalOpen(false)}
          playlists={playlists}
          activePlaylistId={activePlaylist?.id}
          deviceId={deviceInfo.deviceId}
          onSelectPlaylist={handleSelectPlaylist}
          onOpenManualEntry={() => {
            setIsPlaylistModalOpen(false);
            setIsLoginModalOpen(true);
          }}
        />

        {/* Modal: Web Portal QR & Device Info */}
        <DevicePortalModal
          isOpen={isPortalModalOpen}
          onClose={() => setIsPortalModalOpen(false)}
          deviceId={deviceInfo.deviceId}
          pin={deviceInfo.pin}
        />

        {/* Modal: Manual Xtream credentials entry */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          initialCreds={credentials}
          onSave={(newCreds) => {
            saveCredentials(newCreds);
            setCredentials(newCreds);
            setIsLoginModalOpen(false);
            loadInitialData(newCreds);
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
