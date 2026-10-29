"use client";

import React, { useState } from "react";
import { Play, Bookmark } from "lucide-react";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import { useYouTube } from "@/context/YouTubeContext";

export function isValidDuration(durationStr?: string, seconds?: number): boolean {
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

function getFallbackPoster(channel: string, topic: string): string {
  const ch = channel || "ARD / ZDF";
  const bg = ch.toUpperCase().includes("ZDF")
    ? "#e05a10"
    : ch.toUpperCase().includes("ARTE")
    ? "#c82828"
    : "#003366";

  const safeChannel = ch.replace(/[<>&"']/g, "");
  const safeTopic = (topic || "Mediathek").slice(0, 35).replace(/[<>&"']/g, "");

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%2318181b"/><rect width="640" height="360" fill="${encodeURIComponent(bg)}" opacity="0.35"/><text x="40" y="80" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="28">${encodeURIComponent(safeChannel)}</text><text x="40" y="140" fill="%23e4e4e7" font-family="sans-serif" font-weight="bold" font-size="22">${encodeURIComponent(safeTopic)}</text></svg>`;
}

interface VideoCardProps {
  video: YouTubeRecommendedVideo & {
    youtube_id?: string;
    url_website?: string;
    duration_str?: string;
    duration?: number;
    sentenceCount?: number;
    wordCount?: number;
  };
  onClick?: () => void;
  onRemoveFavorite?: () => void;
}

export default function VideoCard({ video, onRemoveFavorite }: VideoCardProps) {
  const { isFavorite, toggleFavorite } = useYouTube();
  const videoId = video.youtube_id || video.id || video.url_website || "";
  const isExternalUrl =
    videoId.startsWith("http://") ||
    videoId.startsWith("https://") ||
    Boolean(video.url_website);

  const durationDisplay = video.durationText || video.duration_str;

  const [isDead, setIsDead] = useState(false);
  const [thumbUrl, setThumbUrl] = useState(() => {
    if (video.thumbnailUrl && !video.thumbnailUrl.includes("maxresdefault")) {
      return video.thumbnailUrl;
    }
    if (isExternalUrl) {
      return video.thumbnailUrl || getFallbackPoster(video.channel || "ARD / ZDF", video.title || "");
    }
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  });

  // Строгая клиентская проверка для YouTube: бан Shorts и видео короче 10 минут
  if (!isExternalUrl) {
    const combinedText = `${videoId} ${video.title || ""} ${video.description || ""}`.toLowerCase();
    if (
      /\b(shorts?|short|vertical|tiktok|reels?)\b/i.test(combinedText) ||
      /#(shorts?|short|vertical|tiktok|reels?)/i.test(combinedText) ||
      combinedText.includes("/shorts/")
    ) {
      return null;
    }
    if (durationDisplay && !isValidDuration(durationDisplay, video.duration)) {
      return null;
    }
  }

  const handleImageError = () => {
    if (isExternalUrl) {
      setThumbUrl(getFallbackPoster(video.channel || "ARD / ZDF", video.title || ""));
      return;
    }
    if (thumbUrl.includes("maxresdefault")) {
      setThumbUrl(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
    } else {
      setIsDead(true);
    }
  };

  const isFav = isFavorite(video.id) || (video.url_website ? isFavorite(video.url_website) : false);

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
    if (video.url_website) {
      window.location.href = video.url_website;
      return;
    }
    window.location.href = `https://www.youtube.com/watch?v=${id}`;
  };

  const level = (video.level || "B1").toUpperCase();
  const getLevelBadgeClass = (lvl: string) => {
    if (lvl.startsWith("A1") || lvl.startsWith("A2")) {
      return "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400";
    }
    if (lvl.startsWith("B1") || lvl.startsWith("B2")) {
      return "bg-sky-500/20 border border-sky-500/40 text-sky-400";
    }
    if (lvl.startsWith("C1") || lvl.startsWith("C2")) {
      return "bg-red-500/20 border border-red-500/40 text-red-400";
    }
    return "bg-sky-500/20 border border-sky-500/40 text-sky-400";
  };

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
      className="group relative flex flex-col cursor-pointer text-left select-none outline-none focus:outline-none focus:ring-0 active:bg-opacity-90 [-webkit-tap-highlight-color:transparent]"
    >
      {/* 1. Preview 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 group-hover:border-zinc-700 transition-all duration-300">
        <img
          src={thumbUrl || getFallbackPoster(video.channel || "ARD / ZDF", video.title || "")}
          alt={video.title}
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Top-Left: Channel Badge (if Mediathek) or Level Badge */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
          {video.channel && isExternalUrl && (
            <span className="bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md">
              {video.channel}
            </span>
          )}
          <span
            className={`${getLevelBadgeClass(level)} text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md`}
          >
            {level}
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
