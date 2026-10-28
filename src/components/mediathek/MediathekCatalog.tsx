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
  description?: string;
  channel: string;
  duration: number; // in minutes
  url_website: string;
  url_subtitles?: string;
  posterUrl: string;
  thumbnailUrl?: string;
  level: "B1" | "B2";
  date: string;
}

type CategoryType = "ALL" | "films" | "doku" | "series";
type LevelType = "ALL" | "B1" | "B2";

const CATEGORIES: { id: CategoryType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "ALL", label: "Все", icon: Sparkles },
  { id: "films", label: "Фильмы", icon: Film },
  { id: "doku", label: "Документальные фильмы", icon: Compass },
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

  const [category, setCategory] = useState<CategoryType>("ALL");
  const [level, setLevel] = useState<LevelType>("ALL");
  const [searchInput, setSearchInput] = useState<string>("");
  const [activeQuery, setActiveQuery] = useState<string>("");

  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000) + 1);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchItems = useCallback(async (currentOffset: number, isInitial: boolean = false) => {
    if (isInitial) {
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
          offset: currentOffset,
          size: 30,
          level,
          category,
          query: activeQuery,
          seed,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ошибка загрузки: ${res.status}`);
      }

      const data = await res.json();
      const newItems: MediathekMediaItem[] = (data.items || []).filter(
        (it: MediathekMediaItem) => Boolean(it.posterUrl || it.thumbnailUrl)
      );

      setItems((prev) => (isInitial ? newItems : [...prev, ...newItems]));
      setHasMore(Boolean(data.hasMore && newItems.length > 0));
      setOffset(currentOffset + newItems.length);
    } catch (err: any) {
      console.error("Error loading Mediathek items:", err);
      setError("Не удалось связаться с медиатекой. Проверьте интернет или повторите запрос.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [category, level, activeQuery, seed]);

  const handleRefresh = () => {
    const newSeed = Math.floor(Math.random() * 1000000) + 1;
    setSeed(newSeed);
    setItems([]);
    setBrokenIds(new Set());
    setOffset(0);
    setHasMore(true);
  };

  // Initial load or when filters change
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchItems(0, true);
  }, [category, level, activeQuery, fetchItems]);

  // Infinite scroll observer
  useEffect(() => {
    if (isLoading || isLoadingMore || !hasMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchItems(offset, false);
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
  }, [fetchItems, hasMore, isLoading, isLoadingMore, offset]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchInput.trim());
  };

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

  // Filter out any broken posters and deduplicate
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
      {/* Search Header for Mediathek */}
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
              onClick={() => {
                setSearchInput("");
                setActiveQuery("");
              }}
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

      {/* Filter Controls: Categories & Level Chips */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          {/* Strict Categories: [ Все ] [ Фильмы ] [ Документальные фильмы ] [ Сериалы ] + ↻ */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
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

          {/* Level Switcher (Right side) */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-full border border-zinc-800">
            {LEVELS.map((lvl) => {
              const isActive = level === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => setLevel(lvl.id)}
                  title={lvl.desc}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-black shadow"
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

      {/* Error state */}
      {error && (
        <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-zinc-900/90 border border-red-500/30 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-zinc-300">{error}</p>
          <button
            onClick={() => fetchItems(0, true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Повторить</span>
          </button>
        </div>
      )}

      {/* Initial Loading Skeleton */}
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

      {/* Empty State */}
      {!isLoading && !error && displayedItems.length === 0 && (
        <div className="max-w-md mx-auto my-16 text-center space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Передачи не найдены</h3>
          <p className="text-xs text-zinc-400">
            Попробуйте обновить ленту или выбрать другую категорию.
          </p>
        </div>
      )}

      {/* Grid of Mediathek Cards - ONLY with verified real posters */}
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
                {/* 1. Preview 16:9 */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
                  <img
                    src={item.posterUrl || item.thumbnailUrl}
                    alt={item.title}
                    onError={() => {
                      // Remove card from DOM if poster fails
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
                  <span className={`absolute top-2 left-14 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-md ${
                    item.level === "B1"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  }`}>
                    {item.level}
                  </span>

                  {/* Кнопка В избранное */}
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

                  {/* Center Play Button on Hover */}
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

                {/* 2. Text Below Preview (Title and Channel only) */}
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

      {/* Infinite Scroll Trigger */}
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
