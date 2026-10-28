"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Search, 
  X, 
  AlertCircle, 
  Loader2, 
  RotateCw,
  Video
} from "lucide-react";
import { 
  RECOMMENDED_YOUTUBE_VIDEOS, 
  extractYouTubeId 
} from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import VideoCard from "@/components/youtube/VideoCard";

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
  // Search & Direct Watch
  const [searchInput, setSearchInput] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Difficulty Level Filter: 'ALL' | 'B1' | 'B2'
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | "B1" | "B2">("ALL");

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Random seed generated on initial load (randomizes order on every load / refresh)
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000) + 1);

  // Infinite Scroll Trigger Ref
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<YouTubeRecommendedVideo[]>([]);
  const [recPage, setRecPage] = useState<number>(1);
  const [hasMoreRec, setHasMoreRec] = useState<boolean>(true);
  const [isLoadingRec, setIsLoadingRec] = useState<boolean>(false);
  const [isLoadingMoreRec, setIsLoadingMoreRec] = useState<boolean>(false);

  // Fetch Recommendations from unified feed API
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

  // Initial Load: Recommendations
  useEffect(() => {
    loadRecommendations(1, true);
  }, [loadRecommendations]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    const target = loadMoreTriggerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (!isLoadingMoreRec && !isLoadingRec && hasMoreRec) {
            loadRecommendations(recPage + 1, false);
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
    recPage,
    hasMoreRec,
    isLoadingMoreRec,
    isLoadingRec,
    loadRecommendations,
  ]);

  // Handle Refresh feed button (Shuffles recommendations with a fresh seed)
  const handleRefreshFeed = async () => {
    setIsRefreshing(true);
    const newSeed = Date.now();
    setSeed(newSeed);
    setRecPage(1);
    setHasMoreRec(true);
    await loadRecommendations(1, true, newSeed);
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

  // Filter recommendations based on search query and difficulty level
  const query = searchInput.trim().toLowerCase();
  const isSearchQuery = query.length > 0 && !extractYouTubeId(searchInput.trim());

  const currentVideos = recommendations.filter((video) => {
    // 0. Filter out Shorts, streams and durations outside 5–25 min
    if (isYouTubeShort(video)) return false;

    // 1. Поиск
    const matchesSearch =
      !isSearchQuery ||
      video.title.toLowerCase().includes(query) ||
      video.channel.toLowerCase().includes(query) ||
      (video.description || "").toLowerCase().includes(query);

    // 2. Уровень B1 / B2
    const l = (video.level || "B1").toUpperCase();
    const isB2 = l.startsWith("B2") || l === "C1" || l === "C2";
    const matchesLevel =
      selectedLevel === "ALL" ||
      (selectedLevel === "B1" && !isB2) ||
      (selectedLevel === "B2" && isB2);

    return matchesSearch && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24 px-4 md:px-12 pt-4">
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

      {/* Simplified Controls: Level Chips + Refresh Button */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {[
              { id: "ALL", label: "Рекомендации B1–B2" },
              { id: "B1", label: "B1 (Средний)" },
              { id: "B2", label: "B2 (Продвинутый)" },
            ].map((chip) => {
              const isActive = selectedLevel === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setSelectedLevel(chip.id as "ALL" | "B1" | "B2")}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-black shadow-lg shadow-white/10"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
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
              className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer ml-1"
              title="Обновить рекомендации"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#E50914]" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Feed Area */}
      <div className="max-w-7xl mx-auto">
        {/* Loading State on initial fetch */}
        {isLoadingRec && recommendations.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
            <span className="text-sm font-medium">Загрузка свежих видео из немецких каналов...</span>
          </div>
        ) : currentVideos.length === 0 ? (
          /* Empty State */
          <div className="py-20 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center flex flex-col items-center justify-center p-8 gap-3 max-w-lg mx-auto">
            <Video className="w-10 h-10 text-zinc-600" />
            <h3 className="text-base font-bold text-white">Видео не найдены</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isSearchQuery
                ? `По запросу «${searchInput}» ничего не найдено.`
                : "В каталоге пока нет видео по выбранным критериям."}
            </p>
          </div>
        ) : (
          /* Video Grid (Strictly non-Shorts, 5–25 min, opens in same window) */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {currentVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger Target */}
            <div
              ref={loadMoreTriggerRef}
              className="h-20 w-full flex items-center justify-center mt-6 pointer-events-none"
            >
              {isLoadingMoreRec && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-[#E50914]" />
                  <span>Загрузка новых видео...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
