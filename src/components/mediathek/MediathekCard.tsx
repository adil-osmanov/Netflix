"use client";

import React, { useState } from "react";
import { Play, Bookmark } from "lucide-react";
import { sanitizeThumbnailUrl } from "@/lib/mediathek";
import { getSenderBadgeLabel, getLevelBadgeColor } from "@/lib/mediathekChannels";
import { MediathekMediaItem } from "./MediathekCatalog";

interface MediathekCardProps {
  video: MediathekMediaItem | {
    id: string;
    title: string;
    sender?: string;
    channel?: string;
    thumbnail?: string;
    thumbnailUrl?: string;
    posterUrl?: string;
    duration?: number | string;
    level?: string;
    url?: string;
    url_website?: string;
    topic?: string;
  };
  isFav?: boolean;
  onToggleFavorite?: (e: React.MouseEvent, item: any) => void;
  onClick?: (url: string) => void;
}

export function MediathekCard({
  video,
  isFav = false,
  onToggleFavorite,
  onClick,
}: MediathekCardProps) {
  const [hasError, setHasError] = useState(false);

  const rawThumb =
    (video as any).thumbnail ||
    (video as any).thumbnailUrl ||
    (video as any).posterUrl ||
    (video as any).imageUrl ||
    "";
  const thumbnail = sanitizeThumbnailUrl(rawThumb);

  // Если обложки нет вообще или ссылка сломалась (404/битый URL), скрываем карточку
  if (
    hasError ||
    !thumbnail ||
    thumbnail.trim().length < 12 ||
    thumbnail.startsWith("data:image/svg")
  ) {
    return null;
  }

  const videoUrl = (video as any).url_website || (video as any).url || "";
  const senderName = getSenderBadgeLabel((video as any).channel || (video as any).sender || "");
  const durationVal = (video as any).duration;

  const handleClick = () => {
    if (onClick && videoUrl) {
      onClick(videoUrl);
    } else if (videoUrl) {
      window.location.href = videoUrl;
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group relative flex flex-col cursor-pointer transition-transform duration-300 hover:scale-[1.03] text-left select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-zinc-900 border border-zinc-800/40">
        {/* Нативный img вместо next/image решает проблему 400 Bad Request */}
        <img
          src={thumbnail}
          alt={video.title}
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover select-none transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Бейдж канала и уровня языка в левом углу */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 select-none pointer-events-none">
          <span className="bg-zinc-950/90 text-zinc-100 border border-zinc-700/60 font-black px-2 py-0.5 rounded text-[10px] tracking-wider uppercase shadow-md">
            {senderName}
          </span>
          {video.level && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold shadow ${getLevelBadgeColor(
                video.level
              )}`}
            >
              {video.level}
            </span>
          )}
        </div>

        {/* Кнопка «В избранное» */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => onToggleFavorite(e, video)}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white transition z-20 cursor-pointer backdrop-blur-md select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
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
        )}

        {/* Кнопка воспроизведения при наведении */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg translate-y-2 group-hover:translate-y-0">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Длительность в правом нижнем углу */}
        {durationVal && (
          <div className="absolute bottom-2 right-2 z-10 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-200 font-mono">
            {typeof durationVal === "number"
              ? `${Math.round(durationVal > 180 ? durationVal / 60 : durationVal)} Min.`
              : durationVal}
          </div>
        )}
      </div>

      <h3 className="mt-2 text-[13px] font-semibold text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">
        {video.title}
      </h3>
      <p className="text-[11px] text-zinc-500 line-clamp-1">
        {senderName} {(video as any).topic ? `• ${(video as any).topic}` : ""}
      </p>
    </div>
  );
}

export default MediathekCard;
