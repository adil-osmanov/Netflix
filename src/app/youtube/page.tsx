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
  Plus,
  Sparkles
} from "lucide-react";
import { extractYouTubeId } from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import { useYouTube } from "@/context/YouTubeContext";
import VideoCard from "@/components/youtube/VideoCard";
import InfiniteVideoFeed, { appendUniqueVideos } from "@/components/youtube/InfiniteVideoFeed";
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
 * Duration validator:
 * - For Recommendations: >= 10 minutes (600s)
 * - For Subscriptions: >= 3 min 20 sec (200s, filters out Shorts while keeping all normal channel videos)
 */
function isValidDuration(
  durationStr?: string,
  seconds?: number,
  minSeconds: number = 600
): boolean {
  if (typeof seconds === "number") {
    return seconds >= minSeconds;
  }
  if (!durationStr) return false;

  const minMinutes = Math.ceil(minSeconds / 60);
  const minMatch = durationStr.match(/(\d+)\s*(?:мин|min)/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10) >= minMinutes;
  }

  const parts = durationStr.split(":").map(Number);
  if (parts.some(isNaN)) return false;
  if (parts.length === 2) {
    const totalSec = parts[0] * 60 + parts[1];
    return totalSec >= minSeconds;
  }
  if (parts.length === 3) {
    return true;
  }
  return false;
}

const BLOCKED_PATTERNS = [
  /winnetou/i,
  /die\s+entzifferung/i,
  /harald\s+lesch.*terra/i,
  /sarg\s+selbst/i,
  /testosteron[-_\s]*krise/i,
  /testosteron/i,
];

function isYouTubeShort(
  video: {
    title?: string;
    description?: string;
    id?: string;
    duration?: number;
    duration_seconds?: number;
    durationText?: string;
    duration_str?: string;
  },
  minDurationSeconds: number = 600
): boolean {
  const title = (video.title || "").toLowerCase();
  const desc = (video.description || "").toLowerCase();
  const id = (video.id || "").toLowerCase();
  const combined = `${id} ${title} ${desc}`;

  if (BLOCKED_PATTERNS.some((p) => p.test(combined))) {
    return true;
  }

  if (id.includes("shorts") || id.includes("/shorts/")) {
    return true;
  }

  if (
    /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(title) ||
    /#(shorts?|short|vertical|tiktok|reels?)/i.test(title) ||
    /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(desc) ||
    /#(shorts?|short|vertical|tiktok|reels?)/i.test(desc) ||
    title.includes("🔴")
  ) {
    return true;
  }

  const sec = video.duration_seconds ?? video.duration;
  const durStr = video.durationText || video.duration_str;

  if (typeof sec === "number" && sec < minDurationSeconds) {
    return true;
  }

  if (durStr && !isValidDuration(durStr, sec, minDurationSeconds)) {
    return true;
  }

  return false;
}

export default function YouTubeCatalogPage() {
  const { favorites, removeFavorite } = useYouTube();

  // 1. Главная трехуровневая навигация: 'youtube' | 'mediathek' | 'favorites'
  const [activeCategory, setActiveCategory] = useState<TopCategory>("youtube");

  // Подвкладки YouTube: 'recommendations' | 'subscriptions' | 'easy_german'
  const [activeTab, setActiveTab] = useState<MainTab>("recommendations");

  // Search & Direct Watch
  const [searchInput, setSearchInput] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Recommendations: Difficulty Level Filter: 'ALL' | 'B1' | 'B2'
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | "B1" | "B2">("ALL");

  // Subscriptions: Filter by specific channel ('ALL' | channelId)
  const [selectedSubscribedChannel, setSelectedSubscribedChannel] = useState<string>("ALL");

  // Subscriptions Management Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<SubscribedChannel[]>(DEFAULT_SUBSCRIPTIONS);
  const [subVideos, setSubVideos] = useState<YouTubeRecommendedVideo[]>([]);
  const [subPage, setSubPage] = useState<number>(1);
  const [hasMoreSub, setHasMoreSub] = useState<boolean>(true);
  const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(false);
  const [isFetchingMoreSub, setIsFetchingMoreSub] = useState<boolean>(false);

  // Токены пагинации (continuationToken) по каналам
  const channelTokensRef = useRef<Record<string, string | null>>({});
  const subVideosRef = useRef<YouTubeRecommendedVideo[]>([]);
  subVideosRef.current = subVideos;

  // Recommendations state
  const [recommendations, setRecommendations] = useState<YouTubeRecommendedVideo[]>([]);
  const [recPage, setRecPage] = useState<number>(1);
  const [hasMoreRec, setHasMoreRec] = useState<boolean>(true);
  const [isLoadingRec, setIsLoadingRec] = useState<boolean>(false);
  const [isFetchingMoreRec, setIsFetchingMoreRec] = useState<boolean>(false);

  const recommendationsRef = useRef<YouTubeRecommendedVideo[]>([]);
  recommendationsRef.current = recommendations;

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

  // Загрузка видео подписок (без лимита в 15 роликов, с поддержкой continuationToken и excludeIds)
  const fetchSubscriptionVideos = useCallback(
    async (
      pageToLoad: number,
      append: boolean = false,
      targetChannelOverride?: string
    ) => {
      if (subscriptions.length === 0) {
        setSubVideos([]);
        setHasMoreSub(false);
        return;
      }

      const activeChannel =
        targetChannelOverride !== undefined
          ? targetChannelOverride
          : selectedSubscribedChannel;

      if (append) {
        setIsFetchingMoreSub(true);
      } else {
        setIsLoadingSubs(true);
        channelTokensRef.current = {};
      }

      try {
        const excludeIds = append
          ? subVideosRef.current.map((v) => (v as any).youtube_id || v.id)
          : [];

        if (activeChannel !== "ALL") {
          // Прямая загрузка 35–60 роликов конкретного канала + пагинация по continuationToken
          const chObj = subscriptions.find((s) => s.id === activeChannel);
          const token = append ? channelTokensRef.current[activeChannel] || null : null;

          const res = await fetch(
            `/api/youtube/channel-videos?t=${Date.now()}&rnd=${Math.random()}`,
            {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channelId: activeChannel,
                channelName: chObj?.name || "Канал",
                continuationToken: token,
                excludeIds,
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const newVideos: YouTubeRecommendedVideo[] = data.items || data.videos || [];
            channelTokensRef.current[activeChannel] = data.continuationToken || null;

            setSubVideos((prev) =>
              append ? appendUniqueVideos(prev, newVideos) : newVideos
            );
            setHasMoreSub(Boolean(data.continuationToken));
            setSubPage(pageToLoad);
          }
        } else {
          // Загрузка ленты по всем каналам подписок
          const channelIds = subscriptions.map((s) => s.id);
          const res = await fetch(
            `/api/youtube/subscriptions?t=${Date.now()}&rnd=${Math.random()}`,
            {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channelIds,
                page: pageToLoad,
                limit: 24,
                excludeIds,
                continuationTokens: append ? channelTokensRef.current : {},
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const newVideos: YouTubeRecommendedVideo[] = data.videos || data.items || [];
            if (data.continuationTokens) {
              channelTokensRef.current = data.continuationTokens;
            }
            setSubVideos((prev) =>
              append ? appendUniqueVideos(prev, newVideos) : newVideos
            );
            setHasMoreSub(data.hasMore ?? true);
            setSubPage(pageToLoad);
          }
        }
      } catch (err) {
        console.error("Failed to fetch subscriptions feed:", err);
      } finally {
        setIsLoadingSubs(false);
        setIsFetchingMoreSub(false);
      }
    },
    [subscriptions, selectedSubscribedChannel]
  );

  // Загрузка рекомендаций с передачей excludeIds и динамическими кластерами тем
  const fetchRecommendations = useCallback(
    async (pageToLoad: number, append: boolean = false, levelOverride?: "ALL" | "B1" | "B2") => {
      if (append) {
        setIsFetchingMoreRec(true);
      } else {
        setIsLoadingRec(true);
      }

      const lvl = levelOverride !== undefined ? levelOverride : selectedLevel;
      const excludeIds = append
        ? recommendationsRef.current.map((v) => (v as any).youtube_id || v.id)
        : [];

      try {
        const res = await fetch(
          `/api/youtube/recommendations?t=${Date.now()}&rnd=${Math.random()}`,
          {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page: pageToLoad,
              limit: 16,
              level: lvl,
              excludeIds,
              timestamp: Date.now(),
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          const newVideos: YouTubeRecommendedVideo[] = data.videos || data.items || [];
          setRecommendations((prev) =>
            append ? appendUniqueVideos(prev, newVideos) : newVideos
          );
          setHasMoreRec(true);
          setRecPage(pageToLoad);
        }
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setIsLoadingRec(false);
        setIsFetchingMoreRec(false);
      }
    },
    [selectedLevel]
  );

  // Initial fetch for recommendations on mount
  useEffect(() => {
    fetchRecommendations(1, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch subscriptions when subscriptions list or selected channel changes
  useEffect(() => {
    fetchSubscriptionVideos(1, false);
  }, [subscriptions, selectedSubscribedChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more handler for InfiniteVideoFeed
  const handleLoadMoreYouTube = useCallback(() => {
    if (activeCategory !== "youtube") return;

    if (activeTab === "recommendations" && hasMoreRec && !isLoadingRec && !isFetchingMoreRec) {
      fetchRecommendations(recPage + 1, true);
    } else if (
      activeTab === "subscriptions" &&
      hasMoreSub &&
      !isLoadingSubs &&
      !isFetchingMoreSub
    ) {
      fetchSubscriptionVideos(subPage + 1, true);
    }
  }, [
    activeCategory,
    activeTab,
    hasMoreRec,
    isLoadingRec,
    isFetchingMoreRec,
    recPage,
    fetchRecommendations,
    hasMoreSub,
    isLoadingSubs,
    isFetchingMoreSub,
    subPage,
    fetchSubscriptionVideos,
  ]);

  // Refresh feed
  const handleRefresh = async () => {
    setIsRefreshing(true);
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
    if (selectedSubscribedChannel === channelId) {
      setSelectedSubscribedChannel("ALL");
    }
  };

  // Base videos for YouTube subtabs
  const baseVideos = activeTab === "recommendations" ? recommendations : subVideos;
  const minDurSec = activeTab === "subscriptions" ? 200 : 600;

  // Filter YouTube videos
  const query = searchInput.trim().toLowerCase();
  const isSearchQuery = query.length > 0 && !extractYouTubeId(searchInput.trim());

  const currentVideos = baseVideos.filter((video) => {
    if (isYouTubeShort(video, minDurSec)) return false;

    const matchesSearch =
      !isSearchQuery ||
      (video.title || "").toLowerCase().includes(query) ||
      (video.channel || "").toLowerCase().includes(query) ||
      (video.description || "").toLowerCase().includes(query);

    if (!matchesSearch) return false;

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
    new Map(
      favorites.map((v) => [(v as any).youtube_id || v.id || (v as any).url_website, v])
    ).values()
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

          {/* Избранное (Общее) */}
          <button
            onClick={() => setActiveCategory("favorites")}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2 border cursor-pointer ${
              activeCategory === "favorites"
                ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20"
                : "bg-zinc-900/80 text-zinc-300 hover:text-white border-zinc-800 hover:border-amber-500/40"
            }`}
            title="Избранное"
          >
            <Bookmark
              size={15}
              className={activeCategory === "favorites" ? "fill-black text-black" : "text-amber-400"}
            />
            {favorites.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
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
        <div className="max-w-7xl mx-auto">
          {uniqueFavorites.length === 0 ? (
            <div className="py-24 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center flex flex-col items-center justify-center p-8 gap-3 max-w-lg mx-auto">
              <Bookmark className="w-12 h-12 text-zinc-600" />
              <h3 className="text-base font-bold text-white">
                Здесь будут ваши сохраненные фильмы и ролики
              </h3>
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
        <MediathekCatalog />
      ) : (
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
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    activeTab === "easy_german"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  Easy German
                </button>
              </div>

              {/* Controls right side (only for Recommendations & Subscriptions) */}
              {activeTab !== "easy_german" && (
                <div className="flex items-center gap-2 sm:gap-3">
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
                <span className="text-sm font-medium">
                  Загрузка свежих видео из немецких каналов...
                </span>
              </div>
            ) : uniqueVideos.length === 0 ? (
              <div className="py-20 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center flex flex-col items-center justify-center p-8 gap-3 max-w-lg mx-auto">
                {activeTab === "subscriptions" ? (
                  <>
                    <Tv className="w-10 h-10 text-zinc-600" />
                    <h3 className="text-base font-bold text-white">
                      В ваших подписках пока нет доступных видео
                    </h3>
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
              /* Бесконечная лента YouTube (Рекомендации и Подписки) */
              <InfiniteVideoFeed
                items={uniqueVideos}
                hasMore={activeTab === "recommendations" ? hasMoreRec : hasMoreSub}
                isFetchingMore={
                  activeTab === "recommendations" ? isFetchingMoreRec : isFetchingMoreSub
                }
                onLoadMore={handleLoadMoreYouTube}
              />
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
