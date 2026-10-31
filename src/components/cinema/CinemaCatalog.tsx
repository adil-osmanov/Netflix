'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MovieCard, Movie } from './MovieCard';
import { MovieModal } from './MovieModal';
import { Film, RotateCw, Search } from 'lucide-react';

export function CinemaCatalog() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const fetchMovies = useCallback(async (query: string = '') => {
    setIsLoading(true);
    try {
      const url = query.trim()
        ? `/api/movies?query=${encodeURIComponent(query.trim())}`
        : '/api/movies';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMovies(data.movies || []);
      }
    } catch (err) {
      console.error('Failed to load movies:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies('');
  }, [fetchMovies]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchQuery);
    fetchMovies(searchQuery);
  };

  const handleRefresh = () => {
    setSearchQuery('');
    setActiveQuery('');
    fetchMovies('');
  };

  return (
    <div className="w-full">
      {/* Верхняя строка управления: Поиск и обновление */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск фильмов на английском (напр. Inception, Dune)..."
            className="w-full pl-9 pr-7 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-colors"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveQuery('');
                fetchMovies('');
              }}
              className="absolute right-3 top-2 text-xs text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </form>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 outline-none transition-colors disabled:opacity-40 cursor-pointer shadow"
          title="Обновить каталог"
        >
          <RotateCw className={`w-4 h-4 text-red-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Скелетон во время загрузки */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 animate-pulse">
              <div className="aspect-[2/3] w-full rounded-md bg-zinc-800/60" />
              <div className="w-4/5 h-3 rounded bg-zinc-800/80 mt-1" />
              <div className="w-1/3 h-2.5 rounded bg-zinc-800/50" />
            </div>
          ))}
        </div>
      )}

      {/* Пустое состояние */}
      {!isLoading && movies.length === 0 && (
        <div className="py-24 text-center space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Фильмы не найдены</h3>
          <p className="text-xs text-zinc-400">
            {activeQuery
              ? `По запросу "${activeQuery}" ничего не найдено. Попробуйте изменить название.`
              : 'Каталог временно недоступен. Нажмите ↻ для повторной попытки.'}
          </p>
        </div>
      )}

      {/* Сетка фильмов */}
      {!isLoading && movies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onSelect={() => setSelectedMovie(movie)}
            />
          ))}
        </div>
      )}

      {/* Модальное окно просмотра / выбора плеера */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  );
}

export default CinemaCatalog;
