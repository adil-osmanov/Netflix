'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CinemaRow } from './CinemaRow';
import { CinemaLandscapeCard } from './CinemaLandscapeCard';
import { CinemaFilters } from './CinemaFilters';
import { MovieModal } from './MovieModal';
import { Search, RotateCw, Film } from 'lucide-react';

const MAIN_TABS = [
  { id: 'trending', label: 'В тренде' },
  { id: 'movies', label: 'Фильмы' },
  { id: 'series', label: 'Сериалы' },
  { id: 'cartoons', label: 'Мультфильмы' },
];

export function CinemaFeed() {
  const [activeTab, setActiveTab] = useState('trending');
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Фильтры с ползунками
  const [yearRange, setYearRange] = useState<[number, number]>([1990, 2026]);
  const [minRating, setMinRating] = useState(6.0);

  // Выбранный фильм для полноэкранного In-App плеера
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const activeRequestIdRef = useRef<number>(0);

  const fetchSections = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/movies/sections?tab=${activeTab}&yearGte=${yearRange[0]}&yearLte=${yearRange[1]}&minRating=${minRating}`
      );
      if (!res.ok) throw new Error('Ошибка загрузки секций');
      const data = await res.json();
      if (requestId !== activeRequestIdRef.current) return;
      setSections(data.sections || []);
    } catch (e) {
      if (requestId === activeRequestIdRef.current) {
        console.error('Failed to fetch sections:', e);
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeTab, yearRange, minRating]);

  // Загрузка каруселей при смене вкладки или фильтров
  useEffect(() => {
    if (!activeQuery) {
      fetchSections();
    }
  }, [activeQuery, fetchSections]);

  // Поиск по TMDB
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setActiveQuery('');
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/movies?query=${encodeURIComponent(query.trim())}&page=1`);
      const data = await res.json();
      setSearchResults(data.items || []);
    } catch (e) {
      console.error('Search error:', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchQuery);
    handleSearch(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveQuery('');
    setSearchResults([]);
  };

  const handleResetFilters = () => {
    setYearRange([1990, 2026]);
    setMinRating(6.0);
  };

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Верхняя строка: Вкладки, поиск и фильтры в стиле Netflix */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        {/* Кнопки вкладок */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id && !activeQuery;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (activeQuery) handleClearSearch();
                  setActiveTab(tab.id);
                }}
                className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer outline-none select-none ${
                  isActive
                    ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Правая часть: поиск, кнопка обновления и ползунки фильтра */}
        <div className="flex items-center gap-2">
          {/* Поле поиска */}
          <form onSubmit={handleSearchSubmit} className="relative w-44 sm:w-56 md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder=""
              className="w-full pl-8 pr-7 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1.5 text-xs text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </form>

          {/* Обновить */}
          <button
            type="button"
            onClick={fetchSections}
            disabled={isLoading}
            className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 outline-none transition-colors disabled:opacity-40 cursor-pointer shadow"
            title="Обновить карусели"
          >
            <RotateCw className={`w-3.5 h-3.5 text-red-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Кнопка фильтра с ползунками */}
          <CinemaFilters
            minRating={minRating}
            onRatingChange={setMinRating}
            yearRange={yearRange}
            onYearChange={setYearRange}
            onReset={handleResetFilters}
          />
        </div>
      </div>

      {/* Режим результатов поиска */}
      {activeQuery ? (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              Результаты поиска: &ldquo;{activeQuery}&rdquo;
            </h2>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs text-red-500 hover:underline cursor-pointer"
            >
              Сбросить поиск
            </button>
          </div>

          {isSearching ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-video bg-zinc-900 rounded-md animate-pulse" />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Film className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">Ничего не найдено по вашему запросу</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
              {searchResults.map((item) => (
                <CinemaLandscapeCard
                  key={`${item.media_type}-${item.id}`}
                  item={{
                    ...item,
                    backdrop: item.backdrop || item.poster,
                  }}
                  onSelect={() => setSelectedItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Горизонтальные карусели по жанрам */
        <>
          {isLoading ? (
            <div className="space-y-6 pt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-40 bg-zinc-900 rounded animate-pulse" />
                  <div className="flex gap-3 overflow-hidden">
                    {[1, 2, 3, 4].map((j) => (
                      <div
                        key={j}
                        className="h-36 w-64 bg-zinc-900 rounded-md animate-pulse flex-none"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {sections.map((section) => (
                <CinemaRow
                  key={section.id}
                  title={section.title}
                  items={section.items}
                  onSelectItem={setSelectedItem}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Полноэкранный плеер */}
      {selectedItem && (
        <MovieModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

export default CinemaFeed;
