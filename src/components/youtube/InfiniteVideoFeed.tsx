"use client";

import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import VideoCard from "./VideoCard";

export function appendUniqueVideos<T extends { id?: string; youtube_id?: string; url_website?: string }>(
  prev: T[],
  newItems: T[]
): T[] {
  const existingIds = new Set(
    prev.map((i) => i.youtube_id || i.id || i.url_website).filter(Boolean)
  );
  const filtered = newItems.filter((i) => {
    const key = i.youtube_id || i.id || i.url_website;
    if (!key || existingIds.has(key)) return false;
    existingIds.add(key);
    return true;
  });
  return [...prev, ...filtered];
}

interface InfiniteVideoFeedProps {
  items: YouTubeRecommendedVideo[];
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  loadingLabel?: string;
}

export default function InfiniteVideoFeed({
  items,
  hasMore,
  isFetchingMore,
  onLoadMore,
  loadingLabel = "Загрузка новых видео...",
}: InfiniteVideoFeedProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, onLoadMore]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {items.map((video) => (
          <VideoCard
            key={(video as any).youtube_id || video.id || (video as any).url_website}
            video={video}
          />
        ))}
      </div>

      {/* Intersection Sentinel */}
      <div
        ref={sentinelRef}
        className="h-24 w-full flex items-center justify-center mt-4"
      >
        {isFetchingMore && (
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-zinc-900/90 border border-zinc-800 shadow-lg text-zinc-300 text-xs sm:text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-[#E50914]" />
            <span>{loadingLabel}</span>
          </div>
        )}
      </div>
    </>
  );
}
