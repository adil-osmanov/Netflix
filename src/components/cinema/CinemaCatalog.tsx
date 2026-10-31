'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MovieCard } from './MovieCard';
import { MovieModal, CinemaItem } from './MovieModal';
import { CinemaCategories } from './CinemaCategories';
import { Film, RotateCw, Search } from 'lucide-react';

export function CinemaCatalog() {
  const [items, setItems] = useState<CinemaItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('trending');
  const [yearRange, setYearRange] = useState<[number, number]>([1990, 2026]);
  const [minRating, setMinRating] = useState<number>(6.0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [selectedMovie, setSelectedMovie] = useState<CinemaItem | null>(null);

  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Сброс фильтров в значения по умолчанию
  const handleResetFilters = useCallback(() => {
    setYearRange([1990, 2026]);
    setMinRating(6.0);
  }, []);

  // Загрузка первой страницы при смене категории, диапазона лет, рейтинга или поиска
  const fetchInitialMovies = useCallback(
    async (cat: string, query: string, yrs: [number, number], rating: number) => {
      const requestId = ++activeRequestIdRef.current;
      setIsLoading(true);
      setPage(1);
      setHasMore(true);

      try {
        const q = query.trim();
        const endpoint = q
          ? `/api/movies?query=${encodeURIComponent(q)}&page=1`
          : `/api/movies?category=${cat}&yearGte=${yrs[0]}&yearLte=${yrs[1]}&minRating=${rating}&page=1`;

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Ошибка загрузки');

        const data = await res.json();
        if (requestId !== activeRequestIdRef.current) return;

        const newItems: CinemaItem[] = data.items || [];
        setItems(newItems);
        setHasMore(newItems.length > 0 && 1 < (data.totalPages || 1));
      } catch (err) {
        if (requestId === activeRequestIdRef.current) {
          console.error('Failed to load initial movies:', err);
          setHasMore(false);
        }
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  // Первоначальная загрузка и смена фильтров/запроса
  useEffect(() => {
    fetchInitialMovies(selectedCategory, activeQuery, yearRange, minRating);
  }, [selectedCategory, activeQuery, yearRange, minRating, fetchInitialMovies]);

  // Подгрузка следующей страницы (Infinite Scroll)
  const loadMore = useCallback(async () => {
    if (isLoading || isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);

    const nextPage = page + 1;
    try {
      const q = activeQuery.trim();
      const endpoint = q
        ? `/api/movies?query=${encodeURIComponent(q)}&page=${nextPage}`
        : `/api/movies?category=${selectedCategory}&yearGte=${yearRange[0]}&yearLte=${yearRange[1]}&minRating=${minRating}&page=${nextPage}`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Ошибка загрузки следующей страницы');

      const data = await res.json();
      const newItems: CinemaItem[] = data.items || [];

      if (newItems.length > 0) {
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const uniqueItems = newItems.filter((i) => !existingIds.has(i.id));
          return [...prev, ...uniqueItems];
        });
        setPage(nextPage);
        setHasMore(nextPage < (data.totalPages || 1));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more movies:', err);
      setHasMore(false);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isLoading, isFetchingMore, hasMore, page, activeQuery, selectedCategory, yearRange, minRating]);

  // Наблюдатель IntersectionObserver для бесконечной ленты
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isFetchingMore, loadMore]);

  // Обработчик отправки поиска
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchQuery);
  };

  // Очистка поиска
  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveQuery('');
  };

  // Смена категории
  const handleCategorySelect = (catId: string) => {
    if (catId === selectedCategory && !activeQuery) return;
    setSearchQuery('');
    setActiveQuery('');
    setSelectedCategory(catId);
  };

  // Обновление ленты с рандомизацией и Smart Shuffle
  const refreshFeed = async () => {
    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);
    try {
      const q = activeQuery.trim();
      const endpoint = q
        ? `/api/movies?query=${encodeURIComponent(q)}&refresh=true&page=1`
        : `/api/movies?category=${selectedCategory}&yearGte=${yearRange[0]}&yearLte=${yearRange[1]}&minRating=${minRating}&refresh=true`;

      const res = await fetch(endpoint);
      const data = await res.json();
      if (requestId !== activeRequestIdRef.current) return;

      if (data.items) {
        setItems(data.items);
        setPage(1);
        setHasMore(data.items.length > 0 && 1 < (data.totalPages || 1));
      }
    } catch (err) {
      if (requestId === activeRequestIdRef.current) {
        console.error('Failed to refresh feed:', err);
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="w-full">
      {/* Верхняя строка управления: Поиск и кнопка обновления */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder=""
            className="w-full pl-9 pr-7 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-white focus:outline-none focus:border-red-600 transition-colors"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-2 text-xs text-zinc-500 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={refreshFeed}
          disabled={isLoading}
          className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 outline-none transition-colors disabled:opacity-40 cursor-pointer shadow"
          title="Обновить каталог"
        >
          <RotateCw className={`w-4 h-4 text-red-500 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Полоса категорий Cinema и фильтров (скрывается во время активного поиска) */}
      {!activeQuery && (
        <CinemaCategories
          selected={selectedCategory}
          onSelect={handleCategorySelect}
          yearRange={yearRange}
          onYearChange={setYearRange}
          minRating={minRating}
          onRatingChange={setMinRating}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* Скелетоны во время первой загрузки */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 animate-pulse">
              <div className="aspect-[2/3] w-full rounded-md bg-zinc-800/60" />
              <div className="w-4/5 h-3 rounded bg-zinc-800/80 mt-1" />
              <div className="w-1/3 h-2.5 rounded bg-zinc-800/50" />
            </div>
          ))}
        </div>
      )}

      {/* Пустое состояние */}
      {!isLoading && items.length === 0 && (
        <div className="py-24 text-center space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Ничего не найдено</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {activeQuery
              ? `По запросу "${activeQuery}" ничего не найдено. Попробуйте ввести другое название.`
              : 'Фильмы временно недоступны. Попробуйте изменить фильтры или нажмите ↻.'}
          </p>
        </div>
      )}

      {/* Сетка фильмов и сериалов */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4">
          {items.map((item) => (
            <MovieCard
              key={`${item.media_type}-${item.id}`}
              item={item}
              onSelect={() => setSelectedMovie(item)}
            />
          ))}
        </div>
      )}

      {/* Доводчик пагинации (Infinite Scroll) */}
      {hasMore && items.length > 0 && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-red-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Встроенное модальное окно с плеером */}
      {selectedMovie && (
        <MovieModal
          item={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  );
}

export default CinemaCatalog;
