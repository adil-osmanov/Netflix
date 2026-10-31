"use client";

import React, { useState } from "react";
import { Play, Bookmark } from "lucide-react";
import { MediathekMediaItem } from "./MediathekCatalog";
import { getSenderBadgeLabel, getLevelBadgeColor } from "@/lib/mediathekChannels";

interface MediathekCardProps {
  video: MediathekMediaItem;
  isFav: boolean;
  onToggleFavorite: (e: React.MouseEvent, item: MediathekMediaItem) => void;
  onClick: (url: string) => void;
}

export function MediathekCard({
  video,
  isFav,
  onToggleFavorite,
  onClick,
}: MediathekCardProps) {
  const [imgError, setImgError] = useState(false);

  // Если изображение не загрузилось или вернуло 404/500, полностью скрываем карточку
  if (imgError) return null;

  const poster =
    video.posterUrl ||
    video.thumbnailUrl ||
    (video as any).imageUrl ||
    (video as any).preview_url ||
    (video as any).thumbnail ||
    "";

  // Если URL обложки пустой или это SVG заглушка — скрываем карточку
  if (!poster || poster.startsWith("data:image/svg") || poster.length < 12) {
    return null;
  }

  const normalizedSenderName = getSenderBadgeLabel(video.channel || (video as any).sender || "");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(video.url_website)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(video.url_website);
        }
      }}
      className="group relative flex flex-col cursor-pointer text-left select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
    >
      {/* 1. Превью 16:9 с постером */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80 group-hover:border-zinc-700 transition-all duration-300">
        <img
          src={poster}
          alt={video.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Top-Left: Контрастные бейджи вещателя и уровня */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 select-none pointer-events-none">
          {/* Бейдж канала */}
          <span className="bg-zinc-950/90 text-zinc-100 border border-zinc-700/70 font-black px-2 py-0.5 rounded text-[10px] tracking-wider uppercase shadow-md backdrop-blur-sm">
            {normalizedSenderName}
          </span>

          {/* Бейдж языкового уровня */}
          {video.level && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase shadow-md ${getLevelBadgeColor(
                video.level
              )}`}
            >
              {video.level}
            </span>
          )}
        </div>

        {/* Top-Right: Кнопка «В избранное» */}
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

        {/* Center: Кнопка воспроизведения при наведении */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg translate-y-2 group-hover:translate-y-0">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Bottom-Right: Длительность передачи */}
        {video.duration > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-[11px] font-medium text-white backdrop-blur-sm border border-white/10 font-mono">
            {video.duration} Min.
          </span>
        )}
      </div>

      {/* 2. Название ролика под постером */}
      <h3 className="mt-2 text-sm font-medium text-zinc-100 line-clamp-2 group-hover:text-white transition-colors leading-snug">
        {video.title}
      </h3>
      <p className="text-xs text-zinc-500 mt-1 truncate">
        {normalizedSenderName} {video.topic ? `• ${video.topic}` : ""}
      </p>
    </div>
  );
}

export default MediathekCard;
