"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Search, 
  X, 
  AlertCircle, 
  Loader2, 
  RotateCw,
  Video,
  Bookmark,
  Tv,
  Plus
} from "lucide-react";
import { 
  RECOMMENDED_YOUTUBE_VIDEOS, 
  extractYouTubeId 
} from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import { useYouTube } from "@/context/YouTubeContext";
import VideoCard from "@/components/youtube/VideoCard";
import ManageChannelsModal, { SubscribedChannel } from "@/components/youtube/ManageChannelsModal";
import EasyGermanCatalog from "@/components/youtube/EasyGermanCatalog";
import MediathekCatalog from "@/components/mediathek/MediathekCatalog";

export type TopCategory = "youtube" | "mediathek" | "favorites";
export type MainTab = "recommendations" | "subscriptions" | "easy_german";

const DEFAULT_SUBSCRIPTIONS: SubscribedChannel[] = [
  { id: "UCbxb2fqe9oNgglAoYqsYOtQ", name: "Easy German" },
  { id: "UCZHpIFMfoJJ_1QxNGLJTzyA", name: "MrWissen2go" },
  { id: "UC4-a6QWRyBlzTFGdS-T_wfw", name: "SWR Handwerkskunst" },
  { id: "UCUuab1dctZzN5ZmRmQnTzkg", name: "WDR Doku" },
];

/**
 * Strict duration validator: strictly >= 10 minutes (>= 600 seconds)
 */
function isValidDuration(durationStr?: string, seconds?: number): boolean {
  if (typeof seconds === "number" && seconds < 600) return false;
  if (!durationStr) return false;

  const minMatch = durationStr.match(/(\d+)\s*(?:мин|min)/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10) >= 10;
  }

  const parts = durationStr.split(":").map(Number);
  if (parts.some(isNaN)) return false;
  if (parts.length === 2) {
    // MM:SS -> отсекаем всё, где минут меньше 10
    return parts[0] >= 10;
  }
  if (parts.length === 3) {
    // HH:MM:SS -> видео идет больше часа, подходит на 100%
    return true;
  }
  return false;
}

/**
 * Filter out YouTube Shorts, live streams, broken videos, and videos under 10 minutes:
 */
const BLOCKED_PATTERNS = [
  /winnetou/i,
  /die\s+entzifferung/i,
  /harald\s+lesch.*terra/i,
  /sarg\s+selbst/i,
  /testosteron[-_\s]*krise/i,
  /testosteron/i,
];

function isYouTubeShort(video: {
  title?: string;
  description?: string;
  id?: string;
  duration?: number;
  durationText?: string;
}): boolean {
  const title = (video.title || "").toLowerCase();
  const desc = (video.description || "").toLowerCase();
  const id = (video.id || "").toLowerCase();
  const combined = `${id} ${title} ${desc}`;

  // 1. Blacklisted broken videos
  if (BLOCKED_PATTERNS.some((p) => p.test(combined))) {
    return true;
  }

  // 2. Direct shorts URL or ID
  if (id.includes("shorts") || id.includes("/shorts/")) {
    return true;
  }

  // 3. Keywords and hashtag patterns (#shorts, #short, Shorts, vertical, etc.)
  if (
    /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(title) ||
    /#(shorts?|short|vertical|tiktok|reels?)/i.test(title) ||
    /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(desc) ||
    /#(shorts?|short|vertical|tiktok|reels?)/i.test(desc) ||
    title.includes("🔴")
  ) {
    return true;
  }

  // 4. Strict duration filter: exclude videos under 10 minutes (600 seconds)
  if (video.duration && video.duration < 600) {
    return true;
  }

  if (video.durationText && !isValidDuration(video.durationText, video.duration)) {
    return true;
  }

  return false;
}

export default function YouTubeCatalogPage() {
  const { favorites, removeFavorite } = useYouTube();

  // 1. Главная трехуровневая навигация: 'youtube' | 'mediathek' | 'favorites'
  const [activeCategory, setActiveCategory] = useState<TopCategory>("youtube");

  // Подвкладки YouTube: 'recommendations' | 'subscriptions'
  const [activeTab, setActiveTab] = useState<MainTab>("recommendations");

  // Search & Direct Watch
  const [searchInput, setSearchInput] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Recommendations: Difficulty Level Filter: 'ALL' | 'B1' | 'B2'
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | "B1" | "B2">("ALL");

  // Subscriptions: Filter by specific channel ('ALL' | channel name / id)
  const [selectedSubscribedChannel, setSelectedSubscribedChannel] = useState<string>("ALL");

  // Subscriptions Management Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Random seed generated on initial load (randomizes order on every load / refresh)
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000) + 1);

  // Infinite Scroll Trigger Ref
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<SubscribedChannel[]>(DEFAULT_SUBSCRIPTIONS);
  const [subVideos, setSubVideos] = useState<YouTubeRecommendedVideo[]>([]);
  const [subPage, setSubPage] = useState<number>(1);
  const [hasMoreSub, setHasMoreSub] = useState<boolean>(true);
  const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(false);
  const [isLoadingMoreSub, setIsLoadingMoreSub] = useState<boolean>(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<YouTubeRecommendedVideo[]>([]);
  const [recPage, setRecPage] = useState<number>(1);
  const [hasMoreRec, setHasMoreRec] = useState<boolean>(true);
  const [isLoadingRec, setIsLoadingRec] = useState<boolean>(false);
  const [isLoadingMoreRec, setIsLoadingMoreRec] = useState<boolean>(false);

  // Load subscriptions from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("yt_de_subscriptions");
      if (stored) {
        setSubscriptions(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Save subscriptions to localStorage
  const saveSubscriptions = (subs: SubscribedChannel[]) => {
    setSubscriptions(subs);
    try {
      localStorage.setItem("yt_de_subscriptions", JSON.stringify(subs));
    } catch {}
  };

  // Fetch subscriptions videos (with cache-busting for iPad / Safari WebKit)
  const fetchSubscriptionVideos = useCallback(
    async (pageToLoad: number, append: boolean = false) => {
      if (subscriptions.length === 0) {
        setSubVideos([]);
        setHasMoreSub(false);
        return;
      }

      if (append) {
        setIsLoadingMoreSub(true);
      } else {
        setIsLoadingSubs(true);
      }

      try {
        const channelIds = subscriptions.map((s) => s.id).join(",");
        const res = await fetch(
          `/api/youtube/subscriptions?channels=${encodeURIComponent(channelIds)}&page=${pageToLoad}&limit=16&seed=${seed}&t=${Date.now()}&rnd=${Math.random()}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const newVideos = data.videos || [];
          setSubVideos((prev) => (append ? [...prev, ...newVideos] : newVideos));
          setHasMoreSub(data.hasMore ?? false);
          setSubPage(pageToLoad);
        }
      } catch (err) {
        console.error("Failed to fetch subscriptions feed:", err);
      } finally {
        setIsLoadingSubs(false);
        setIsLoadingMoreSub(false);
      }
    },
    [subscriptions, seed]
  );

  // Fetch recommendations (with POST + cache-busting for iPad / Safari WebKit)
  const fetchRecommendations = useCallback(
    async (pageToLoad: number, append: boolean = false) => {
      if (append) {
        setIsLoadingMoreRec(true);
      } else {
        setIsLoadingRec(true);
      }

      try {
        const res = await fetch(`/api/youtube/recommendations?t=${Date.now()}&rnd=${Math.random()}`, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: pageToLoad,
            limit: 16,
            timestamp: Date.now(),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const newVideos = data.videos || [];
          setRecommendations((prev) => (append ? [...prev, ...newVideos] : newVideos));
          setHasMoreRec(data.hasMore ?? false);
          setRecPage(pageToLoad);
        }
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setIsLoadingRec(false);
        setIsLoadingMoreRec(false);
      }
    },
    []
  );

  // Initial fetch for recommendations on mount
  useEffect(() => {
    fetchRecommendations(1, false);
  }, [fetchRecommendations]);

  // Initial fetch for subscriptions
  useEffect(() => {
    fetchSubscriptionVideos(1, false);
  }, [fetchSubscriptionVideos]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          if (activeCategory !== "youtube") return;

          if (activeTab === "recommendations" && hasMoreRec && !isLoadingRec && !isLoadingMoreRec) {
            fetchRecommendations(recPage + 1, true);
          } else if (activeTab === "subscriptions" && hasMoreSub && !isLoadingSubs && !isLoadingMoreSub) {
            fetchSubscriptionVideos(subPage + 1, true);
          }
        }
      },
      { threshold: 0.1, rootMargin: "250px" }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [
    activeCategory,
    activeTab,
    hasMoreRec,
    isLoadingRec,
    isLoadingMoreRec,
    recPage,
    fetchRecommendations,
    hasMoreSub,
    isLoadingSubs,
    isLoadingMoreSub,
    subPage,
    fetchSubscriptionVideos,
  ]);

  // Refresh feed with new random seed
  const handleRefresh = async () => {
    setIsRefreshing(true);
    const newSeed = Math.floor(Math.random() * 1000000) + 1;
    setSeed(newSeed);

    if (activeTab === "recommendations") {
      await fetchRecommendations(1, false);
    } else if (activeTab === "subscriptions") {
      await fetchSubscriptionVideos(1, false);
    }
    setIsRefreshing(false);
  };

  // Search input handler: direct URL watch or search query
  const handleSearchOrWatch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const directId = extractYouTubeId(trimmed);
    if (directId) {
      window.location.href = `https://www.youtube.com/watch?v=${directId}`;
      return;
    }
  };

  // Channel management callbacks
  const handleAddChannel = (channel: SubscribedChannel) => {
    const updated = [...subscriptions.filter((s) => s.id !== channel.id), channel];
    saveSubscriptions(updated);
  };

  const handleRemoveChannel = (channelId: string) => {
    const updated = subscriptions.filter((s) => s.id !== channelId);
    saveSubscriptions(updated);
    setSubVideos((prev) => prev.filter((v) => v.channelId !== channelId));
  };

  // Base videos for YouTube subtabs
  const baseVideos = activeTab === "recommendations" ? recommendations : subVideos;

  // Filter YouTube videos
  const query = searchInput.trim().toLowerCase();
  const isSearchQuery = query.length > 0 && !extractYouTubeId(searchInput.trim());

  const currentVideos = baseVideos.filter((video) => {
    // 0. Filter out Shorts, streams and durations under 4 min
    if (isYouTubeShort(video)) return false;

    // 1. Поиск по текущей активной вкладке
    const matchesSearch =
      !isSearchQuery ||
      (video.title || "").toLowerCase().includes(query) ||
      (video.channel || "").toLowerCase().includes(query) ||
      (video.description || "").toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // 2. Контекстные фильтры вкладок
    if (activeTab === "recommendations") {
      const l = (video.level || "B1").toUpperCase();
      const isB2 = l.startsWith("B2") || l === "C1" || l === "C2";
      return (
        selectedLevel === "ALL" ||
        (selectedLevel === "B1" && !isB2) ||
        (selectedLevel === "B2" && isB2)
      );
    }

    if (activeTab === "subscriptions") {
      if (selectedSubscribedChannel === "ALL") return true;
      const chClean = (video.channel || "").toLowerCase().trim();
      const selClean = selectedSubscribedChannel.toLowerCase().trim();
      return (
        chClean === selClean ||
        chClean.includes(selClean) ||
        video.channelId === selectedSubscribedChannel
      );
    }

    return true;
  });

  // Client-side deduplication of unique videos by ID and Title
  const seenTitles = new Set<string>();
  const uniqueVideos = Array.from(
    new Map(currentVideos.map((v) => [(v as any).youtube_id || v.id, v])).values()
  ).filter((v) => {
    const norm = (v.title || "").trim().toLowerCase();
    if (seenTitles.has(norm)) return false;
    seenTitles.add(norm);
    return true;
  });

  // Client-side deduplication of favorites
  const uniqueFavorites = Array.from(
    new Map(favorites.map((v) => [(v as any).youtube_id || v.id || (v as any).url_website, v])).values()
  );

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24 px-4 md:px-12 pt-4">
      {/* 1. Верхняя навигация: вынос «Избранного» на первый уровень */}
      <div className="max-w-7xl mx-auto mb-6 pt-2 flex items-center justify-center">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center">
          {/* YouTube DE */}
          <button
            onClick={() => setActiveCategory("youtube")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === "youtube"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>YouTube DE</span>
          </button>

          {/* ARD & ZDF Mediathek */}
          <button
            onClick={() => setActiveCategory("mediathek")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeCategory === "mediathek"
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>ARD & ZDF Mediathek</span>
          </button>

          {/* Избранное (Общее) - Выделяется золотистым/янтарным акцентом */}
          <button
            onClick={() => setActiveCategory("favorites")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 border cursor-pointer ${
              activeCategory === "favorites"
                ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20 font-bold"
                : "bg-zinc-900/80 text-zinc-300 hover:text-white border-zinc-800 hover:border-amber-500/40"
            }`}
          >
            <Bookmark
              size={14}
              className={activeCategory === "favorites" ? "fill-black text-black" : "text-amber-400"}
            />
            <span>Избранное</span>
            {favorites.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeCategory === "favorites"
                    ? "bg-black text-amber-400"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {favorites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TOP CATEGORY */}
      {activeCategory === "favorites" ? (
        /* 4. Раздел «Избранное» (Общая сетка YouTube + ARD/ZDF) */
        <div className="max-w-7xl mx-auto">
          {uniqueFavorites.length === 0 ? (
            <div className="py-24 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center flex flex-col items-center justify-center p-8 gap-3 max-w-lg mx-auto">
              <Bookmark className="w-12 h-12 text-zinc-600" />
              <h3 className="text-base font-bold text-white">Здесь будут ваши сохраненные фильмы и ролики</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Нажмите на значок закладки на любой карточке в YouTube или ARD & ZDF, чтобы добавить видео в этот список.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {uniqueFavorites.map((item) => (
                <VideoCard
                  key={(item as any).youtube_id || item.id || (item as any).url_website}
                  video={item}
                  onRemoveFavorite={() => removeFavorite(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeCategory === "mediathek" ? (
        /* ARD & ZDF Mediathek Catalog */
        <MediathekCatalog />
      ) : (
        /* YouTube DE Feed with Sub-navigation */
        <>
          {/* Top Controls: Centered Clean Search Bar */}
          <div className="max-w-3xl mx-auto mb-6 pt-2">
            <form
              onSubmit={handleSearchOrWatch}
              className="relative bg-zinc-900/90 border border-zinc-800 rounded-full px-4 py-2.5 flex items-center gap-2.5 focus-within:border-zinc-500 transition-all shadow-xl"
            >
              <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder="Поиск видео по теме или вставка ссылки YouTube..."
                className="bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none w-full"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="text-zinc-500 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="hidden sm:inline-block px-4 py-1.5 rounded-full bg-[#E50914] hover:bg-[#b80710] text-xs font-bold text-white transition-colors cursor-pointer shadow"
              >
                Смотреть
              </button>
            </form>

            {inputError && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs mt-2 px-3">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{inputError}</span>
              </div>
            )}
          </div>

          {/* YouTube Подменю: [ Рекомендации B1–B2 ] [ Мои подписки ] [ Easy German ] */}
          <div className="max-w-7xl mx-auto mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Таб 1: Рекомендации B1–B2 */}
                <button
                  onClick={() => setActiveTab("recommendations")}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
                    activeTab === "recommendations"
                      ? "bg-red-600 text-white font-semibold shadow-lg shadow-red-950/40"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  Рекомендации B1–B2
                </button>

                {/* Таб 2: Мои подписки с бейджем количества каналов */}
                <button
                  onClick={() => setActiveTab("subscriptions")}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === "subscriptions"
                      ? "bg-red-600 text-white font-semibold shadow-lg shadow-red-950/40"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  <span>Мои подписки</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === "subscriptions"
                        ? "bg-white/20 text-white"
                        : "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {subscriptions.length}
                  </span>
                </button>

                {/* Таб 3: Easy German */}
                <button
                  onClick={() => setActiveTab("easy_german")}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
                    activeTab === "easy_german"
                      ? "bg-red-600 text-white font-semibold shadow-lg shadow-red-950/40"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  Easy German
                </button>
              </div>

              {/* Controls right side (only for Recommendations & Subscriptions) */}
              {activeTab !== "easy_german" && (
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Contextual Filters: Recommendations Difficulty (B1 / B2) */}
                  {activeTab === "recommendations" && (
                    <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-full border border-zinc-800">
                      <button
                        onClick={() => setSelectedLevel("ALL")}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          selectedLevel === "ALL"
                            ? "bg-white text-black shadow"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Все
                      </button>
                      <button
                        onClick={() => setSelectedLevel("B1")}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          selectedLevel === "B1"
                            ? "bg-emerald-500 text-black shadow font-bold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        B1
                      </button>
                      <button
                        onClick={() => setSelectedLevel("B2")}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          selectedLevel === "B2"
                            ? "bg-sky-500 text-black shadow font-bold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        B2
                      </button>
                    </div>
                  )}

                  {/* Refresh Feed Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || isLoadingRec || isLoadingSubs}
                    className="p-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer shadow"
                    title="Перемешать и обновить ленту"
                  >
                    <RotateCw
                      className={`w-4 h-4 text-red-500 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Subscriptions sub-bar */}
            {activeTab === "subscriptions" && (
              <div className="mt-4 flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <span className="text-xs text-zinc-400 font-medium whitespace-nowrap mr-1">
                    Канал:
                  </span>
                  <button
                    onClick={() => setSelectedSubscribedChannel("ALL")}
                    className={`px-3 py-1 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                      selectedSubscribedChannel === "ALL"
                        ? "bg-white text-black font-semibold"
                        : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                    }`}
                  >
                    Все каналы
                  </button>
                  {subscriptions.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedSubscribedChannel(ch.id)}
                      className={`px-3 py-1 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                        selectedSubscribedChannel === ch.id
                          ? "bg-white text-black font-semibold"
                          : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setIsManageModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shadow transition active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Добавить канал</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Main Video Feed Area */}
          <div className="max-w-7xl mx-auto">
            {activeTab === "easy_german" ? (
              <EasyGermanCatalog searchQuery={isSearchQuery ? searchInput : ""} />
            ) : (activeTab === "subscriptions" && isLoadingSubs && subVideos.length === 0) ||
              (activeTab === "recommendations" && isLoadingRec && recommendations.length === 0) ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
                <span className="text-sm font-medium">Загрузка свежих видео из немецких каналов...</span>
              </div>
            ) : uniqueVideos.length === 0 ? (
              <div className="py-20 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center flex flex-col items-center justify-center p-8 gap-3 max-w-lg mx-auto">
                {activeTab === "subscriptions" ? (
                  <>
                    <Tv className="w-10 h-10 text-zinc-600" />
                    <h3 className="text-base font-bold text-white">В ваших подписках пока нет доступных видео</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Добавьте больше немецких YouTube-каналов или выберите другой канал в списке.
                    </p>
                    <button
                      onClick={() => setIsManageModalOpen(true)}
                      className="mt-2 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      Добавить немецкий YouTube-канал
                    </button>
                  </>
                ) : (
                  <>
                    <Video className="w-10 h-10 text-zinc-600" />
                    <h3 className="text-base font-bold text-white">Видео не найдены</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {isSearchQuery
                        ? `По запросу «${searchInput}» ничего не найдено.`
                        : "В каталоге пока нет видео по выбранным критериям."}
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* Video Grid (Strictly non-Shorts, >= 10 min, deduplicated) */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {uniqueVideos.map((video) => (
                    <VideoCard
                      key={(video as any).youtube_id || video.id || (video as any).url_website}
                      video={video}
                    />
                  ))}
                </div>

                {/* Infinite Scroll Trigger Target */}
                <div
                  ref={loadMoreTriggerRef}
                  className="h-20 w-full flex items-center justify-center mt-6 pointer-events-none"
                >
                  {(isLoadingMoreRec || isLoadingMoreSub) && (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm">
                      <Loader2 className="w-5 h-5 animate-spin text-[#E50914]" />
                      <span>Загрузка новых видео...</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Manage Channels Modal */}
      <ManageChannelsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        channels={subscriptions}
        onAddChannel={handleAddChannel}
        onRemoveChannel={handleRemoveChannel}
      />
    </div>
  );
}
