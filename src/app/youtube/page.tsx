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
import MediathekCatalog from "@/components/mediathek/MediathekCatalog";

export type MediaSection = "youtube" | "mediathek";
export type MainTab = "recommendations" | "subscriptions" | "favorites";

const DEFAULT_SUBSCRIPTIONS: SubscribedChannel[] = [
  { id: "UCbxb2fqe9oNgglAoYqsYOtQ", name: "Easy German" },
  { id: "UCZHpIFMfoJJ_1QxNGLJTzyA", name: "MrWissen2go" },
  { id: "UC4-a6QWRyBlzTFGdS-T_wfw", name: "SWR Handwerkskunst" },
  { id: "UCUuab1dctZzN5ZmRmQnTzkg", name: "WDR Doku" },
];

/**
 * Helper to parse duration to total seconds (e.g. "12:34", "14 мин")
 */
function parseDurationToSeconds(durationStr?: string): number | null {
  if (!durationStr) return null;
  const minMatch = durationStr.match(/(\d+)\s*(?:мин|min)/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10) * 60;
  }
  const parts = durationStr.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

/**
 * Filter out YouTube Shorts, live streams and videos outside 5–25 minutes:
 */
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

  if (id.includes("shorts") || id.includes("/shorts/")) {
    return true;
  }

  // Keywords and hashtag patterns
  if (
    /\b(shorts?|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(title) ||
    /#(shorts?|tiktok|reels?)/i.test(title) ||
    /\b(shorts?|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(desc) ||
    /#(shorts?|tiktok|reels?)/i.test(desc) ||
    title.includes("🔴")
  ) {
    return true;
  }

  // Strict 5 to 25 minutes duration filter (300 to 1500 seconds)
  if (video.duration && (video.duration < 300 || video.duration > 1500)) {
    return true;
  }

  if (video.durationText) {
    const sec = parseDurationToSeconds(video.durationText);
    if (sec !== null && (sec < 300 || sec > 1500)) {
      return true;
    }
  }

  return false;
}

export default function YouTubeCatalogPage() {
  const { favorites, removeFavorite } = useYouTube();

  // Переключатель медиа-раздела: YouTube DE vs ARD & ZDF Mediathek
  const [mediaSection, setMediaSection] = useState<MediaSection>("youtube");

  // 1. Главная трехуровневая навигация: 'recommendations' | 'subscriptions' | 'favorites'
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

  // 1. Fetch Recommendations from unified feed API
  const loadRecommendations = useCallback(
    async (page: number, isReset: boolean = false, customSeed?: number) => {
      const currentSeed = customSeed !== undefined ? customSeed : seed;
      if (isReset) {
        setIsLoadingRec(true);
      } else {
        setIsLoadingMoreRec(true);
      }

      try {
        const resp = await fetch(
          `/api/youtube/feed?tab=recommendations&page=${page}&limit=16&seed=${currentSeed}`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.videos) && data.videos.length > 0) {
            if (isReset) {
              setRecommendations(data.videos);
              setRecPage(1);
            } else {
              setRecommendations((prev) => {
                const existingIds = new Set(prev.map((v) => v.id));
                const fresh = data.videos.filter(
                  (v: YouTubeRecommendedVideo) => !existingIds.has(v.id)
                );
                return [...prev, ...fresh];
              });
              setRecPage(page);
            }
            setHasMoreRec(Boolean(data.hasMore));
          } else {
            if (isReset) {
              setRecommendations(RECOMMENDED_YOUTUBE_VIDEOS);
            }
            setHasMoreRec(false);
          }
        } else {
          if (isReset) setRecommendations(RECOMMENDED_YOUTUBE_VIDEOS);
        }
      } catch {
        if (isReset) setRecommendations(RECOMMENDED_YOUTUBE_VIDEOS);
      } finally {
        if (isReset) setIsLoadingRec(false);
        setIsLoadingMoreRec(false);
      }
    },
    [seed]
  );

  // 2. Fetch Subscriptions from feed API
  const loadSubscriptions = useCallback(
    async (channels: SubscribedChannel[], page: number, isReset: boolean = false, customSeed?: number) => {
      if (channels.length === 0) {
        setSubVideos([]);
        setIsLoadingSubs(false);
        setIsLoadingMoreSub(false);
        setHasMoreSub(false);
        return;
      }

      const currentSeed = customSeed !== undefined ? customSeed : seed;
      if (isReset) {
        setIsLoadingSubs(true);
      } else {
        setIsLoadingMoreSub(true);
      }

      try {
        const channelIds = channels.map((c) => c.id).join(",");
        const resp = await fetch(
          `/api/youtube/feed?tab=subscriptions&channels=${encodeURIComponent(
            channelIds
          )}&page=${page}&limit=16&seed=${currentSeed}`
        );

        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.videos) && data.videos.length > 0) {
            if (isReset) {
              setSubVideos(data.videos);
              setSubPage(1);
            } else {
              setSubVideos((prev) => {
                const existingIds = new Set(prev.map((v) => v.id));
                const fresh = data.videos.filter(
                  (v: YouTubeRecommendedVideo) => !existingIds.has(v.id)
                );
                return [...prev, ...fresh];
              });
              setSubPage(page);
            }
            setHasMoreSub(Boolean(data.hasMore));
          } else {
            setHasMoreSub(false);
          }
        }
      } catch {
      } finally {
        if (isReset) setIsLoadingSubs(false);
        setIsLoadingMoreSub(false);
      }
    },
    [seed]
  );

  // Initial Load: Recommendations
  useEffect(() => {
    loadRecommendations(1, true);
  }, [loadRecommendations]);

  // Initial Load / Subscriptions change
  useEffect(() => {
    if (activeTab === "subscriptions") {
      loadSubscriptions(subscriptions, 1, true);
    }
  }, [subscriptions, activeTab, loadSubscriptions]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (activeTab === "favorites") return;
    const target = loadMoreTriggerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (activeTab === "recommendations") {
            if (!isLoadingMoreRec && !isLoadingRec && hasMoreRec) {
              loadRecommendations(recPage + 1, false);
            }
          } else if (activeTab === "subscriptions") {
            if (!isLoadingMoreSub && !isLoadingSubs && hasMoreSub) {
              loadSubscriptions(subscriptions, subPage + 1, false);
            }
          }
        }
      },
      {
        root: null,
        rootMargin: "500px",
        threshold: 0.1,
      }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [
    activeTab,
    recPage,
    hasMoreRec,
    isLoadingMoreRec,
    isLoadingRec,
    loadRecommendations,
    subPage,
    hasMoreSub,
    isLoadingMoreSub,
    isLoadingSubs,
    loadSubscriptions,
    subscriptions,
  ]);

  // Handle Refresh feed button (Shuffles recommendations with a fresh seed)
  const handleRefreshFeed = async () => {
    setIsRefreshing(true);
    const newSeed = Date.now();
    setSeed(newSeed);

    if (activeTab === "subscriptions") {
      setSubPage(1);
      setHasMoreSub(true);
      await loadSubscriptions(subscriptions, 1, true, newSeed);
    } else if (activeTab === "recommendations") {
      setRecPage(1);
      setHasMoreRec(true);
      await loadRecommendations(1, true, newSeed);
    }
    setIsRefreshing(false);
  };

  // Handle Search / Direct Watch (Seamless navigation inside same Chrome App window)
  const handleSearchOrWatch = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

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

  // Active base videos depending on active tab
  const baseVideos =
    activeTab === "recommendations"
      ? recommendations
      : activeTab === "subscriptions"
      ? subVideos
      : favorites;

  // Filter videos based on search query, difficulty level and channel
  const query = searchInput.trim().toLowerCase();
  const isSearchQuery = query.length > 0 && !extractYouTubeId(searchInput.trim());

  const currentVideos = baseVideos.filter((video) => {
    // 0. Filter out Shorts, streams and durations outside 5–25 min
    if (isYouTubeShort(video)) return false;

    // 1. Поиск по текущей активной вкладке
    const matchesSearch =
      !isSearchQuery ||
      video.title.toLowerCase().includes(query) ||
      video.channel.toLowerCase().includes(query) ||
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
      const chClean = video.channel.toLowerCase().trim();
      const selClean = selectedSubscribedChannel.toLowerCase().trim();
      return (
        chClean === selClean ||
        chClean.includes(selClean) ||
        video.channelId === selectedSubscribedChannel
      );
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24 px-4 md:px-12 pt-4">
      {/* Top Media Switcher: YouTube DE vs ARD & ZDF Mediathek */}
      <div className="max-w-7xl mx-auto mb-6 pt-2 flex items-center justify-center">
        <div className="inline-flex p-1 bg-zinc-900/90 border border-zinc-800 rounded-full shadow-lg">
          <button
            onClick={() => setMediaSection("youtube")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mediaSection === "youtube"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>YouTube DE</span>
          </button>
          <button
            onClick={() => setMediaSection("mediathek")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mediaSection === "mediathek"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>ARD & ZDF Mediathek</span>
          </button>
        </div>
      </div>

      {mediaSection === "mediathek" ? (
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

      {/* 1. Главная трехуровневая навигация (Табы первого уровня) */}
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

            {/* Таб 3: Избранное с бейджем сохраненных видео */}
            <button
              onClick={() => setActiveTab("favorites")}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "favorites"
                  ? "bg-red-600 text-white font-semibold shadow-lg shadow-red-950/40"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <span>Избранное</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "favorites"
                    ? "bg-white/20 text-white"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {favorites.length}
              </span>
            </button>
          </div>
        </div>

        {/* 2. Подпанель для каждой вкладки (Контекстные фильтры) */}
        {activeTab === "recommendations" && (
          <div className="flex items-center justify-between gap-3 pt-3 flex-wrap animate-in fade-in duration-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-400 font-medium mr-0.5">Уровень:</span>
              {[
                { id: "ALL", label: "Все уровни" },
                { id: "B1", label: "B1 (Средний)" },
                { id: "B2", label: "B2 (Продвинутый)" },
              ].map((chip) => {
                const isActive = selectedLevel === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setSelectedLevel(chip.id as "ALL" | "B1" | "B2")}
                    className={`px-3.5 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      isActive
                        ? "bg-white text-black font-semibold shadow-md"
                        : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}

              {/* Refresh feed button */}
              <button
                onClick={handleRefreshFeed}
                disabled={isRefreshing}
                className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer ml-1"
                title="Перемешать рекомендации"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#E50914]" : ""}`} />
              </button>
            </div>
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 animate-in fade-in duration-200">
            {/* Лента чипсов добавленных каналов */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSelectedSubscribedChannel("ALL")}
                className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                  selectedSubscribedChannel === "ALL"
                    ? "bg-white text-black font-semibold shadow-md"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                Все подписки
              </button>

              {subscriptions.map((ch) => {
                const isActive = selectedSubscribedChannel === ch.name || selectedSubscribedChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedSubscribedChannel(ch.name)}
                    className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                      isActive
                        ? "bg-white text-black font-semibold shadow-md"
                        : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
                    }`}
                  >
                    {ch.name}
                  </button>
                );
              })}
            </div>

            {/* Аккуратная кнопка + Добавить канал */}
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
        {/* Loading State on initial fetch */}
        {((activeTab === "subscriptions" && isLoadingSubs && subVideos.length === 0) ||
          (activeTab === "recommendations" && isLoadingRec && recommendations.length === 0)) ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
            <span className="text-sm font-medium">Загрузка свежих видео из немецких каналов...</span>
          </div>
        ) : currentVideos.length === 0 ? (
          /* Empty State */
          <div className="py-20 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center flex flex-col items-center justify-center p-8 gap-3 max-w-lg mx-auto">
            {activeTab === "favorites" ? (
              <>
                <Bookmark className="w-10 h-10 text-zinc-600" />
                <h3 className="text-base font-bold text-white">Вы пока не сохранили ни одного видео</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Нажмите на значок закладки на любой карточке, чтобы добавить видео в этот список.
                </p>
              </>
            ) : activeTab === "subscriptions" ? (
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
          /* Video Grid (Strictly non-Shorts, 5–25 min, opens in same window) */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {currentVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onRemoveFavorite={
                    activeTab === "favorites"
                      ? () => removeFavorite(video.id)
                      : undefined
                  }
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger Target */}
            {activeTab !== "favorites" && (
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
            )}
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
