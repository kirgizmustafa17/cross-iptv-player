import React, { useEffect, useRef } from 'react';
import type { Category, FocusSection, MainTab } from '../types/iptv';
import { ListFilter, Star, Film, Radio, Clapperboard } from 'lucide-react';

interface SidebarProps {
  activeTab: MainTab;
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  focusedIndex: number;
  currentSection: FocusSection;
  favoritesCount: number;
  totalChannelsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  categories,
  selectedCategoryId,
  onSelectCategory,
  focusedIndex,
  currentSection,
  favoritesCount,
  totalChannelsCount,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isSectionFocused = currentSection === 'sidebar';

  // Build complete categories list with virtual categories (Favorites, All)
  const fullCategories: Array<{ id: string; name: string; count?: number; isSpecial?: boolean }> = [
    ...(activeTab === 'live'
      ? [{ id: 'favorites', name: 'Favoriler', count: favoritesCount, isSpecial: true }]
      : []),
    { id: 'all', name: 'Tüm İçerikler', count: totalChannelsCount, isSpecial: true },
    ...categories.map((c) => ({
      id: c.category_id,
      name: c.category_name,
      count: c.stream_count,
    })),
  ];

  // Auto-scroll the focused category into view smoothly
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

  const titleText =
    activeTab === 'live'
      ? 'TV KANALLARI'
      : activeTab === 'movies'
      ? 'FİLM GRUPLARI'
      : 'DİZİ GRUPLARI';

  return (
    <aside className="w-72 md:w-80 h-[calc(100vh-5rem)] bg-slate-900/70 border-r border-slate-800 flex flex-col flex-shrink-0 select-none">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <ListFilter className="w-4 h-4 text-blue-400" />
          <span>{titleText}</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {fullCategories.length} Grup
        </span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1.5"
      >
        {fullCategories.map((cat, idx) => {
          const isSelected = selectedCategoryId === cat.id;
          const isFocused = isSectionFocused && focusedIndex === idx;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between text-sm transition-all tv-focusable ${
                isSelected
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-medium'
                  : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
              } ${isFocused ? 'tv-focused bg-blue-600 text-white font-semibold' : ''}`}
            >
              <div className="flex items-center gap-3 truncate">
                {cat.id === 'favorites' ? (
                  <Star className={`w-4 h-4 flex-shrink-0 ${isFocused ? 'text-amber-300 fill-amber-300' : 'text-amber-400'}`} />
                ) : activeTab === 'movies' ? (
                  <Film className={`w-4 h-4 flex-shrink-0 ${isFocused ? 'text-white' : 'text-purple-400'}`} />
                ) : activeTab === 'series' ? (
                  <Clapperboard className={`w-4 h-4 flex-shrink-0 ${isFocused ? 'text-white' : 'text-pink-400'}`} />
                ) : (
                  <Radio className={`w-4 h-4 flex-shrink-0 ${isFocused ? 'text-white' : 'text-blue-400'}`} />
                )}
                <span className="truncate">{cat.name}</span>
              </div>

              {cat.count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                    isFocused
                      ? 'bg-blue-700/60 text-white'
                      : isSelected
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
