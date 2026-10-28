"use client";

import React, { useState } from "react";
import { Play, ExternalLink, Bookmark } from "lucide-react";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import { useYouTube } from "@/context/YouTubeContext";

interface VideoCardProps {
  video: YouTubeRecommendedVideo & {
    youtube_id?: string;
    sentenceCount?: number;
    wordCount?: number;
  };
  onClick?: () => void;
  onRemoveFavorite?: () => void;
}

export default function VideoCard({ video, onRemoveFavorite }: VideoCardProps) {
  const { isFavorite, toggleFavorite } = useYouTube();
  const videoId = video.youtube_id || video.id;
  const [imgSrc, setImgSrc] = useState(
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  );
  const [isBroken, setIsBroken] = useState(false);

  const handleImageError = () => {
    if (imgSrc.includes("maxresdefault")) {
      setImgSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
    } else {
      setIsBroken(true);
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

  const handleOpenVideo = (youtubeId: string) => {
    window.location.href = `https://www.youtube.com/watch?v=${youtubeId}`;
  };

  const level = (video.level || "B1").toUpperCase();
  const isB2 = level.startsWith("B2") || level === "C1" || level === "C2";

  if (isBroken) return null;

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
      className="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-red-950/20 cursor-pointer text-left select-none"
    >
      {/* 1. Preview thumbnail */}
      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
        <img
          src={imgSrc}
          onError={handleImageError}
          alt={video.title}
          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25 pointer-events-none" />

        {/* Level badge in top-left */}
        <div className="absolute top-2.5 left-2.5 z-10">
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

        {/* Top-Right: ExternalLink icon & Bookmark */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFavoriteClick}
            className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md transition-all cursor-pointer group/fav"
            title={isFav ? "Удалить из избранного" : "Сохранить в избранное"}
          >
            <Bookmark
              size={14}
              className={
                isFav
                  ? "fill-[#E50914] text-[#E50914] scale-110 transition-transform"
                  : "text-zinc-400 group-hover/fav:text-white transition-colors"
              }
            />
          </button>
          <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-md">
            <ExternalLink size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Center Minimal Play Button on Hover */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg translate-y-2 group-hover:translate-y-0">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Duration badge in bottom-right */}
        {video.durationText && (
          <div className="absolute bottom-2 right-2.5 z-10 bg-black/85 text-zinc-300 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-sm">
            {video.durationText}
          </div>
        )}
      </div>

      {/* 2. Info below preview */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-1.5">
        <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 group-hover:text-white transition-colors leading-snug">
          {video.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
          <span className="truncate max-w-[180px] hover:text-zinc-300 transition-colors">
            {video.channel}
          </span>
          {(video.sentenceCount || video.wordCount) && (
            <span className="text-[11px] text-zinc-500 whitespace-nowrap">
              {video.sentenceCount ? `${video.sentenceCount} предл.` : `${video.wordCount} слов`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
