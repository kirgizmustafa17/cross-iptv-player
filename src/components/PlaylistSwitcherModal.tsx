import React, { useState, useEffect } from 'react';
import type { StoredPlaylist } from '../services/device';
import { Layers, Check, Server, Link, PlusCircle, X } from 'lucide-react';

interface PlaylistSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: StoredPlaylist[];
  activePlaylistId?: string;
  deviceId: string;
  onSelectPlaylist: (playlist: StoredPlaylist) => void;
  onOpenManualEntry: () => void;
}

export const PlaylistSwitcherModal: React.FC<PlaylistSwitcherModalProps> = ({
  isOpen,
  onClose,
  playlists,
  activePlaylistId,
  deviceId,
  onSelectPlaylist,
  onOpenManualEntry,
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    // Reset focused index to active item if found
    const activeIdx = playlists.findIndex((p) => p.id === activePlaylistId || p.isActive);
    if (activeIdx >= 0) {
      setFocusedIndex(activeIdx);
    } else {
      setFocusedIndex(0);
    }
  }, [isOpen, playlists, activePlaylistId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const totalItems = playlists.length + 2; // +1 for "Manuel Ekle", +1 for "Kapat"

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex < playlists.length) {
          onSelectPlaylist(playlists[focusedIndex]);
          onClose();
        } else if (focusedIndex === playlists.length) {
          onOpenManualEntry();
        } else {
          onClose();
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 10009 || e.keyCode === 461) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, playlists, onSelectPlaylist, onOpenManualEntry, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none font-sans">
      <div className="w-full max-w-xl bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Oynatma Listesi Seç</h2>
              <p className="text-xs text-slate-400">
                Cihaz ID: <span className="font-mono text-amber-400 font-semibold">{deviceId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-2.5">
          {playlists.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Layers className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">Henüz kayıtlı liste yok</p>
              <p className="text-xs text-slate-500 mt-1">Web portalından Device ID ile liste ekleyebilirsiniz.</p>
            </div>
          ) : (
            playlists.map((pl, idx) => {
              const isSelected = pl.id === activePlaylistId || pl.isActive;
              const isFocused = focusedIndex === idx;
              const isXtream = pl.type === 'xtream';

              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    setFocusedIndex(idx);
                    onSelectPlaylist(pl);
                    onClose();
                  }}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isFocused
                      ? 'border-amber-400 bg-slate-800/95 scale-101 shadow-lg shadow-amber-400/15 ring-2 ring-amber-400/30'
                      : isSelected
                      ? 'border-amber-400/50 bg-slate-900/90'
                      : 'border-slate-800/90 bg-slate-950/60 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isXtream
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                          : 'bg-blue-400/10 text-blue-400 border border-blue-400/20'
                      }`}
                    >
                      {isXtream ? <Server className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">{pl.name}</span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {isXtream ? 'Xtream' : 'M3U'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
                        {isXtream ? `${pl.username || 'user'} @ ${pl.serverUrl || ''}` : pl.m3uUrl || ''}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-black uppercase flex-shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Aktif</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action Row */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center gap-3">
          <button
            onClick={() => {
              setFocusedIndex(playlists.length);
              onOpenManualEntry();
            }}
            onMouseEnter={() => setFocusedIndex(playlists.length)}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              focusedIndex === playlists.length
                ? 'border-blue-400 bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manuel Giriş Yap</span>
          </button>

          <button
            onClick={onClose}
            onMouseEnter={() => setFocusedIndex(playlists.length + 1)}
            className={`py-3 px-6 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              focusedIndex === playlists.length + 1
                ? 'border-amber-400 bg-amber-400 text-slate-950 font-black'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
