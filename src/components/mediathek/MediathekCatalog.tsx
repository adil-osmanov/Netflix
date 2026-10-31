"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { 
  Loader2, 
  Film, 
  RotateCw,
  AlertCircle
} from "lucide-react";
import { useYouTube } from "@/context/YouTubeContext";
import { ChannelFilter } from "./ChannelFilter";
import { MediathekCard } from "./MediathekCard";
import { normalizeSender, filterValidMediathekVideos, sanitizeThumbnailUrl } from "@/lib/mediathek";

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

export default function MediathekCatalog() {
  const { isFavorite, toggleFavorite } = useYouTube();

  const [items, setItems] = useState<MediathekMediaItem[]>([]);
  const [category, setCategory] = useState<CategoryType>("all");
  const [level, setLevel] = useState<LevelType>("ALL");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

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
      newChannel,
      newQuery,
      newOffset = 0,
      append = false,
    }: {
      newCategory?: CategoryType;
      newLevel?: LevelType;
      newChannel?: string;
      newQuery?: string;
      newOffset?: number;
      append?: boolean;
    } = {}) => {
      const catToUse = newCategory !== undefined ? newCategory : category;
      const lvlToUse = newLevel !== undefined ? newLevel : level;
      const chanToUse = newChannel !== undefined ? newChannel : selectedChannel;
      const queryToUse = newQuery !== undefined ? newQuery : "";

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
            channel: chanToUse,
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

        const newItems: MediathekMediaItem[] = (data.items || []).map((it: MediathekMediaItem) => {
          const cleanPoster = sanitizeThumbnailUrl(it.posterUrl || it.thumbnailUrl || "") || "";
          return {
            ...it,
            posterUrl: cleanPoster,
            thumbnailUrl: cleanPoster,
          };
        });

        const validItems = filterValidMediathekVideos(newItems);

        if (!append) {
          setItems(validItems);
        } else {
          handleAppend(validItems);
        }

        // Если вернулся пустой массив или меньше страницы, либо hasMore=false, сразу прекращаем пагинацию
        if (!data.items || data.items.length === 0 || !data.hasMore) {
          setHasMore(false);
        } else {
          setHasMore(Boolean(data.hasMore));
        }
      } catch (err: any) {
        if (requestId === activeRequestIdRef.current) {
          console.error("Error loading Mediathek items:", err);
          setError("Не удалось связаться с медиатекой. Проверьте интернет или повторите запрос.");
          setHasMore(false);
        }
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    },
    [category, level, selectedChannel, handleAppend]
  );

  // Первоначальная загрузка
  useEffect(() => {
    fetchMediaItems({ newCategory: "all", newLevel: "ALL", newChannel: "all", newOffset: 0, append: false });
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

  // Мгновенная реакция при смене канала
  const handleChannelChange = (newChan: string) => {
    if (newChan === selectedChannel) return;
    setSelectedChannel(newChan);
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newChannel: newChan, newOffset: 0, append: false });
  };

  // Принудительное обновление
  const handleRefresh = () => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchMediaItems({ newOffset: 0, append: false });
  };

  // Подгрузка следующей пачки
  const loadMoreVideos = useCallback(() => {
    if (isLoading || isFetchingMore || !hasMore) return;
    const nextOffset = offset + 24;
    setOffset(nextOffset);
    fetchMediaItems({ newOffset: nextOffset, append: true });
  }, [isLoading, isFetchingMore, hasMore, offset, fetchMediaItems]);

  // Двойная клиентская фильтрация по уровню и каналу + валидация обложек
  const displayedVideos = useMemo(() => {
    const valid = filterValidMediathekVideos(items);
    return valid.filter((item) => {
      if (selectedChannel && selectedChannel !== "all" && selectedChannel !== "ALL") {
        const itemNorm = normalizeSender(item.channel || "");
        if (itemNorm.toUpperCase() !== selectedChannel.toUpperCase()) {
          return false;
        }
      }
      if (level && level !== "ALL") {
        if (item.level !== level) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedChannel, level]);

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
      thumbnailUrl: item.posterUrl || item.thumbnailUrl || "",
      description: item.topic,
      durationText: `${item.duration} мин`,
    });
  };

  return (
    <div className="w-full">
      {/* Панель управления в одну строку (One-Row Layout) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
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

      {/* Премиальный фильтр каналов в стиле Netflix */}
      <ChannelFilter selectedChannel={selectedChannel} onSelectChannel={handleChannelChange} />

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
      {!isLoading && !error && displayedVideos.length === 0 && (
        <div className="max-w-md mx-auto my-16 text-center space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Передачи не найдены</h3>
          <p className="text-xs text-zinc-400">
            Попробуйте выбрать другой канал или уровень, либо обновите ленту.
          </p>
        </div>
      )}

      {/* Сетка карточек медиатеки с проверкой обложек и контрастными бейджами */}
      {!isLoading && displayedVideos.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {displayedVideos.map((item) => {
            const isFav = isFavorite(item.url_website) || isFavorite(item.id);
            return (
              <MediathekCard
                key={item.id}
                video={item}
                isFav={isFav}
                onToggleFavorite={handleToggleFavorite}
                onClick={handleCardClick}
              />
            );
          })}
        </div>
      )}

      {/* Intersection Sentinel (показывается только если есть еще страницы для загрузки) */}
      {hasMore && displayedVideos.length > 0 && (
        <div ref={sentinelRef} className="w-full">
          {isFetchingMore && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-red-600 rounded-full animate-spin" />
                <span>Загрузка следующих передач...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
