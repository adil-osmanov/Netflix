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
  Lightbulb,
  Bookmark, 
  RotateCw,
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
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  date: string;
}

export type CategoryType = "all" | "films" | "docs" | "series" | "knowledge";
export type LevelType = "ALL" | "A1" | "A2" | "B1" | "B2" | "C1";

const CATEGORIES: { id: CategoryType; label: string }[] = [
  { id: "all", label: "Рекомендации" },
  { id: "films", label: "Фильмы" },
  { id: "docs", label: "Документальное" },
  { id: "series", label: "Сериалы" },
  { id: "knowledge", label: "Познавательное" },
];

const LEVELS: { id: LevelType; label: string }[] = [
  { id: "ALL", label: "Все" },
  { id: "A1", label: "A1" },
  { id: "A2", label: "A2" },
  { id: "B1", label: "B1" },
  { id: "B2", label: "B2" },
  { id: "C1", label: "C1" },
];

function getFallbackPoster(channel: string, topic: string): string {
  const ch = channel || "ARD / ZDF";
  const bg = ch.toUpperCase().includes("ZDF")
    ? "#e05a10"
    : ch.toUpperCase().includes("ARTE")
    ? "#c82828"
    : "#003366";

  const safeChannel = ch.replace(/[<>&"']/g, "");
  const safeTopic = (topic || "Mediathek").slice(0, 35).replace(/[<>&"']/g, "");

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%2318181b"/><rect width="640" height="360" fill="${encodeURIComponent(
    bg
  )}" opacity="0.35"/><text x="40" y="80" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="28">${encodeURIComponent(
    safeChannel
  )}</text><text x="40" y="140" fill="%23e4e4e7" font-family="sans-serif" font-weight="bold" font-size="22">${encodeURIComponent(
    safeTopic
  )}</text></svg>`;
}

export default function MediathekCatalog() {
  const { isFavorite, toggleFavorite } = useYouTube();

  const [items, setItems] = useState<MediathekMediaItem[]>([]);
  const [category, setCategory] = useState<CategoryType>("all");
  const [level, setLevel] = useState<LevelType>("ALL");
  const [searchInput, setSearchInput] = useState<string>("");
  const [activeQuery, setActiveQuery] = useState<string>("");

  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const itemsRef = useRef<MediathekMediaItem[]>([]);
  itemsRef.current = items;

  const activeRequestIdRef = useRef<number>(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Дедупликация при склейке новой пачки карточек
  const handleAppend = useCallback((newItems: MediathekMediaItem[]) => {
    setItems((prev) => {
      const existingIds = new Set(prev.map((i) => (i as any).youtube_id || i.id));
      const existingUrls = new Set(prev.map((i) => i.url_website));
      const filtered = newItems.filter(
        (i) =>
          !existingIds.has((i as any).youtube_id || i.id) &&
          !existingUrls.has(i.url_website)
      );
      return [...prev, ...filtered];
    });
  }, []);

  // Запрос медиа-элементов с передачей excludeIds и защитой от кэширования
  const fetchMediaItems = useCallback(
    async ({
      newCategory,
      newLevel,
      newQuery,
      newOffset = 0,
      append = false,
    }: {
      newCategory?: CategoryType;
      newLevel?: LevelType;
      newQuery?: string;
      newOffset?: number;
      append?: boolean;
    } = {}) => {
      const catToUse = newCategory !== undefined ? newCategory : category;
      const lvlToUse = newLevel !== undefined ? newLevel : level;
      const queryToUse = newQuery !== undefined ? newQuery : activeQuery;

      const requestId = ++activeRequestIdRef.current;

      if (!append) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsFetchingMore(true);
      }

      try {
        const excludeIds = append
          ? itemsRef.current.flatMap((i) => [i.id, i.url_website].filter(Boolean))
          : [];

        const res = await fetch(`/api/mediathek?t=${Date.now()}&rnd=${Math.random()}`, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offset: newOffset,
            size: 24,
            category: catToUse,
            level: lvlToUse,
            query: queryToUse,
            excludeIds,
            timestamp: Date.now(),
          }),
        });

        if (!res.ok) {
          throw new Error(`Ошибка загрузки: ${res.status}`);
        }

        const data = await res.json();
        if (requestId !== activeRequestIdRef.current) return;

        const newItems: MediathekMediaItem[] = (data.items || []).map((it: MediathekMediaItem) => ({
          ...it,
          posterUrl: it.posterUrl || it.thumbnailUrl || getFallbackPoster(it.channel, it.topic),
        }));

        if (!append) {
          setItems(newItems);
        } else {
          handleAppend(newItems);
        }

        setHasMore(Boolean(data.hasMore));
      } catch (err: any) {
        if (requestId === activeRequestIdRef.current) {
          console.error("Error loading Mediathek items:", err);
          setError("Не удалось связаться с медиатекой. Проверьте интернет или повторите запрос.");
        }
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    },
    [category, level, activeQuery, handleAppend]
  );

  // Первоначальная загрузка
  useEffect(() => {
    fetchMediaItems({ newCategory: "all", newLevel: "ALL", newOffset: 0, append: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Мгновенная реакция при смене категории
  const handleCategoryChange = (newCat: CategoryType) => {
    if (newCat === category) return;
    setCategory(newCat);
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newCategory: newCat, newOffset: 0, append: false });
  };

  // Мгновенная реакция при смене уровня
  const handleLevelChange = (newLevel: LevelType) => {
    if (newLevel === level) return;
    setLevel(newLevel);
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newLevel, newOffset: 0, append: false });
  };

  // Принудительное обновление
  const handleRefresh = () => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newOffset: 0, append: false });
  };

  // Поиск
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setActiveQuery(trimmed);
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newQuery: trimmed, newOffset: 0, append: false });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveQuery("");
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newQuery: "", newOffset: 0, append: false });
  };

  // Подгрузка следующей пачки
  const loadMoreVideos = useCallback(() => {
    if (isLoading || isFetchingMore || !hasMore) return;
    const nextOffset = offset + 24;
    setOffset(nextOffset);
    fetchMediaItems({ newOffset: nextOffset, append: true });
  }, [isLoading, isFetchingMore, hasMore, offset, fetchMediaItems]);

  // Intersection Sentinel (rootMargin: 400px)
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isFetchingMore || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreVideos();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, isLoading, loadMoreVideos]);

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
      thumbnailUrl: item.posterUrl || item.thumbnailUrl || getFallbackPoster(item.channel, item.topic),
      description: item.topic,
      durationText: `${item.duration} мин`,
    });
  };

  return (
    <div className="w-full">
      {/* Поисковая строка для медиатек 1-в-1 с YouTube */}
      <div className="max-w-2xl mx-auto my-5 px-4 sm:px-0">
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex items-center w-full h-[50px] bg-zinc-900/80 border border-zinc-800/80 rounded-full pl-4 pr-1.5 shadow-lg backdrop-blur-md focus-within:border-zinc-700 transition-all select-none outline-none [-webkit-tap-highlight-color:transparent]"
        >
          <Search className="text-zinc-500 shrink-0 mr-3" size={18} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Поиск передач и фильмов Mediathek..."
            className="w-full bg-transparent border-none text-white text-sm placeholder-zinc-500 focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-zinc-500 hover:text-white mr-2 p-1 cursor-pointer outline-none [-webkit-tap-highlight-color:transparent]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="h-[38px] px-6 rounded-full bg-[#E50914] hover:bg-[#b81d24] text-white text-xs font-bold tracking-wide transition-all shadow-md active:scale-95 shrink-0 cursor-pointer select-none outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
          >
            Поиск
          </button>
        </form>
      </div>

      {/* Панель управления в одну строку (One-Row Layout) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Категории слева */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "Рекомендации" },
            { id: "films", label: "Фильмы" },
            { id: "docs", label: "Документальное" },
            { id: "series", label: "Сериалы" },
            { id: "knowledge", label: "Познавательное" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id as CategoryType)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-colors duration-200 cursor-pointer ${
                category === cat.id
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Уровни + кнопка ↻ справа */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-zinc-900 rounded-full border border-zinc-800">
            {[
              { id: "ALL", label: "Все" },
              { id: "A1", label: "A1" },
              { id: "A2", label: "A2" },
              { id: "B1", label: "B1" },
              { id: "B2", label: "B2" },
              { id: "C1", label: "C1" },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => handleLevelChange(lvl.id as LevelType)}
                className={`px-3 py-1 text-xs rounded-full outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-colors duration-200 cursor-pointer ${
                  level === lvl.id
                    ? "bg-white text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Кнопка обновления */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 [-webkit-tap-highlight-color:transparent] transition-colors duration-200 disabled:opacity-40 cursor-pointer"
            title="Обновить"
          >
            <RotateCw className={`w-4 h-4 text-red-500 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-zinc-900/90 border border-red-500/30 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-zinc-300">{error}</p>
          <button
            onClick={() => fetchMediaItems({ newOffset: 0, append: false })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-colors cursor-pointer select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
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
      {!isLoading && !error && items.length === 0 && (
        <div className="max-w-md mx-auto my-16 text-center space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Передачи не найдены</h3>
          <p className="text-xs text-zinc-400">
            Попробуйте выбрать другой уровень или обновить ленту.
          </p>
        </div>
      )}

      {/* Сетка карточек медиатеки */}
      {!isLoading && items.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((item) => {
            const isFav = isFavorite(item.url_website) || isFavorite(item.id);
            const fallbackSvg = getFallbackPoster(item.channel, item.topic);

            // Цветовой бейдж уровня на карточке
            let levelBadgeClass = "bg-sky-500/20 text-sky-400 border border-sky-500/30";
            if (item.level === "A1" || item.level === "A2") {
              levelBadgeClass = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
            } else if (item.level === "C1") {
              levelBadgeClass = "bg-red-500/20 text-red-400 border border-red-500/30";
            }

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
                className="group relative flex flex-col cursor-pointer text-left select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
              >
                {/* 1. Превью 16:9 с наложением */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
                  <img
                    src={item.posterUrl || item.thumbnailUrl || fallbackSvg}
                    alt={item.title}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== fallbackSvg) {
                        target.src = fallbackSvg;
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Бейдж канала (ZDF / ARD / Arte) */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white backdrop-blur-md">
                    {item.channel}
                  </span>

                  {/* Бейдж CEFR (A1 / A2 / B1 / B2 / C1) */}
                  <span
                    className={`absolute top-2 left-14 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-md ${levelBadgeClass}`}
                  >
                    {item.level}
                  </span>

                  {/* Кнопка «В избранное» */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, item)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white transition z-10 cursor-pointer backdrop-blur-md select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
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
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[11px] text-white font-mono">
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

      {/* Intersection Sentinel */}
      <div ref={sentinelRef} className="h-24 flex items-center justify-center my-4">
        {isFetchingMore && (
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 shadow-lg text-zinc-300 text-xs sm:text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-[#E50914]" />
            <span>Загрузка следующих передач...</span>
          </div>
        )}
      </div>
    </div>
  );
}
