"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Search, 
  X, 
  Loader2, 
  Play, 
  Film, 
  Tv, 
  Compass, 
  Bookmark, 
  RotateCw,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useYouTube } from "@/context/YouTubeContext";

export interface MediathekMediaItem {
  id: string;
  title: string;
  topic: string;
  channel: string;
  duration: number; // in minutes
  url_website: string;
  posterUrl: string;
  thumbnailUrl?: string;
  level: "B1" | "B2";
  date: string;
}

export type CategoryType = "all" | "films" | "docs" | "series";
export type LevelType = "ALL" | "B1" | "B2";

const CATEGORIES: { id: CategoryType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all", label: "Все", icon: Sparkles },
  { id: "films", label: "Фильмы", icon: Film },
  { id: "docs", label: "Документальные фильмы", icon: Compass },
  { id: "series", label: "Сериалы", icon: Tv },
];

const LEVELS: { id: LevelType; label: string; desc: string }[] = [
  { id: "ALL", label: "Все уровни", desc: "B1 и B2" },
  { id: "B1", label: "B1", desc: "Средний темп, понятная речь" },
  { id: "B2", label: "B2", desc: "Естественная речь, фильмы" },
];

export default function MediathekCatalog() {
  const { isFavorite, toggleFavorite } = useYouTube();

  const [items, setItems] = useState<MediathekMediaItem[]>([]);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  const [category, setCategory] = useState<CategoryType>("all");
  const [level, setLevel] = useState<LevelType>("ALL");
  const [searchInput, setSearchInput] = useState<string>("");
  const [activeQuery, setActiveQuery] = useState<string>("");

  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeRequestIdRef = useRef<number>(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Мгновенный запрос медиа-элементов
  const fetchMediaItems = useCallback(
    async ({
      newCategory,
      newLevel,
      newQuery,
      newOffset = 0,
      reset = false,
    }: {
      newCategory?: CategoryType;
      newLevel?: LevelType;
      newQuery?: string;
      newOffset?: number;
      reset?: boolean;
    } = {}) => {
      const catToUse = newCategory !== undefined ? newCategory : category;
      const lvlToUse = newLevel !== undefined ? newLevel : level;
      const queryToUse = newQuery !== undefined ? newQuery : activeQuery;

      const requestId = ++activeRequestIdRef.current;

      if (reset) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await fetch("/api/mediathek", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offset: newOffset,
            size: 28,
            category: catToUse,
            level: lvlToUse,
            query: queryToUse,
          }),
        });

        if (!res.ok) {
          throw new Error(`Ошибка загрузки: ${res.status}`);
        }

        const data = await res.json();
        if (requestId !== activeRequestIdRef.current) return;

        const newItems: MediathekMediaItem[] = (data.items || []).filter(
          (it: MediathekMediaItem) => Boolean(it.posterUrl || it.thumbnailUrl)
        );

        setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
        setHasMore(Boolean(data.hasMore && newItems.length > 0));
        setOffset(newOffset + 45);
      } catch (err: any) {
        if (requestId === activeRequestIdRef.current) {
          console.error("Error loading Mediathek items:", err);
          setError("Не удалось связаться с медиатекой. Проверьте интернет или повторите запрос.");
        }
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [category, level, activeQuery]
  );

  // Первоначальная загрузка
  useEffect(() => {
    fetchMediaItems({ newCategory: "all", newLevel: "ALL", newOffset: 0, reset: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Мгновенная реакция при смене категории
  const handleCategoryChange = (newCat: CategoryType) => {
    if (newCat === category) return;
    setCategory(newCat);
    setItems([]);
    setBrokenIds(new Set());
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newCategory: newCat, newOffset: 0, reset: true });
  };

  // Мгновенная реакция при смене уровня
  const handleLevelChange = (newLevel: LevelType) => {
    if (newLevel === level) return;
    setLevel(newLevel);
    setItems([]);
    setBrokenIds(new Set());
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newLevel, newOffset: 0, reset: true });
  };

  // Принудительное обновление
  const handleRefresh = () => {
    setItems([]);
    setBrokenIds(new Set());
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newOffset: 0, reset: true });
  };

  // Поиск
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setActiveQuery(trimmed);
    setItems([]);
    setBrokenIds(new Set());
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newQuery: trimmed, newOffset: 0, reset: true });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveQuery("");
    setItems([]);
    setBrokenIds(new Set());
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newQuery: "", newOffset: 0, reset: true });
  };

  // Infinite scroll observer
  useEffect(() => {
    if (isLoading || isLoadingMore || !hasMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchMediaItems({ newOffset: offset, reset: false });
        }
      },
      { rootMargin: "300px" }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchMediaItems, hasMore, isLoading, isLoadingMore, offset]);

  const handleCardClick = (url: string) => {
    window.location.href = url;
  };

  const handleToggleFavorite = (e: React.MouseEvent, item: MediathekMediaItem) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite({
      id: item.url_website,
      title: item.title,
      channel: item.channel,
      level: item.level,
      thumbnailUrl: item.posterUrl || item.thumbnailUrl || "",
      description: item.topic,
      durationText: `${item.duration} мин`,
    });
  };

  // Устранение дублей серий и пустых обложек
  const seenTitles = new Set<string>();
  const displayedItems = items
    .filter((it) => (it.posterUrl || it.thumbnailUrl) && !brokenIds.has(it.id))
    .filter((item) => {
      const clean = item.title
        .replace(/\s*\(S\d+.*\)/gi, "")
        .replace(/\s*\(Folge\s*\d+.*\)/gi, "")
        .replace(/\s*\(Teil\s*\d+.*\)/gi, "")
        .trim()
        .toLowerCase();
      if (seenTitles.has(clean)) return false;
      seenTitles.add(clean);
      return true;
    });

  return (
    <div className="w-full">
      {/* Поисковая строка для медиатек */}
      <div className="max-w-3xl mx-auto mb-6">
        <form
          onSubmit={handleSearchSubmit}
          className="relative bg-zinc-900/90 border border-zinc-800 rounded-full px-4 py-2.5 flex items-center gap-2.5 focus-within:border-zinc-500 transition-all shadow-xl"
        >
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Поиск по архивам ARD, ZDF, 3sat, Arte (например: Terra X, Natur, Berlin)..."
            className="bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none w-full"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="hidden sm:inline-block px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-colors cursor-pointer shadow"
          >
            Найти
          </button>
        </form>
      </div>

      {/* Панель фильтров: Категории и Уровни */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          {/* Строгий список категорий: [ Все ] [ Фильмы ] [ Документальные фильмы ] [ Сериалы ] + ↻ */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-red-600 text-white font-semibold shadow-lg shadow-red-950/40"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}

            {/* Кнопка обновления ↻ */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer shadow"
              title="Обновить ленту"
            >
              <RotateCw className={`w-4 h-4 text-red-500 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Переключатель уровня (B1 / B2) */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-full border border-zinc-800">
            {LEVELS.map((lvl) => {
              const isActive = level === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => handleLevelChange(lvl.id)}
                  title={lvl.desc}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-black shadow font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-zinc-900/90 border border-red-500/30 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-zinc-300">{error}</p>
          <button
            onClick={() => fetchMediaItems({ newOffset: 0, reset: true })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Повторить</span>
          </button>
        </div>
      )}

      {/* Скелетон во время загрузки первой пачки */}
      {isLoading && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 animate-pulse">
              <div className="aspect-video w-full rounded-xl bg-zinc-800/60" />
              <div className="w-4/5 h-4 rounded bg-zinc-800/80 mt-1" />
              <div className="w-1/3 h-3 rounded bg-zinc-800/50" />
            </div>
          ))}
        </div>
      )}

      {/* Пустое состояние */}
      {!isLoading && !error && displayedItems.length === 0 && (
        <div className="max-w-md mx-auto my-16 text-center space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Передачи не найдены</h3>
          <p className="text-xs text-zinc-400">
            Попробуйте выбрать другую категорию или обновить ленту.
          </p>
        </div>
      )}

      {/* Сетка карточек медиатеки */}
      {!isLoading && displayedItems.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {displayedItems.map((item) => {
            const isFav = isFavorite(item.url_website) || isFavorite(item.id);

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick(item.url_website)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(item.url_website);
                  }
                }}
                className="group relative flex flex-col cursor-pointer text-left select-none"
              >
                {/* 1. Превью 16:9 с наложением */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
                  <img
                    src={item.posterUrl || item.thumbnailUrl}
                    alt={item.title}
                    onError={() => {
                      setBrokenIds((prev) => new Set(prev).add(item.id));
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Бейдж канала (ZDF / ARD / Arte) */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-md">
                    {item.channel}
                  </span>

                  {/* Бейдж B1 / B2 */}
                  <span
                    className={`absolute top-2 left-14 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-md ${
                      item.level === "B1"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                    }`}
                  >
                    {item.level}
                  </span>

                  {/* Кнопка «В избранное» */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, item)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white transition z-10 cursor-pointer backdrop-blur-md"
                    title={isFav ? "Удалить из избранного" : "Сохранить в избранное"}
                  >
                    <Bookmark
                      size={15}
                      className={
                        isFav
                          ? "fill-[#E50914] text-[#E50914] scale-110 transition-transform"
                          : "text-zinc-400 hover:text-white transition-colors"
                      }
                    />
                  </button>

                  {/* Кнопка воспроизведения по центру при наведении */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg translate-y-2 group-hover:translate-y-0">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Длительность */}
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[11px] text-white">
                    {item.duration} Min.
                  </span>
                </div>

                {/* 2. Чистое название ролика под постером */}
                <h3 className="mt-2 text-sm font-medium text-zinc-100 line-clamp-2 group-hover:text-white transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 truncate">
                  {item.channel} {item.topic ? `• ${item.topic}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Триггер бесконечной ленты */}
      <div ref={loadMoreRef} className="h-16 flex items-center justify-center my-6">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            <span>Загрузка следующих передач...</span>
          </div>
        )}
        {!hasMore && displayedItems.length > 0 && !isLoading && (
          <span className="text-xs text-zinc-600">Вы просмотрели все доступные передачи</span>
        )}
      </div>
    </div>
  );
}
