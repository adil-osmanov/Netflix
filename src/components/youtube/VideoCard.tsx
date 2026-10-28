"use client";

import React, { useState } from "react";
import { Play, Bookmark } from "lucide-react";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import { useYouTube } from "@/context/YouTubeContext";

interface VideoCardProps {
  video: YouTubeRecommendedVideo;
  onClick: () => void;
  onRemoveFavorite?: () => void;
}

export default function VideoCard({ video, onClick, onRemoveFavorite }: VideoCardProps) {
  const { isFavorite, toggleFavorite } = useYouTube();
  const [thumbSrc, setThumbSrc] = useState(
    video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
  );

  const isFav = isFavorite(video.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveFavorite) {
      onRemoveFavorite();
    } else {
      toggleFavorite(video);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-zinc-900/50 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col"
    >
      {/* 1. Thumbnail Container with Duration & Difficulty Badges & Bookmark */}
      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
        <img
          src={thumbSrc}
          onError={() => {
            if (!thumbSrc.includes("mqdefault")) {
              setThumbSrc(`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`);
            }
          }}
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

        {/* Bookmark Favorite Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md transition-all cursor-pointer group/fav"
          title={isFav ? "Удалить из избранного" : "Сохранить в избранное"}
        >
          <Bookmark
            size={16}
            className={
              isFav
                ? "fill-[#E50914] text-[#E50914] scale-110 transition-transform"
                : "text-zinc-400 group-hover/fav:text-white transition-colors"
            }
          />
        </button>

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

      {/* 2. Channel & Video Title */}
      <div className="p-3.5 flex flex-col flex-1 justify-between">
        <div>
          <span className="text-red-500 text-xs font-semibold uppercase tracking-wider block mb-1">
            {video.channel}
          </span>
          <h3 className="line-clamp-2 text-sm font-medium text-white group-hover:text-red-400 transition-colors leading-snug">
            {video.title}
          </h3>
        </div>
      </div>
    </div>
  );
}
