import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import type { PlayableMedia } from '../types/iptv';
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  AlertCircle,
  Tv,
  Maximize,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Languages,
  Subtitles,
  Check,
  X,
} from 'lucide-react';

export interface MediaTrackItem {
  id: number;
  name: string;
  lang?: string;
}

// Track latest known remote stream origin across redirects
let globalStreamOrigin = 'http://1dhn1.xyz:80';

// Custom Hls loader to reliably resolve redirects and avoid localhost URL corruption
class StreamLoader extends (Hls.DefaultConfig.loader as any) {
  load(context: any, config: any, callbacks: any) {
    if (context && context.url) {
      const u: string = context.url;
      // If URL got incorrectly resolved against localhost origin, rewrite to actual stream server
      if (u.startsWith('http://localhost/') || u.startsWith('http://127.0.0.1/')) {
        context.url = u.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, globalStreamOrigin);
      } else if (u.startsWith('/')) {
        context.url = globalStreamOrigin + u;
      }
    }

    const origSuccess = callbacks.onSuccess;
    callbacks.onSuccess = (response: any, stats: any, ctx: any, xhr: any) => {
      if (response && response.url) {
        try {
          const parsed = new URL(response.url);
          if (parsed.origin && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
            globalStreamOrigin = parsed.origin;
          }
        } catch {
          // Ignore parse errors
        }
      }
      origSuccess(response, stats, ctx, xhr);
    };

    super.load(context, config, callbacks);
  }
}

interface PlayerViewProps {
  media: PlayableMedia;
  onBack: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  media,
  onBack,
  onNext,
  onPrevious,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover'>('contain');
  const lastPlayerKeyTimeRef = useRef<number>(0);

  // Timeline & progress state for Movies and Series
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Audio and Subtitle Tracks (Only populated if multiple sources exist)
  const [audioTracks, setAudioTracks] = useState<MediaTrackItem[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(0);

  const [subtitleTracks, setSubtitleTracks] = useState<MediaTrackItem[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1); // -1 = Kapalı

  // Track selection modal state
  const [isTracksModalOpen, setIsTracksModalOpen] = useState<boolean>(false);
  const [activeTrackTab, setActiveTrackTab] = useState<'audio' | 'subtitles'>('audio');
  const [focusedTrackIndex, setFocusedTrackIndex] = useState<number>(0);

  const isTracksModalOpenRef = useRef(isTracksModalOpen);
  isTracksModalOpenRef.current = isTracksModalOpen;

  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable overlay timer that never causes re-renders of the video effect
  const resetOverlayTimer = useCallback(() => {
    setShowOverlay(true);
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
    }
    if (!isTracksModalOpenRef.current) {
      overlayTimerRef.current = setTimeout(() => {
        setShowOverlay(false);
      }, 4500);
    }
  }, []);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Switch Audio Track seamlessly WITHOUT restarting the video
  const handleSelectAudioTrack = (trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
    } else {
      const vAny = videoRef.current as unknown as { audioTracks?: Array<{ enabled: boolean }> };
      if (vAny?.audioTracks) {
        for (let i = 0; i < vAny.audioTracks.length; i++) {
          vAny.audioTracks[i].enabled = i === trackId;
        }
      }
    }
    setCurrentAudioTrack(trackId);
  };

  // Switch Subtitle Track seamlessly WITHOUT restarting the video
  const handleSelectSubtitleTrack = (trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = trackId;
    } else if (videoRef.current?.textTracks) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        videoRef.current.textTracks[i].mode = i === trackId ? 'showing' : 'disabled';
      }
    }
    setCurrentSubtitleTrack(trackId);
  };

  // Main Video Initialization: ONLY runs when stream URL or type changes!
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setErrorMsg(null);
    setCurrentTime(0);
    setDuration(0);
    setAudioTracks([]);
    setSubtitleTracks([]);
    setCurrentAudioTrack(0);
    setCurrentSubtitleTrack(-1);
    setIsTracksModalOpen(false);
    resetOverlayTimer();

    // Clean up previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    try {
      globalStreamOrigin = new URL(media.streamUrl).origin;
    } catch {
      globalStreamOrigin = 'http://1dhn1.xyz:80';
    }

    if (media.streamType === 'hls' && Hls.isSupported()) {
      const hls = new Hls({
        loader: StreamLoader as any,
        enableWorker: false,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
      });
      hlsRef.current = hls;

      hls.loadSource(media.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));

        // Detect available audio tracks
        if (hls.audioTracks && hls.audioTracks.length > 1) {
          setAudioTracks(
            hls.audioTracks.map((t, idx) => ({
              id: idx,
              name: t.name || t.lang || `Ses ${idx + 1}`,
              lang: t.lang,
            }))
          );
          setCurrentAudioTrack(hls.audioTrack >= 0 ? hls.audioTrack : 0);
        } else {
          setAudioTracks([]);
        }

        // Detect available subtitle tracks
        if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
          setSubtitleTracks(
            hls.subtitleTracks.map((t, idx) => ({
              id: idx,
              name: t.name || t.lang || `Altyazı ${idx + 1}`,
              lang: t.lang,
            }))
          );
          setCurrentSubtitleTrack(hls.subtitleTrack);
        } else {
          setSubtitleTracks([]);
        }
      });

      // Audio track updates from Hls
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
        if (data.audioTracks && data.audioTracks.length > 1) {
          setAudioTracks(
            data.audioTracks.map((t, idx) => ({
              id: idx,
              name: t.name || t.lang || `Ses ${idx + 1}`,
              lang: t.lang,
            }))
          );
          setCurrentAudioTrack(hls.audioTrack >= 0 ? hls.audioTrack : 0);
        } else {
          setAudioTracks([]);
        }
      });

      // Subtitle track updates from Hls
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_event, data) => {
        if (data.subtitleTracks && data.subtitleTracks.length > 0) {
          setSubtitleTracks(
            data.subtitleTracks.map((t, idx) => ({
              id: idx,
              name: t.name || t.lang || `Altyazı ${idx + 1}`,
              lang: t.lang,
            }))
          );
          setCurrentSubtitleTrack(hls.subtitleTrack);
        } else {
          setSubtitleTracks([]);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS Event Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('HLS Network error recovery attempt...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('HLS Media error recovery attempt...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal unrecoverable HLS error:', data);
              if (video && video.src !== media.streamUrl) {
                console.log('Attempting direct HTML5 fallback...');
                hls.destroy();
                hlsRef.current = null;
                video.src = media.streamUrl;
                video.play().then(() => setIsPlaying(true)).catch(() => {});
              } else {
                setErrorMsg('Yayın akışı başlatılamadı veya sunucu yanıt vermiyor.');
                setIsLoading(false);
                hls.destroy();
              }
              break;
          }
        }
      });
    } else if (media.streamType === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = media.streamUrl;
      video.onloadedmetadata = () => {
        setIsLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      };
      video.onerror = () => {
        setErrorMsg('Yayın akışı başlatılamadı.');
        setIsLoading(false);
      };
    } else {
      // Progressive direct stream (MP4, MKV)
      video.src = media.streamUrl;
      video.onloadedmetadata = () => {
        setIsLoading(false);
        setDuration(video.duration || 0);
        video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));

        // Native audio tracks detection
        const vAny = video as unknown as { audioTracks?: Array<{ label?: string; language?: string; enabled: boolean }> };
        if (vAny?.audioTracks && vAny.audioTracks.length > 1) {
          const list: MediaTrackItem[] = [];
          for (let i = 0; i < vAny.audioTracks.length; i++) {
            const tr = vAny.audioTracks[i];
            list.push({
              id: i,
              name: tr.label || tr.language || `Ses ${i + 1}`,
              lang: tr.language,
            });
          }
          setAudioTracks(list);
        } else {
          setAudioTracks([]);
        }

        // Native subtitle tracks detection
        if (video.textTracks && video.textTracks.length > 0) {
          const list: MediaTrackItem[] = [];
          for (let i = 0; i < video.textTracks.length; i++) {
            const tr = video.textTracks[i];
            list.push({
              id: i,
              name: tr.label || tr.language || `Altyazı ${i + 1}`,
              lang: tr.language,
            });
          }
          setSubtitleTracks(list);
        } else {
          setSubtitleTracks([]);
        }
      };
      video.onerror = () => {
        setErrorMsg('Video akışı yüklenirken hata oluştu.');
        setIsLoading(false);
      };
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [media.streamUrl, media.streamType]); // Intentionally ONLY streamUrl and streamType!

  // Remote key listeners inside Player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetOverlayTimer();

      const video = videoRef.current;
      if (!video) return;

      const isBack =
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.keyCode === 10009 ||
        e.keyCode === 461 ||
        e.keyCode === 4;

      const isUp = e.key === 'ArrowUp' || e.keyCode === 19 || e.keyCode === 427;
      const isDown = e.key === 'ArrowDown' || e.keyCode === 20 || e.keyCode === 428;
      const isLeft = e.key === 'ArrowLeft' || e.keyCode === 21;
      const isRight = e.key === 'ArrowRight' || e.keyCode === 22;
      const isOk =
        e.key === 'Enter' ||
        e.key === 'Select' ||
        e.key === ' ' ||
        e.keyCode === 13 ||
        e.keyCode === 23 ||
        e.keyCode === 66;

      // Throttle remote events to prevent skipping
      const now = Date.now();
      const throttleDuration = e.repeat ? 200 : 150;
      if (now - lastPlayerKeyTimeRef.current < throttleDuration) {
        e.preventDefault();
        return;
      }
      lastPlayerKeyTimeRef.current = now;

      // When Track Selection Modal is Open:
      if (isTracksModalOpen) {
        if (isBack) {
          e.preventDefault();
          setIsTracksModalOpen(false);
          return;
        }

        const itemsLength =
          activeTrackTab === 'audio'
            ? audioTracks.length
            : subtitleTracks.length + 1; // +1 for "Kapalı"

        if (isUp) {
          e.preventDefault();
          setFocusedTrackIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (isDown) {
          e.preventDefault();
          setFocusedTrackIndex((prev) => (prev < itemsLength - 1 ? prev + 1 : prev));
        } else if (isLeft && audioTracks.length > 1) {
          e.preventDefault();
          setActiveTrackTab('audio');
          setFocusedTrackIndex(0);
        } else if (isRight && subtitleTracks.length > 0) {
          e.preventDefault();
          setActiveTrackTab('subtitles');
          setFocusedTrackIndex(0);
        } else if (isOk) {
          e.preventDefault();
          if (activeTrackTab === 'audio') {
            if (audioTracks[focusedTrackIndex]) {
              handleSelectAudioTrack(audioTracks[focusedTrackIndex].id);
            }
          } else {
            if (focusedTrackIndex === 0) {
              handleSelectSubtitleTrack(-1);
            } else {
              const sub = subtitleTracks[focusedTrackIndex - 1];
              if (sub) handleSelectSubtitleTrack(sub.id);
            }
          }
          setIsTracksModalOpen(false);
        }
        return;
      }

      // Normal Player Key Navigation:
      if (isBack) {
        e.preventDefault();
        onBack();
      } else if (isUp) {
        e.preventDefault();
        if (onPrevious) onPrevious();
      } else if (isDown) {
        e.preventDefault();
        if (onNext) onNext();
      } else if (e.key === 'ArrowLeft') {
        if (media.type !== 'live') {
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
        }
      } else if (e.key === 'ArrowRight') {
        if (media.type !== 'live') {
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
        }
      } else if (e.key.toLowerCase() === 's' && subtitleTracks.length > 0) {
        e.preventDefault();
        setActiveTrackTab('subtitles');
        setFocusedTrackIndex(0);
        setIsTracksModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'a' && audioTracks.length > 1) {
        e.preventDefault();
        setActiveTrackTab('audio');
        setFocusedTrackIndex(0);
        setIsTracksModalOpen((prev) => !prev);
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (video.paused) {
          video.play();
          setIsPlaying(true);
        } else {
          video.pause();
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTrackTab,
    audioTracks,
    focusedTrackIndex,
    isTracksModalOpen,
    media.type,
    onBack,
    onNext,
    onPrevious,
    resetOverlayTimer,
    subtitleTracks,
  ]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetOverlayTimer();
  };

  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(
      Math.max(0, video.currentTime + seconds),
      video.duration || 0
    );
    resetOverlayTimer();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    resetOverlayTimer();
  };

  const toggleAspectRatio = () => {
    setAspectRatio((prev) => (prev === 'contain' ? 'cover' : 'contain'));
    resetOverlayTimer();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
    resetOverlayTimer();
  };

  // Has multiple tracks to choose from?
  const hasMultipleAudio = audioTracks.length > 1;
  const hasSubtitles = subtitleTracks.length > 0;
  const hasAnyTrackOptions = hasMultipleAudio || hasSubtitles;

  return (
    <div
      onMouseMove={resetOverlayTimer}
      onClick={resetOverlayTimer}
      className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        className={`w-full h-full object-${aspectRatio} bg-black`}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-30 gap-4">
          <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-white text-base font-medium tracking-wide">
            İçerik Yükleniyor...
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-30 gap-4 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Oynatma Hatası</h3>
          <p className="text-sm text-slate-400 max-w-md">{errorMsg}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => {
                const video = videoRef.current;
                if (video) video.load();
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
            >
              Yeniden Başlat
            </button>
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
            >
              Listeye Dön
            </button>
          </div>
        </div>
      )}

      {/* Audio / Subtitle Selection Modal - ONLY shown if tracks actually exist */}
      {isTracksModalOpen && hasAnyTrackOptions && (
        <div className="absolute right-8 bottom-28 z-40 w-96 bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            {/* Modal Tabs: only render tabs for tracks that actually have multiple options */}
            <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              {hasMultipleAudio && (
                <button
                  onClick={() => {
                    setActiveTrackTab('audio');
                    setFocusedTrackIndex(0);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTrackTab === 'audio'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>Ses Dili ({audioTracks.length})</span>
                </button>
              )}

              {hasSubtitles && (
                <button
                  onClick={() => {
                    setActiveTrackTab('subtitles');
                    setFocusedTrackIndex(0);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTrackTab === 'subtitles'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Subtitles className="w-3.5 h-3.5" />
                  <span>Altyazı ({subtitleTracks.length})</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setIsTracksModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Audio Tracks List */}
          {activeTrackTab === 'audio' && hasMultipleAudio && (
            <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto no-scrollbar">
              {audioTracks.map((track, idx) => {
                const isSelected = currentAudioTrack === track.id;
                const isFocused = focusedTrackIndex === idx;

                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      handleSelectAudioTrack(track.id);
                      setIsTracksModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                        : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                    } ${isFocused ? 'tv-focused bg-blue-600 text-white font-semibold' : ''}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Languages className="w-3.5 h-3.5 text-blue-400" />
                      <span className="truncate">{track.name}</span>
                      {track.lang && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {track.lang}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Subtitles List */}
          {activeTrackTab === 'subtitles' && hasSubtitles && (
            <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto no-scrollbar">
              {/* Option 1: Off (Kapalı) */}
              <button
                onClick={() => {
                  handleSelectSubtitleTrack(-1);
                  setIsTracksModalOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  currentSubtitleTrack === -1
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                    : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                } ${focusedTrackIndex === 0 ? 'tv-focused bg-blue-600 text-white font-semibold' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kapalı (Off)</span>
                </div>
                {currentSubtitleTrack === -1 && (
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
              </button>

              {subtitleTracks.map((sub, idx) => {
                const isSelected = currentSubtitleTrack === sub.id;
                const isFocused = focusedTrackIndex === idx + 1;

                return (
                  <button
                    key={sub.id}
                    onClick={() => {
                      handleSelectSubtitleTrack(sub.id);
                      setIsTracksModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                        : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                    } ${isFocused ? 'tv-focused bg-blue-600 text-white font-semibold' : ''}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Subtitles className="w-3.5 h-3.5 text-blue-400" />
                      <span className="truncate">{sub.name}</span>
                      {sub.lang && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {sub.lang}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TV OSD / Player Overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-8 pointer-events-none transition-opacity duration-300 z-20 bg-gradient-to-t from-black/95 via-transparent to-black/80 ${
          showOverlay || isTracksModalOpen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between pointer-events-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700/80 transition-colors shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm">Geri Dön</span>
          </button>

          <div className="flex items-center gap-3">
            {media.type === 'live' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold tracking-wider uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>CANLI YAYIN</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 text-xs font-bold tracking-wider uppercase">
                <span>{media.type === 'movie' ? 'FİLM (VOD)' : 'DİZİ BÖLÜMÜ'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar: Title, Timeline & Controls */}
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div className="flex items-end justify-between">
            {/* Title & Metadata */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center p-2 shadow-2xl flex-shrink-0">
                {media.poster ? (
                  <img
                    src={media.poster}
                    alt={media.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Tv className="w-7 h-7 text-blue-400" />
                )}
              </div>

              <div>
                {media.subTitle && (
                  <span className="text-xs font-semibold text-blue-400 tracking-wide uppercase">
                    {media.subTitle}
                  </span>
                )}
                <h2 className="text-2xl font-bold text-white drop-shadow-md">
                  {media.title}
                </h2>
              </div>
            </div>

            {/* Quick Remote Navigation Guide */}
            <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-xl backdrop-blur-md">
              {hasSubtitles && (
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white">S</span>
                  <span>Altyazı</span>
                </div>
              )}
              {hasMultipleAudio && (
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white">A</span>
                  <span>Ses</span>
                </div>
              )}
              {media.type === 'live' ? (
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white">▲ / ▼</span>
                  <span>Zapping</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white">◀ / ▶</span>
                  <span>10s İleri/Geri</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Timeline for Movies & Series */}
          {media.type !== 'live' && duration > 0 && (
            <div className="flex items-center gap-3 w-full pt-2">
              <span className="text-xs font-mono text-slate-400 w-16 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={handleSeekChange}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
              />
              <span className="text-xs font-mono text-slate-400 w-16">
                {formatTime(duration)}
              </span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              {onPrevious && (
                <button
                  onClick={onPrevious}
                  title="Önceki"
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              )}

              {media.type !== 'live' && (
                <button
                  onClick={() => seekRelative(-10)}
                  title="10 saniye geri"
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={togglePlay}
                title="Oynat / Duraklat (Boşluk)"
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/30"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              {media.type !== 'live' && (
                <button
                  onClick={() => seekRelative(10)}
                  title="10 saniye ileri"
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              )}

              {onNext && (
                <button
                  onClick={onNext}
                  title="Sonraki"
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Audio, Subtitles, Volume & Aspect Ratio Controls */}
            <div className="flex items-center gap-2">
              {/* Audio Track Selector Button - ONLY if multiple audio tracks exist */}
              {hasMultipleAudio && (
                <button
                  onClick={() => {
                    setActiveTrackTab('audio');
                    setFocusedTrackIndex(0);
                    setIsTracksModalOpen((prev) => (activeTrackTab === 'audio' ? !prev : true));
                  }}
                  title="Ses Dili Seç (Kısayol: A)"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                    isTracksModalOpen && activeTrackTab === 'audio'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  <span className="hidden sm:inline">Ses</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px]">
                    {audioTracks.length}
                  </span>
                </button>
              )}

              {/* Subtitle Selector Button - ONLY if subtitle tracks exist */}
              {hasSubtitles && (
                <button
                  onClick={() => {
                    setActiveTrackTab('subtitles');
                    setFocusedTrackIndex(0);
                    setIsTracksModalOpen((prev) => (activeTrackTab === 'subtitles' ? !prev : true));
                  }}
                  title="Altyazı Seç (Kısayol: S)"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                    isTracksModalOpen && activeTrackTab === 'subtitles'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : currentSubtitleTrack >= 0
                      ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
                  }`}
                >
                  <Subtitles className="w-4 h-4" />
                  <span className="hidden sm:inline">Altyazı</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px]">
                    {subtitleTracks.length}
                  </span>
                </button>
              )}

              <button
                onClick={toggleMute}
                title="Sesi Aç / Kapat"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleAspectRatio}
                title={`Ekran Oranı: ${aspectRatio === 'contain' ? 'Sığdır' : 'Doldur'}`}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
