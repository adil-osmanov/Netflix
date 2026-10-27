"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Play, 
  Search, 
  Plus, 
  X, 
  AlertCircle, 
  Loader2, 
  Tv, 
  RotateCw,
  Settings2
} from "lucide-react";
import { 
  RECOMMENDED_YOUTUBE_VIDEOS, 
  extractYouTubeId 
} from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import InteractivePlayer from "@/components/youtube/InteractivePlayer";
import ManageChannelsModal, { SubscribedChannel } from "@/components/youtube/ManageChannelsModal";

const DEFAULT_SUBSCRIPTIONS: SubscribedChannel[] = [
  { id: "UCbxb2fqe9oNgglAoYqsYOtQ", name: "Easy German" },
  { id: "UCxUWIEL-USsiPak0Qy6_vVg", name: "DW Deutsch lernen" },
  { id: "UCZHpIFMfoJJ_1QxNGLJTzyA", name: "MrWissen2go" },
  { id: "UCUuab1dctZzN5ZmRmQnTzkg", name: "WDR Doku" },
];

/**
 * 100% Strict YouTube Shorts Filter:
 * - /shorts/ in url or id
 * - #shorts, #short, shorts, Short, Shorts in title or description
 * - duration < 90 seconds
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
    /\b(shorts?|tiktok|reels?)\b/i.test(title) ||
    /#(shorts?|tiktok|reels?)/i.test(title) ||
    /\b(shorts?|tiktok|reels?)\b/i.test(desc) ||
    /#(shorts?|tiktok|reels?)/i.test(desc)
  ) {
    return true;
  }

  if (video.duration && video.duration < 90) {
    return true;
  }

  if (video.durationText) {
    const parts = video.durationText.split(":").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const totalSec = parts[0] * 60 + parts[1];
      if (totalSec < 90) return true;
    }
  }

  return false;
}

export default function YouTubeCatalogPage() {
  // Search & Direct Watch
  const [searchInput, setSearchInput] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Active Video Modal
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title?: string;
    channel?: string;
  } | null>(null);

  // Tabs: 'recommendations' | 'subscriptions'
  const [activeTab, setActiveTab] = useState<"recommendations" | "subscriptions">("recommendations");

  // Manage Channels Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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
  const [recommendations, setRecommendations] = useState<YouTubeRecommendedVideo[]>(() => {
    return [...RECOMMENDED_YOUTUBE_VIDEOS].sort(() => Math.random() - 0.5);
  });
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

  // 1. Fetch Recommendations from API
  const loadRecommendations = useCallback(async (page: number, isReset: boolean = false) => {
    if (isReset) {
      setIsLoadingRec(true);
    } else {
      setIsLoadingMoreRec(true);
    }

    try {
      const resp = await fetch(`/api/youtube/recommendations?page=${page}&limit=16`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.videos && Array.isArray(data.videos)) {
          if (isReset) {
            setRecommendations(data.videos);
            setRecPage(1);
          } else {
            setRecommendations((prev) => {
              const existingIds = new Set(prev.map((v) => v.id));
              const fresh = data.videos.filter((v: YouTubeRecommendedVideo) => !existingIds.has(v.id));
              return [...prev, ...fresh];
            });
            setRecPage(page);
          }
          setHasMoreRec(data.hasMore !== false);
        }
      }
    } catch (err) {
      console.warn("Failed to load recommendations:", err);
    } finally {
      setIsLoadingRec(false);
      setIsLoadingMoreRec(false);
    }
  }, []);

  // 2. Fetch Subscriptions from API
  const loadSubscriptions = useCallback(async (currentSubs: SubscribedChannel[], page: number, isReset: boolean = false) => {
    if (currentSubs.length === 0) {
      setSubVideos([]);
      setHasMoreSub(false);
      return;
    }

    if (isReset) {
      setIsLoadingSubs(true);
    } else {
      setIsLoadingMoreSub(true);
    }

    try {
      const channelIds = currentSubs.map((s) => s.id).join(",");
      const resp = await fetch(
        `/api/youtube/subscriptions?channelIds=${encodeURIComponent(channelIds)}&page=${page}&limit=16`
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.videos && Array.isArray(data.videos)) {
          if (isReset) {
            setSubVideos(data.videos);
            setSubPage(1);
          } else {
            setSubVideos((prev) => {
              const existingIds = new Set(prev.map((v) => v.id));
              const fresh = data.videos.filter((v: YouTubeRecommendedVideo) => !existingIds.has(v.id));
              return [...prev, ...fresh];
            });
            setSubPage(page);
          }
          setHasMoreSub(data.hasMore === true);
        }
      }
    } catch (err) {
      console.warn("Failed to load subscriptions:", err);
    } finally {
      setIsLoadingSubs(false);
      setIsLoadingMoreSub(false);
    }
  }, []);

  // Initial loads
  useEffect(() => {
    loadRecommendations(1, true);
  }, [loadRecommendations]);

  useEffect(() => {
    loadSubscriptions(subscriptions, 1, true);
  }, [subscriptions, loadSubscriptions]);

  // Infinite Scroll Observer for both tabs
  useEffect(() => {
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
          } else {
            if (!isLoadingMoreSub && !isLoadingSubs && hasMoreSub) {
              loadSubscriptions(subscriptions, subPage + 1, false);
            }
          }
        }
      },
      {
        root: null,
        rootMargin: "400px",
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

  // Handle Refresh feed button
  const handleRefreshFeed = async () => {
    setIsRefreshing(true);
    if (activeTab === "subscriptions") {
      await loadSubscriptions(subscriptions, 1, true);
    } else {
      await loadRecommendations(1, true);
    }
    setIsRefreshing(false);
  };

  // Handle Search / Direct Watch
  const handleSearchOrWatch = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const directId = extractYouTubeId(trimmed);
    if (directId) {
      setActiveVideo({
        id: directId,
        title: "Пользовательское видео",
        channel: "YouTube",
      });
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

  // Filter recommendations & subscriptions based on search query
  const query = searchInput.trim().toLowerCase();
  const isSearchQuery = query.length > 0 && !extractYouTubeId(searchInput.trim());

  const filteredRecommendations = (
    isSearchQuery
      ? recommendations.filter(
          (v) =>
            v.title.toLowerCase().includes(query) ||
            v.channel.toLowerCase().includes(query) ||
            v.description.toLowerCase().includes(query) ||
            v.level.toLowerCase().includes(query)
        )
      : recommendations
  ).filter((v) => !isYouTubeShort(v));

  const filteredSubVideos = (
    isSearchQuery
      ? subVideos.filter(
          (v) =>
            v.title.toLowerCase().includes(query) ||
            v.channel.toLowerCase().includes(query)
        )
      : subVideos
  ).filter((v) => !isYouTubeShort(v));

  const currentVideos =
    activeTab === "recommendations" ? filteredRecommendations : filteredSubVideos;

  // Handle Next Video callback for player
  const handleNextVideo = () => {
    if (!activeVideo || currentVideos.length === 0) return;
    const currentIndex = currentVideos.findIndex((v) => v.id === activeVideo.id);
    if (currentIndex >= 0 && currentIndex < currentVideos.length - 1) {
      const next = currentVideos[currentIndex + 1];
      setActiveVideo({ id: next.id, title: next.title, channel: next.channel });
    } else {
      const next = currentVideos[0];
      setActiveVideo({ id: next.id, title: next.title, channel: next.channel });
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24 px-4 md:px-12 pt-4">
      {/* Top Controls: Centered Clean Search Bar */}
      <div className="max-w-3xl mx-auto mb-8 pt-2">
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

      {/* Netflix-style Tabs Switcher & Actions */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          {/* Left: Tab Buttons + Refresh Icon */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab("recommendations")}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "recommendations"
                  ? "bg-[#E50914] text-white shadow-lg shadow-red-950/40"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              Рекомендации B1–B2
            </button>

            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "subscriptions"
                  ? "bg-[#E50914] text-white shadow-lg shadow-red-950/40"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <span>Мои подписки</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === "subscriptions"
                    ? "bg-white/20 text-white"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {subscriptions.length}
              </span>
            </button>

            {/* Refresh feed button */}
            <button
              onClick={handleRefreshFeed}
              disabled={isRefreshing}
              className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer ml-1"
              title="Обновить ленту"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#E50914]" : ""}`} />
            </button>
          </div>

          {/* Right: Channel Management & Add Channel ONLY rendered on subscriptions tab */}
          {activeTab === "subscriptions" && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200">
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                title="Настроить немецкие каналы"
              >
                <Settings2 size={13} className="text-zinc-400" />
                <span className="hidden sm:inline">Каналы ({subscriptions.length})</span>
              </button>

              <button
                onClick={() => setIsManageModalOpen(true)}
                className="flex items-center px-3.5 py-2 rounded-full bg-[#E50914] hover:bg-[#b80710] text-xs font-bold text-white transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Plus size={14} className="mr-1.5" />
                <span>Добавить канал</span>
              </button>
            </div>
          )}
        </div>
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
            <Tv className="w-10 h-10 text-zinc-600" />
            <h3 className="text-base font-bold text-white">Видео не найдены</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isSearchQuery
                ? `По запросу «${searchInput}» ничего не найдено.`
                : activeTab === "subscriptions"
                ? "В ваших подписках пока нет доступных длинных видео."
                : "В каталоге пока нет видео по выбранным критериям."}
            </p>
            {activeTab === "subscriptions" && (
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold hover:bg-[#b80710] transition-colors cursor-pointer"
              >
                Добавить немецкий YouTube-канал
              </button>
            )}
          </div>
        ) : (
          /* Video Grid (Strictly non-Shorts) */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {currentVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() =>
                    setActiveVideo({
                      id: video.id,
                      title: video.title,
                      channel: video.channel,
                    })
                  }
                  className="group bg-zinc-900/50 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />

                    {/* Level Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow ${
                          video.level === "B2"
                            ? "bg-amber-600 text-white"
                            : video.level === "C1"
                            ? "bg-purple-600 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {video.level || "B1"}
                      </span>
                    </div>

                    {/* Duration Badge */}
                    {video.durationText && (
                      <div className="absolute bottom-2 right-2.5 z-10 bg-black/80 text-zinc-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10">
                        {video.durationText}
                      </div>
                    )}

                    {/* Play Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="w-11 h-11 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between">
                    <div>
                      <span className="text-[#E50914] text-[10px] font-bold uppercase tracking-wider block mb-1">
                        {video.channel}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                        {video.title}
                      </h3>
                    </div>

                    {video.description && (
                      <p className="text-zinc-500 text-[11px] line-clamp-2 mt-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>
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

      {/* Modal Interactive Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
          <InteractivePlayer
            videoId={activeVideo.id}
            videoTitle={activeVideo.title}
            channelTitle={activeVideo.channel}
            onBackToCatalog={() => setActiveVideo(null)}
            onNextVideo={handleNextVideo}
          />
        </div>
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
