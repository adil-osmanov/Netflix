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
  Clock, 
  Subtitles, 
  Calendar,
  AlertCircle,
  RotateCw,
  Sparkles
} from "lucide-react";

export interface MediathekMediaItem {
  id: string;
  title: string;
  topic: string;
  description: string;
  channel: string;
  duration: number; // in minutes
  url_website: string;
  url_subtitles?: string;
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
    return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  }
  if (ch.includes("ard") || ch.includes("das erste") || ch.includes("one")) {
    return "bg-blue-600/20 text-blue-300 border-blue-500/40";
  }
  if (ch.includes("arte")) {
    return "bg-purple-600/20 text-purple-300 border-purple-500/40";
  }
  if (ch.includes("3sat") || ch.includes("ndr") || ch.includes("wdr") || ch.includes("swr") || ch.includes("mdr") || ch.includes("br") || ch.includes("rbb") || ch.includes("hr")) {
    return "bg-teal-600/20 text-teal-300 border-teal-500/40";
  }
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
}

export default function MediathekCatalog() {
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
  }, [category, level, activeQuery]);

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
    // Seamless navigation inside Chrome App / current window
    window.location.href = url;
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
      <div className="max-w-7xl mx-auto mb-8 space-y-4">
        {/* Row 1: Categories */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
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

        {/* Info Banner about Subtitles */}
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-[11px] font-semibold">
              <Subtitles className="w-3 h-3 text-red-400" />
              100% Untertitel DE
            </span>
            <span>Официальные немецкие студийные субтитры (ARD/ZDF/Arte)</span>
          </div>
          <span className="text-[11px] text-zinc-500 hidden sm:inline">
            Длительность от 15 минут • Без рекламы
          </span>
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
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between h-64 animate-pulse"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-5 rounded bg-zinc-800" />
                  <div className="w-10 h-5 rounded bg-zinc-800" />
                </div>
                <div className="w-3/4 h-5 rounded bg-zinc-800" />
                <div className="w-full h-4 rounded bg-zinc-800/60" />
                <div className="w-2/3 h-4 rounded bg-zinc-800/60" />
              </div>
              <div className="pt-4 border-t border-zinc-800/60 flex justify-between items-center">
                <div className="w-20 h-4 rounded bg-zinc-800" />
                <div className="w-16 h-4 rounded bg-zinc-800" />
              </div>
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

      {/* Grid of Mediathek Cards */}
      {!isLoading && items.length > 0 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleCardClick(item.url_website)}
              className="group relative bg-[#181818] hover:bg-[#202020] border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:scale-[1.015]"
            >
              {/* Card Header: Channel Badge & Level Badge */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getChannelBadgeClass(
                      item.channel
                    )}`}
                  >
                    {item.channel}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* B1 / B2 Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                        item.level === "B1"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                      }`}
                    >
                      {item.level}
                    </span>

                    {/* German Subtitles Badge */}
                    <span
                      title="Немецкие студийные субтитры"
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex items-center gap-0.5"
                    >
                      <Subtitles className="w-3 h-3 text-red-500" />
                      <span>UT</span>
                    </span>
                  </div>
                </div>

                {/* Topic / Category Tag */}
                {item.topic && (
                  <p className="text-[11px] font-medium text-zinc-400 line-clamp-1 uppercase tracking-wide">
                    {item.topic}
                  </p>
                )}

                {/* Title */}
                <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                  {item.title}
                </h3>

                {/* Description / Synopsis */}
                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                  {item.description || "Описание отсутствует."}
                </p>
              </div>

              {/* Card Footer: Duration, Date & Play Indicator */}
              <div className="mt-5 pt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-medium text-zinc-300">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {item.duration} Min.
                  </span>
                  {item.date && (
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                  )}
                </div>

                {/* Play action */}
                <div className="flex items-center gap-1 text-xs font-semibold text-white group-hover:text-red-500 transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden group-hover:inline">Смотреть</span>
                </div>
              </div>
            </div>
          ))}
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
