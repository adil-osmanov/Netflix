"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Play, 
  Search, 
  Plus, 
  X, 
  AlertCircle, 
  Loader2, 
  Tv, 
  RotateCw,
  Settings2,
  Sparkles,
  BookOpen
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
  { id: "UCUuab1dctZzN5ZmRmQnTzkg", name: "WDR Doku" },
  { id: "UCxUWIEL-USsiPak0Qy6_vVg", name: "DW Deutsch lernen" },
  { id: "UCZHpIFMfoJJ_1QxNGLJTzyA", name: "MrWissen2go" },
];

/**
 * Helper to strictly filter out YouTube Shorts:
 * - /shorts/ in url or id
 * - #shorts, #short, shorts, #tiktok, #reel in title/description
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

  if (
    id.includes("shorts") ||
    title.includes("#shorts") ||
    title.includes("#short") ||
    title.includes("shorts") ||
    title.includes("#tiktok") ||
    title.includes("#reel") ||
    desc.includes("#shorts") ||
    desc.includes("#short") ||
    desc.includes("#tiktok") ||
    desc.includes("#reel")
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

  // Subscriptions & Dynamic Feed
  const [subscriptions, setSubscriptions] = useState<SubscribedChannel[]>(DEFAULT_SUBSCRIPTIONS);
  const [subVideos, setSubVideos] = useState<YouTubeRecommendedVideo[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(false);

  // Manage Channels Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);

  // Pagination: how many cards to show initially
  const [visibleCount, setVisibleCount] = useState<number>(16);

  // Load subscriptions from localStorage
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

  // Re-fetch subscription feeds via RSS route without full page reload
  const loadSubFeeds = useCallback(async (currentSubs: SubscribedChannel[]) => {
    if (currentSubs.length === 0) {
      setSubVideos([]);
      return;
    }

    setIsLoadingSubs(true);
    const allVideos: YouTubeRecommendedVideo[] = [];

    // Parallel fetching for high performance
    await Promise.all(
      currentSubs.map(async (sub) => {
        try {
          const resp = await fetch(`/api/youtube/channel?channelId=${encodeURIComponent(sub.id)}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.videos && Array.isArray(data.videos)) {
              allVideos.push(...data.videos);
            }
          }
        } catch (err) {
          console.warn("Feed error for", sub.name, err);
        }
      })
    );

    // Filter out shorts and deduplicate by videoId
    const seenIds = new Set<string>();
    const nonShorts: YouTubeRecommendedVideo[] = [];

    for (const v of allVideos) {
      if (seenIds.has(v.id)) continue;
      if (isYouTubeShort(v)) continue;
      seenIds.add(v.id);
      nonShorts.push(v);
    }

    setSubVideos(nonShorts);
    setIsLoadingSubs(false);
  }, []);

  // Fetch feeds on mount & when subscriptions change
  useEffect(() => {
    loadSubFeeds(subscriptions);
  }, [subscriptions, loadSubFeeds]);

  // Handle Search / Direct Watch
  const handleSearchOrWatch = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const trimmed = searchInput.trim();
    if (!trimmed) return;

    // Direct YouTube link or 11-char ID
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
      ? RECOMMENDED_YOUTUBE_VIDEOS.filter(
          (v) =>
            v.title.toLowerCase().includes(query) ||
            v.channel.toLowerCase().includes(query) ||
            v.description.toLowerCase().includes(query) ||
            v.level.toLowerCase().includes(query)
        )
      : RECOMMENDED_YOUTUBE_VIDEOS
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

  const displayedVideos = currentVideos.slice(0, visibleCount);

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
              onClick={() => {
                setActiveTab("recommendations");
                setVisibleCount(16);
              }}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "recommendations"
                  ? "bg-[#E50914] text-white shadow-lg shadow-red-950/40"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              Рекомендации B1–B2
            </button>

            <button
              onClick={() => {
                setActiveTab("subscriptions");
                setVisibleCount(16);
              }}
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
              onClick={() => loadSubFeeds(subscriptions)}
              disabled={isLoadingSubs}
              className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              title="Обновить ленту видео"
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${isLoadingSubs ? "animate-spin text-[#E50914]" : ""}`}
              />
            </button>
          </div>

          {/* Right: Channel Management & Add Channel */}
          <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E50914] hover:bg-[#b80710] text-xs font-bold text-white transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>Добавить канал</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Feed Area */}
      <div className="max-w-7xl mx-auto">
        {/* Loading State for Subscriptions */}
        {activeTab === "subscriptions" && isLoadingSubs && subVideos.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
            <span className="text-sm font-medium">Загрузка свежих видео из немецких каналов...</span>
          </div>
        ) : displayedVideos.length === 0 ? (
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
                className="mt-2 px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold hover:bg-[#b80710] transition-colors"
              >
                Добавить немецкий YouTube-канал
              </button>
            )}
          </div>
        ) : (
          /* Video Grid (Strictly non-Shorts) */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {displayedVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() =>
                    setActiveVideo({ id: video.id, title: video.title, channel: video.channel })
                  }
                  className="group relative bg-[#181818] rounded-xl overflow-hidden border border-zinc-800/80 hover:border-zinc-600 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-20 flex flex-col cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative w-full aspect-video bg-zinc-900 overflow-hidden">
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

            {/* Pagination: Load More Button */}
            {currentVideos.length > visibleCount && (
              <div className="flex justify-center pt-10">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 16)}
                  className="px-8 py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 text-sm font-bold text-zinc-200 hover:text-white transition-all shadow-xl cursor-pointer active:scale-95"
                >
                  Загрузить ещё (+{Math.min(16, currentVideos.length - visibleCount)})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Interactive Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-7xl flex justify-end mb-2">
            <button
              onClick={() => setActiveVideo(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Закрыть плеер</span>
            </button>
          </div>

          <InteractivePlayer
            videoId={activeVideo.id}
            videoTitle={activeVideo.title}
            channelTitle={activeVideo.channel}
            onBackToCatalog={() => setActiveVideo(null)}
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
