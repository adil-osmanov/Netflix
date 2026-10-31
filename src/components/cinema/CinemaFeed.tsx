'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MovieCard } from './MovieCard';
import { CinemaFilters } from './CinemaFilters';
import { MovieModal } from './MovieModal';
import { Search } from 'lucide-react';

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

interface CinemaFeedProps {
  searchQuery?: string;
}

export function CinemaFeed({ searchQuery: propSearchQuery }: CinemaFeedProps) {
  const [activeTab, setActiveTab] = useState('trending');
  const [activeGenre, setActiveGenre] = useState('all');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Поисковый запрос
  const [searchQuery, setSearchQuery] = useState(propSearchQuery || '');
  const [activeQuery, setActiveQuery] = useState(propSearchQuery || '');

  // Фильтры диапазона года и рейтинга
  const [yearRange, setYearRange] = useState<[number, number]>([1990, 2026]);
  const [minRating, setMinRating] = useState(6.0);

  // Открытие фильма в полноэкранном плеере
  const [selectedMovie, setSelectedMovie] = useState<any>(null);

  // Сброс под-жанра при переключении главной вкладки
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setActiveGenre('all');
    if (activeQuery) {
      setSearchQuery('');
      setActiveQuery('');
    }
  };

  const loadMovies = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = activeQuery.trim();
      const endpoint = q
        ? `/api/movies?query=${encodeURIComponent(q)}&page=1`
        : `/api/movies?tab=${activeTab}&genre=${activeGenre}&yearGte=${yearRange[0]}&yearLte=${yearRange[1]}&minRating=${minRating}`;

      const res = await fetch(endpoint);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error('Failed to load movies:', e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, activeGenre, yearRange, minRating, activeQuery]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveQuery('');
  };

  // Выбор списка под-жанров
  let currentGenres: { id: string; label: string }[] = [];
  if (activeTab === 'movies') currentGenres = MOVIE_GENRES;
  if (activeTab === 'series') currentGenres = TV_GENRES;
  if (activeTab === 'cartoons') currentGenres = CARTOON_GENRES;

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Верхний бар: 4 главные вкладки + поиск + кнопка фильтра */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        {/* Главные вкладки */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id && !activeQuery;
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

        {/* Поиск и фильтры */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative w-40 sm:w-52 md:w-60">
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

          {/* Регулятор фильтров с ползунками */}
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

      {/* Второй уровень: аккуратная строка под-жанров */}
      {!activeQuery && currentGenres.length > 0 && (
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

      {/* Вертикальная сетка 2:3 */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] w-full rounded-md bg-zinc-900/60 animate-pulse border border-zinc-800/40"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-2">
          {items.map((movie) => (
            <MovieCard
              key={`${movie.media_type || 'm'}-${movie.id}`}
              movie={movie}
              onSelect={() => setSelectedMovie(movie)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-xs text-zinc-500">
          Фильмы по выбранным критериям не найдены.
        </div>
      )}

      {/* Полноэкранный плеер */}
      {selectedMovie && (
        <MovieModal item={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  );
}

export default CinemaFeed;
