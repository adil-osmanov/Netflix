"use client";

import React, { useState } from "react";
import { Play, Bookmark } from "lucide-react";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import { useYouTube } from "@/context/YouTubeContext";

interface VideoCardProps {
  video: YouTubeRecommendedVideo & {
    youtube_id?: string;
    duration_str?: string;
    sentenceCount?: number;
    wordCount?: number;
  };
  onClick?: () => void;
  onRemoveFavorite?: () => void;
}

export default function VideoCard({ video, onRemoveFavorite }: VideoCardProps) {
  const { isFavorite, toggleFavorite } = useYouTube();
  const videoId = video.youtube_id || video.id;

  const [isDead, setIsDead] = useState(false);
  const [thumbUrl, setThumbUrl] = useState(() => {
    if (video.thumbnailUrl && !video.thumbnailUrl.includes("maxresdefault")) {
      return video.thumbnailUrl;
    }
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  });

  const handleImageError = () => {
    if (thumbUrl.includes("maxresdefault")) {
      setThumbUrl(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
    } else {
      // If hqdefault also fails, completely remove card from DOM
      setIsDead(true);
    }
  };

  const isFav = isFavorite(video.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemoveFavorite) {
      onRemoveFavorite();
    } else {
      toggleFavorite(video);
    }
  };

  const handleOpenVideo = (id: string) => {
    if (id.startsWith("http://") || id.startsWith("https://")) {
      window.location.href = id;
      return;
    }
    window.location.href = `https://www.youtube.com/watch?v=${id}`;
  };

  const level = (video.level || "B1").toUpperCase();
  const isB2 = level.startsWith("B2") || level === "C1" || level === "C2";
  const durationDisplay = video.durationText || video.duration_str;

  // Complete removal from grid if video or thumbnail is broken
  if (isDead) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => handleOpenVideo(videoId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpenVideo(videoId);
        }
      }}
      className="group relative flex flex-col cursor-pointer text-left select-none"
    >
      {/* 1. Preview 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 group-hover:border-zinc-700 transition-all duration-300">
        <img
          src={thumbUrl}
          alt={video.title}
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Top-Left: Level Badge */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
          <span
            className={
              isB2
                ? "bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md"
                : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md"
            }
          >
            {isB2 ? "B2" : "B1"}
          </span>
        </div>

        {/* Top-Right: Bookmark Favorite Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
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

        {/* Center Minimal Play Button on Hover */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg translate-y-2 group-hover:translate-y-0">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Bottom-Right: Duration Badge */}
        {durationDisplay && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-[11px] font-medium text-white backdrop-blur-sm border border-white/10 font-mono">
            {durationDisplay}
          </div>
        )}
      </div>

      {/* 2. Text Below Preview (Title and Channel) */}
      <h3 className="mt-2 text-sm font-medium text-zinc-100 line-clamp-2 group-hover:text-white transition-colors leading-snug">
        {video.title}
      </h3>
      <p className="text-xs text-zinc-500 mt-0.5 truncate">{video.channel}</p>
    </div>
  );
}
