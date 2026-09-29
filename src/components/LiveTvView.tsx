import React, { useState, useEffect, useRef, useMemo } from 'react';
import Hls from 'hls.js';
import type {
  Category,
  LiveStream,
  PlayableMedia,
  XtreamCredentials,
  XtreamUserInfo,
} from '../types/iptv';
import { getLiveStreamUrl } from '../services/xtream';
import { TvTopBar } from './TvTopBar';
import { MarqueeText } from './MarqueeText';
import {
  Tv,
  Star,
  Maximize2,
  Volume2,
  VolumeX,
  Radio,
  Heart,
  Loader2,
  Play,
  Info,
} from 'lucide-react';

interface LiveTvViewProps {
  categories: Category[];
  credentials: XtreamCredentials;
  userInfo: XtreamUserInfo | null;
  favorites: number[];
  onToggleFavorite: (e: React.MouseEvent, streamId: number) => void;
  onPlayFullscreen: (media: PlayableMedia) => void;
  onBackToLanding: () => void;
  fetchStreams: (catId: string) => Promise<LiveStream[]>;
}

// Global origin tracking for HLS edge redirects
let liveStreamOrigin = 'http://1dhn1.xyz:80';

class MiniStreamLoader extends (Hls.DefaultConfig.loader as any) {
  load(context: any, config: any, callbacks: any) {
    if (context && context.url) {
      const u: string = context.url;
      if (u.startsWith('http://localhost/') || u.startsWith('http://127.0.0.1/')) {
        context.url = u.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, liveStreamOrigin);
      } else if (u.startsWith('/')) {
        context.url = liveStreamOrigin + u;
      }
    }

    const origSuccess = callbacks.onSuccess;
    callbacks.onSuccess = (response: any, stats: any, ctx: any, xhr: any) => {
      if (response && response.url) {
        try {
          const parsed = new URL(response.url);
          if (parsed.origin && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
            liveStreamOrigin = parsed.origin;
          }
        } catch {
          // Ignore
        }
      }
      origSuccess(response, stats, ctx, xhr);
    };

    super.load(context, config, callbacks);
  }
}

export const LiveTvView: React.FC<LiveTvViewProps> = ({
  categories,
  credentials,
  userInfo,
  favorites,
  onToggleFavorite,
  onPlayFullscreen,
  onBackToLanding,
  fetchStreams,
}) => {
  // Navigation Sections: 'categories' (Sol) | 'channels' (Orta) | 'preview' (Sağ)
  const [activeSection, setActiveSection] = useState<'categories' | 'channels' | 'preview'>('channels');

  // Selected Category
  const [selectedCatId, setSelectedCatId] = useState<string>(
    categories.length > 0 ? categories[0].category_id : 'all'
  );
  const [focusedCatIndex, setFocusedCatIndex] = useState<number>(2); // 0: Fav, 1: All, 2+: Categories

  // Channels state
  const [channels, setChannels] = useState<LiveStream[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [focusedChannelIndex, setFocusedChannelIndex] = useState<number>(0);

  // Active channel selected for the Mini-Player preview
  const [previewChannel, setPreviewChannel] = useState<LiveStream | null>(null);
  const [isMiniMuted, setIsMiniMuted] = useState<boolean>(false);
  const [miniError, setMiniError] = useState<boolean>(false);
  const [isMiniLoading, setIsMiniLoading] = useState<boolean>(true);

  // Refs
  const miniVideoRef = useRef<HTMLVideoElement>(null);
  const miniHlsRef = useRef<Hls | null>(null);
  const categoriesListRef = useRef<HTMLDivElement>(null);
  const channelsListRef = useRef<HTMLDivElement>(null);
  const lastKeyTimeRef = useRef<number>(0);

  // Category names map
  const activeCategoryName = useMemo(() => {
    if (selectedCatId === 'favorites') return 'Favorilerim';
    if (selectedCatId === 'all') return 'Tüm İçerikler';
    const found = categories.find((c) => c.category_id === selectedCatId);
    return found ? found.category_name : 'Canlı Kanallar';
  }, [categories, selectedCatId]);

  // Total categories count including Favorites & All
  const totalCategoriesCount = categories.length + 2;

  // Load channels when category changes
  useEffect(() => {
    let cancelled = false;
    setIsLoadingChannels(true);

    fetchStreams(selectedCatId)
      .then((items) => {
        if (!cancelled) {
          setChannels(items);
          setFocusedChannelIndex(0);
          if (items.length > 0) {
            setPreviewChannel(items[0]);
          } else {
            setPreviewChannel(null);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load channels:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingChannels(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCatId, fetchStreams]);

  // Mini Player Stream loader
  useEffect(() => {
    const video = miniVideoRef.current;
    if (!video || !previewChannel) return;

    const streamUrl = getLiveStreamUrl(credentials, previewChannel.stream_id, 'm3u8');
    setIsMiniLoading(true);
    setMiniError(false);

    try {
      liveStreamOrigin = new URL(streamUrl).origin;
    } catch {
      liveStreamOrigin = 'http://1dhn1.xyz:80';
    }

    if (miniHlsRef.current) {
      miniHlsRef.current.destroy();
      miniHlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        loader: MiniStreamLoader as any,
        enableWorker: false,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
      });
      miniHlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsMiniLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setMiniError(true);
            setIsMiniLoading(false);
            hls.destroy();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.onloadedmetadata = () => {
        setIsMiniLoading(false);
        video.play().catch(() => {});
      };
      video.onerror = () => {
        setMiniError(true);
        setIsMiniLoading(false);
      };
    }

    return () => {
      if (miniHlsRef.current) {
        miniHlsRef.current.destroy();
        miniHlsRef.current = null;
      }
    };
  }, [previewChannel, credentials]);

  // Scroll focused category into view
  useEffect(() => {
    if (activeSection === 'categories' && categoriesListRef.current) {
      const el = categoriesListRef.current.children[focusedCatIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedCatIndex, activeSection]);

  // Scroll focused channel into view & update preview channel
  useEffect(() => {
    if (channelsListRef.current) {
      const el = channelsListRef.current.children[focusedChannelIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Automatically update mini-player preview when focusing a channel
    if (channels[focusedChannelIndex]) {
      const timer = setTimeout(() => {
        setPreviewChannel(channels[focusedChannelIndex]);
      }, 350); // slight debounce for smooth navigation
      return () => clearTimeout(timer);
    }
  }, [focusedChannelIndex, channels]);

  // TV Remote Key Controller
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

      // Throttle remote events (160ms)
      const now = Date.now();
      const throttleDuration = e.repeat ? 200 : 160;
      if (now - lastKeyTimeRef.current < throttleDuration) {
        e.preventDefault();
        return;
      }
      lastKeyTimeRef.current = now;

      // 1. Back button navigation
      if (isBack) {
        e.preventDefault();
        if (activeSection === 'preview') {
          setActiveSection('channels');
        } else if (activeSection === 'channels') {
          setActiveSection('categories');
        } else {
          // In categories -> return to Landing Page!
          onBackToLanding();
        }
        return;
      }

      // 2. Section: CATEGORIES (Sol Kolon)
      if (activeSection === 'categories') {
        if (isUp) {
          e.preventDefault();
          setFocusedCatIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (isDown) {
          e.preventDefault();
          setFocusedCatIndex((prev) => (prev < totalCategoriesCount - 1 ? prev + 1 : prev));
        } else if (isRight || isOk) {
          e.preventDefault();
          // Apply category
          if (focusedCatIndex === 0) setSelectedCatId('favorites');
          else if (focusedCatIndex === 1) setSelectedCatId('all');
          else {
            const cat = categories[focusedCatIndex - 2];
            if (cat) setSelectedCatId(cat.category_id);
          }
          setActiveSection('channels');
        }
        return;
      }

      // 3. Section: CHANNELS (Orta Kolon)
      if (activeSection === 'channels') {
        if (isUp) {
          e.preventDefault();
          setFocusedChannelIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (isDown) {
          e.preventDefault();
          setFocusedChannelIndex((prev) =>
            prev < channels.length - 1 ? prev + 1 : prev
          );
        } else if (isLeft) {
          e.preventDefault();
          setActiveSection('categories');
        } else if (isRight) {
          e.preventDefault();
          setActiveSection('preview');
        } else if (isOk) {
          e.preventDefault();
          // Launch Fullscreen Player immediately on Enter!
          const target = channels[focusedChannelIndex];
          if (target) {
            onPlayFullscreen({
              id: target.stream_id,
              title: target.name,
              type: 'live',
              streamUrl: getLiveStreamUrl(credentials, target.stream_id, 'm3u8'),
              streamType: 'hls',
              poster: target.stream_icon,
              subTitle: `Canlı Kanal #${target.num}`,
            });
          }
        }
        return;
      }

      // 4. Section: PREVIEW / MINI-PLAYER (Sağ Kolon)
      if (activeSection === 'preview') {
        if (isLeft) {
          e.preventDefault();
          setActiveSection('channels');
        } else if (isOk) {
          e.preventDefault();
          if (previewChannel) {
            onPlayFullscreen({
              id: previewChannel.stream_id,
              title: previewChannel.name,
              type: 'live',
              streamUrl: getLiveStreamUrl(credentials, previewChannel.stream_id, 'm3u8'),
              streamType: 'hls',
              poster: previewChannel.stream_icon,
              subTitle: `Canlı Kanal #${previewChannel.num}`,
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSection,
    focusedCatIndex,
    focusedChannelIndex,
    totalCategoriesCount,
    channels,
    previewChannel,
    categories,
    credentials,
    onBackToLanding,
    onPlayFullscreen,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070e1e] text-white overflow-hidden select-none font-sans">
      {/* Dedicated Top Bar: No cross-section tabs, clean info matching Hot IPTV */}
      <TvTopBar
        tab="live"
        categoryName={activeCategoryName}
        subTitle={previewChannel ? previewChannel.name : undefined}
        userInfo={userInfo}
        credentials={credentials}
        onBack={onBackToLanding}
      />

      {/* Main 3-Column Split View */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* COLUMN 1: Categories List (Sol Kolon - Compact w-56 for maximum mini-player size) */}
        <div className="w-56 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden shadow-xl flex-shrink-0">
          <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Kategoriler
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
              {categories.length}
            </span>
          </div>

          <div
            ref={categoriesListRef}
            className="flex-1 overflow-y-auto no-scrollbar p-1.5 space-y-1"
          >
            {/* 1. Favoriler */}
            {(() => {
              const isSelected = selectedCatId === 'favorites';
              const isFocused = activeSection === 'categories' && focusedCatIndex === 0;

              return (
                <button
                  onClick={() => {
                    setSelectedCatId('favorites');
                    setFocusedCatIndex(0);
                    setActiveSection('channels');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                    isFocused
                      ? 'bg-amber-400 text-slate-950 scale-102 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                      : isSelected
                      ? 'bg-slate-800 text-amber-400 border border-amber-400/40'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <Heart
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isFocused ? 'text-slate-950 fill-slate-950' : 'text-rose-500 fill-rose-500'
                      }`}
                    />
                    <MarqueeText
                      text="Favoriler Listesi"
                      isFocused={isFocused}
                      className={isFocused ? 'text-slate-950 font-bold' : ''}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ml-1 flex-shrink-0 ${
                      isFocused
                        ? 'bg-slate-900/20 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {favorites.length}
                  </span>
                </button>
              );
            })()}

            {/* 2. Tüm İçerikler */}
            {(() => {
              const isSelected = selectedCatId === 'all';
              const isFocused = activeSection === 'categories' && focusedCatIndex === 1;

              return (
                <button
                  onClick={() => {
                    setSelectedCatId('all');
                    setFocusedCatIndex(1);
                    setActiveSection('channels');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                    isFocused
                      ? 'bg-amber-400 text-slate-950 scale-102 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                      : isSelected
                      ? 'bg-slate-800 text-amber-400 border border-amber-400/40'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <Radio
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        isFocused ? 'text-slate-950' : 'text-blue-400'
                      }`}
                    />
                    <MarqueeText
                      text="Tüm Kanallar"
                      isFocused={isFocused}
                      className={isFocused ? 'text-slate-950 font-bold' : ''}
                    />
                  </div>
                </button>
              );
            })()}

            {/* Dynamic Xtream Categories */}
            {categories.map((cat, idx) => {
              const itemIndex = idx + 2;
              const isSelected = selectedCatId === cat.category_id;
              const isFocused = activeSection === 'categories' && focusedCatIndex === itemIndex;

              return (
                <button
                  key={cat.category_id}
                  onClick={() => {
                    setSelectedCatId(cat.category_id);
                    setFocusedCatIndex(itemIndex);
                    setActiveSection('channels');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                    isFocused
                      ? 'bg-amber-400 text-slate-950 scale-102 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                      : isSelected
                      ? 'bg-slate-800 text-amber-400 border border-amber-400/40'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isFocused ? 'bg-slate-950' : isSelected ? 'bg-amber-400' : 'bg-slate-600'
                      }`}
                    />
                    <MarqueeText
                      text={cat.category_name}
                      isFocused={isFocused}
                      className={isFocused ? 'text-slate-950 font-bold' : ''}
                    />
                  </div>

                  {cat.stream_count !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ml-1 flex-shrink-0 ${
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

        {/* COLUMN 2: Channel List (Orta Kolon - Compact w-80 for maximum mini-player size) */}
        <div className="w-80 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex flex-col overflow-hidden shadow-xl flex-shrink-0">
          <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate mr-2">
              {activeCategoryName}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold flex-shrink-0">
              {channels.length} Kanal
            </span>
          </div>

          {isLoadingChannels ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-xs font-medium">Kanallar yükleniyor...</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <Tv className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">Bu grupta kanal bulunamadı</p>
            </div>
          ) : (
            <div
              ref={channelsListRef}
              className="flex-1 overflow-y-auto no-scrollbar p-1.5 space-y-1"
            >
              {channels.map((channel, idx) => {
                const isFocused = activeSection === 'channels' && focusedChannelIndex === idx;
                const isCurrentPreview = previewChannel?.stream_id === channel.stream_id;
                const isFav = favorites.includes(channel.stream_id);
                const cleanName = channel.name.replace(/^[*|\-_\s]+|[*|\-_\s]+$/g, '');

                return (
                  <div
                    key={channel.stream_id}
                    onClick={() => {
                      setFocusedChannelIndex(idx);
                      setPreviewChannel(channel);
                      onPlayFullscreen({
                        id: channel.stream_id,
                        title: channel.name,
                        type: 'live',
                        streamUrl: getLiveStreamUrl(credentials, channel.stream_id, 'm3u8'),
                        streamType: 'hls',
                        poster: channel.stream_icon,
                        subTitle: `Canlı Kanal #${channel.num}`,
                      });
                    }}
                    className={`group flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all select-none ${
                      isFocused
                        ? 'bg-amber-400 text-slate-950 scale-101 shadow-lg shadow-amber-400/25 ring-2 ring-amber-300'
                        : isCurrentPreview
                        ? 'bg-slate-800/95 border border-amber-400/40 text-white'
                        : 'bg-slate-950/40 text-slate-200 hover:bg-slate-800/70 border border-slate-800/40'
                    }`}
                  >
                    {/* Channel Logo */}
                    <div className="w-9 h-9 rounded-lg bg-slate-950 flex-shrink-0 flex items-center justify-center overflow-hidden p-1 border border-slate-800">
                      {channel.stream_icon ? (
                        <img
                          src={channel.stream_icon}
                          alt={cleanName}
                          className="w-full h-full object-contain filter drop-shadow"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Tv
                          className={`w-4 h-4 ${
                            isFocused ? 'text-slate-950' : 'text-slate-500'
                          }`}
                        />
                      )}
                    </div>

                    {/* Channel Title with Marquee on focus */}
                    <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-center">
                      <MarqueeText
                        text={cleanName}
                        isFocused={isFocused}
                        className={`text-xs font-bold leading-tight ${
                          isFocused ? 'text-slate-950 font-extrabold' : 'text-slate-100'
                        }`}
                      />
                      <span
                        className={`text-[9px] uppercase font-semibold tracking-wider mt-0.5 ${
                          isFocused ? 'text-slate-800' : 'text-blue-400'
                        }`}
                      >
                        CANLI YAYIN
                      </span>
                    </div>

                    {/* Number Badge (Hot IPTV Cyan Pill style) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {channel.num > 0 && (
                        <span
                          className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md ${
                            isFocused
                              ? 'bg-slate-950 text-amber-400'
                              : 'bg-sky-600 text-white'
                          }`}
                        >
                          {channel.num}
                        </span>
                      )}

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => onToggleFavorite(e, channel.stream_id)}
                        className="p-1 rounded hover:bg-black/20 text-slate-500 transition-colors"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            isFav
                              ? 'text-amber-500 fill-amber-500'
                              : isFocused
                              ? 'text-slate-800'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 3: Right Pane — Mini Player (Üst) & Channel Info/EPG (Alt) */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          {/* Upper Half: Mini Player (16:9 Video Preview) */}
          <div
            onClick={() => {
              if (previewChannel) {
                onPlayFullscreen({
                  id: previewChannel.stream_id,
                  title: previewChannel.name,
                  type: 'live',
                  streamUrl: getLiveStreamUrl(credentials, previewChannel.stream_id, 'm3u8'),
                  streamType: 'hls',
                  poster: previewChannel.stream_icon,
                  subTitle: `Canlı Kanal #${previewChannel.num}`,
                });
              }
            }}
            className={`relative w-full aspect-video bg-black rounded-2xl border overflow-hidden shadow-2xl flex items-center justify-center group cursor-pointer transition-all ${
              activeSection === 'preview'
                ? 'border-amber-400 ring-4 ring-amber-400/30'
                : 'border-slate-800'
            }`}
          >
            {/* Live Video Element */}
            <video
              ref={miniVideoRef}
              muted={isMiniMuted}
              playsInline
              className="w-full h-full object-cover bg-black"
            />

            {/* Loading indicator */}
            {isMiniLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs gap-2">
                <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
                <span className="text-xs text-slate-300 font-semibold">Yayın Yükleniyor...</span>
              </div>
            )}

            {/* Error Overlay */}
            {miniError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-2 p-4 text-center">
                <Tv className="w-8 h-8 text-rose-500" />
                <span className="text-xs font-semibold text-slate-300">
                  Önizleme başlatılamadı
                </span>
                <span className="text-[11px] text-slate-500">
                  OK tuşuna basarak tam ekran oynatabilirsiniz
                </span>
              </div>
            )}

            {/* Bottom Stream Overlay Info (Hot IPTV style) */}
            {previewChannel && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 flex items-end justify-between pointer-events-none">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-600/80 text-[10px] font-black uppercase tracking-wider text-white">
                      CANLI
                    </span>
                    <span className="text-xs font-bold text-amber-400">
                      {activeCategoryName}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1 drop-shadow-md">
                    {previewChannel.name}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold text-sky-400 block">
                      N° {previewChannel.num}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      1920 x 1080
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white">
                    <Maximize2 className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Hover/Focus Fullscreen Prompt */}
            <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMiniMuted((prev) => !prev);
                }}
                className="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-colors"
              >
                {isMiniMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Lower Half: Channel Broadcast Info & EPG Card */}
          <div className="flex-1 min-h-0 bg-slate-900/80 rounded-2xl border border-slate-800/80 p-3.5 flex flex-col justify-between shadow-xl">
            {previewChannel ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Yayın ve Kanal Bilgisi
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    ID: {previewChannel.stream_id}
                  </span>
                </div>

                {/* Now Playing Banner (Yellow Card style from Hot IPTV) */}
                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30">
                  <div className="flex items-center gap-2 text-amber-400 text-[11px] font-extrabold uppercase">
                    <Play className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Şimdi Yayında</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1 truncate">
                    {previewChannel.name}
                  </h4>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-amber-400 h-full w-2/3 rounded-full" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
                <Tv className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs font-medium">Önizlemek için soldan bir kanal seçin</p>
              </div>
            )}

            {/* Quick Action Buttons & TV Remote Guide */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-5 text-[11px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono font-bold">
                  ▲/▼
                </span>
                <span>Kanal Seç</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-black">
                  OK
                </span>
                <span className="text-amber-400 font-bold">Tam Ekran</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono font-bold">
                  ◀
                </span>
                <span>Kategoriler</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono font-bold">
                  GERİ
                </span>
                <span>Ana Menü</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
