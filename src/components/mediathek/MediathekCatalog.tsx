"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Search, 
  X, 
  Loader2, 
  Play, 
  Film, 
  Tv, 
  FileText, 
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
  description: string;
  channel: string;
  duration: number; // in minutes
  url_website: string;
  url_subtitles?: string;
  thumbnailUrl?: string;
  level: "B1" | "B2";
  date: string;
}

type CategoryType = "ALL" | "films" | "series" | "doku";
type LevelType = "ALL" | "B1" | "B2";

const CATEGORIES: { id: CategoryType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "ALL", label: "Все", icon: Sparkles },
  { id: "films", label: "Фильмы", icon: Film },
  { id: "series", label: "Сериалы", icon: Tv },
  { id: "doku", label: "Документалки & Наука", icon: FileText },
];

const LEVELS: { id: LevelType; label: string; desc: string }[] = [
  { id: "ALL", label: "Все уровни", desc: "B1 и B2" },
  { id: "B1", label: "B1", desc: "Средний темп, понятная речь" },
  { id: "B2", label: "B2", desc: "Естественная речь, фильмы" },
];

function getChannelBadgeClass(channel: string): string {
  const ch = channel.toLowerCase();
  if (ch.includes("zdf")) {
    return "bg-amber-500/25 text-amber-300 border-amber-500/40";
  }
  if (ch.includes("ard") || ch.includes("das erste") || ch.includes("one")) {
    return "bg-blue-600/25 text-blue-300 border-blue-500/40";
  }
  if (ch.includes("arte")) {
    return "bg-purple-600/25 text-purple-300 border-purple-500/40";
  }
  if (
    ch.includes("3sat") || 
    ch.includes("ndr") || 
    ch.includes("wdr") || 
    ch.includes("swr") || 
    ch.includes("mdr") || 
    ch.includes("br") || 
    ch.includes("rbb") || 
    ch.includes("hr")
  ) {
    return "bg-teal-600/25 text-teal-300 border-teal-500/40";
  }
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
}

function getClientFallbackThumbnail(channel: string, topic: string, title: string): string {
  const ch = channel.toUpperCase();
  let accentColor = "#e50914";
  if (ch.includes("ZDF")) accentColor = "#fa7d00";
  else if (ch.includes("ARD") || ch.includes("ERSTE")) accentColor = "#0055a5";
  else if (ch.includes("ARTE")) accentColor = "#ff501a";
  else if (ch.includes("3SAT") || ch.includes("WDR") || ch.includes("NDR") || ch.includes("SWR")) accentColor = "#00a399";

  const safeTopic = (topic || "Mediathek").slice(0, 24).replace(/[<>&"]/g, '');
  const safeTitle = (title || "Sendung").slice(0, 32).replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#18181b" />
        <stop offset="100%" stop-color="#09090b" />
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#bg)" />
    <circle cx="580" cy="80" r="130" fill="${accentColor}" opacity="0.14" />
    <rect x="36" y="36" width="96" height="32" rx="6" fill="${accentColor}" opacity="0.25" />
    <text x="84" y="58" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="900" fill="${accentColor}" text-anchor="middle">${ch.slice(0, 10)}</text>
    <text x="36" y="115" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700" fill="#a1a1aa" letter-spacing="1">${safeTopic.toUpperCase()}</text>
    <text x="36" y="185" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="800" fill="#f4f4f5">${safeTitle}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function MediathekCatalog() {
  const { isFavorite, toggleFavorite } = useYouTube();

  const [items, setItems] = useState<MediathekMediaItem[]>([]);
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
          size: 24,
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
      const newItems: MediathekMediaItem[] = data.items || [];

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
    // Seamless in-window navigation inside Chrome App
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
      thumbnailUrl: item.thumbnailUrl || getClientFallbackThumbnail(item.channel, item.topic, item.title),
      description: item.topic,
      durationText: `${item.duration} мин`,
    });
  };

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
            placeholder="Поиск по архивам ARD, ZDF, 3sat, Arte (например: Tatort, Natur, Berlin)..."
            className="bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none w-full"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setActiveQuery("");
              }}
              className="text-zinc-500 hover:text-white p-0.5"
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
          {/* Categories */}
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
      {!isLoading && !error && items.length === 0 && (
        <div className="max-w-md mx-auto my-16 text-center space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Передачи не найдены</h3>
          <p className="text-xs text-zinc-400">
            Попробуйте изменить поисковый запрос или выбрать категорию «Все».
          </p>
        </div>
      )}

      {/* Grid of Mediathek Cards - Unified with YouTube Card style */}
      {!isLoading && items.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((item) => {
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
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 group-hover:border-zinc-700 transition-all duration-300">
                  <img
                    src={item.thumbnailUrl || getClientFallbackThumbnail(item.channel, item.topic, item.title)}
                    alt={item.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getClientFallbackThumbnail(
                        item.channel,
                        item.topic,
                        item.title
                      );
                    }}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Top-Left: Channel Badge & Level Badge */}
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${getChannelBadgeClass(
                        item.channel
                      )}`}
                    >
                      {item.channel}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border backdrop-blur-md ${
                        item.level === "B1"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                      }`}
                    >
                      {item.level}
                    </span>
                  </div>

                  {/* Top-Right: Bookmark Favorite Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, item)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 backdrop-blur-md text-zinc-300 hover:text-white transition z-20 cursor-pointer"
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

                  {/* Bottom-Right: Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-[11px] font-medium text-white backdrop-blur-sm border border-white/10 font-mono">
                    {item.duration} Min.
                  </div>
                </div>

                {/* 2. Text Below Preview (Title and Channel only) */}
                <h3 className="mt-2 text-sm font-medium text-zinc-100 line-clamp-2 group-hover:text-white transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {item.topic ? `${item.channel} • ${item.topic}` : item.channel}
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
        {!hasMore && items.length > 0 && !isLoading && (
          <span className="text-xs text-zinc-600">Вы просмотрели все доступные передачи</span>
        )}
      </div>
    </div>
  );
}
