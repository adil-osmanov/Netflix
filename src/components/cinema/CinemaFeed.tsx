'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MovieCard } from './MovieCard';
import { CinemaFilters } from './CinemaFilters';
import { MovieModal } from './MovieModal';
import { RotateCw } from 'lucide-react';

const MAIN_TABS = [
  { id: 'trending', label: 'В тренде' },
  { id: 'movies', label: 'Фильмы' },
  { id: 'series', label: 'Сериалы' },
  { id: 'cartoons', label: 'Мультфильмы' },
];

const MOVIE_GENRES = [
  { id: 'all', label: 'Все жанры' },
  { id: '28', label: 'Боевики' },
  { id: '878', label: 'Фантастика' },
  { id: '18', label: 'Драмы' },
  { id: '27', label: 'Ужасы' },
  { id: '35', label: 'Комедии' },
  { id: '80', label: 'Криминал' },
];

const TV_GENRES = [
  { id: 'all', label: 'Все сериалы' },
  { id: '18', label: 'Драмы' },
  { id: '10765', label: 'Фантастика' },
  { id: '80', label: 'Детективы' },
  { id: '35', label: 'Комедии' },
];

const CARTOON_GENRES = [
  { id: 'all', label: 'Все мультфильмы' },
  { id: 'family', label: 'Семейные' },
  { id: 'anime', label: 'Аниме' },
];

export interface CinemaFeedProps {
  searchQuery?: string;
}

export function CinemaFeed({ searchQuery }: CinemaFeedProps) {
  const [activeTab, setActiveTab] = useState('trending');
  const [activeGenre, setActiveGenre] = useState('all');

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Фильтры
  const [yearRange, setYearRange] = useState<[number, number]>([1990, 2026]);
  const [minRating, setMinRating] = useState(6.0);

  // Модалка
  const [selectedMovie, setSelectedMovie] = useState<any>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Загрузка ленты (поддерживает refresh=true)
  const fetchMovies = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsInitialLoading(true);

    setPage(1);
    try {
      const res = await fetch(
        `/api/movies?tab=${activeTab}&genre=${activeGenre}&page=1&refresh=${refresh}&yearGte=${yearRange[0]}&yearLte=${yearRange[1]}&minRating=${minRating}&query=${encodeURIComponent(
          searchQuery || ''
        )}`
      );
      const data = await res.json();
      setItems(data.items || []);
      setHasMore((data.page || 1) < (data.totalPages || 1));
    } catch (e) {
      console.error('Error fetching movies:', e);
      setItems([]);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, activeGenre, yearRange, minRating, searchQuery]);

  // Подгрузка следующих страниц (бесконечный скролл)
  const loadMoreMovies = useCallback(async () => {
    if (isLoadingMore || !hasMore || isInitialLoading || isRefreshing) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const res = await fetch(
        `/api/movies?tab=${activeTab}&genre=${activeGenre}&page=${nextPage}&yearGte=${yearRange[0]}&yearLte=${yearRange[1]}&minRating=${minRating}&query=${encodeURIComponent(
          searchQuery || ''
        )}`
      );
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setItems((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newUnique = data.items.filter((m: any) => !existingIds.has(m.id));
          return [...prev, ...newUnique];
        });
        setPage(nextPage);
        setHasMore(nextPage < (data.totalPages || 100));
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error('Error loading more movies:', e);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, isInitialLoading, isRefreshing, page, activeTab, activeGenre, yearRange, minRating, searchQuery]);

  useEffect(() => {
    fetchMovies(false);
  }, [fetchMovies]);

  // Триггер бесконечного скролла
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreMovies();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreMovies]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setActiveGenre('all');
  };

  let currentGenres: { id: string; label: string }[] = [];
  if (activeTab === 'movies') currentGenres = MOVIE_GENRES;
  if (activeTab === 'series') currentGenres = TV_GENRES;
  if (activeTab === 'cartoons') currentGenres = CARTOON_GENRES;

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Верхний бар: Вкладки + Кнопка обновления + Фильтры */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        {/* Вкладки категорий */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer outline-none select-none ${
                  isActive
                    ? 'bg-white text-black shadow-lg shadow-white/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Правая часть: кнопка обновить + фильтры */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchMovies(true)}
            disabled={isRefreshing}
            className="p-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all disabled:opacity-50 cursor-pointer"
            title="Обновить рекомендации"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
          </button>

          <CinemaFilters
            minRating={minRating}
            onRatingChange={setMinRating}
            yearRange={yearRange}
            onYearChange={setYearRange}
            onReset={() => {
              setYearRange([1990, 2026]);
              setMinRating(6.0);
            }}
          />
        </div>
      </div>

      {/* Под-жанры */}
      {currentGenres.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {currentGenres.map((g) => {
            const isGenreActive = activeGenre === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGenre(g.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-150 cursor-pointer outline-none select-none ${
                  isGenreActive
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Сетка фильмов */}
      {isInitialLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] w-full rounded-md bg-zinc-900/60 animate-pulse border border-zinc-800/40"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-2">
            {items.map((movie) => (
              <MovieCard
                key={`${movie.media_type || 'm'}-${movie.id}`}
                movie={movie}
                onSelect={() => setSelectedMovie(movie)}
              />
            ))}
          </div>

          <div ref={observerTarget} className="w-full flex justify-center py-8">
            {isLoadingMore && (
              <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-600 rounded-full animate-spin" />
            )}
          </div>
        </>
      ) : (
        <div className="py-24 text-center text-xs text-zinc-500">
          Контент по выбранным параметрам не найден.
        </div>
      )}

      {selectedMovie && (
        <MovieModal item={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
}

export default CinemaFeed;
