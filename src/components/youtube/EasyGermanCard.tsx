"use client";

import React from "react";
import { Play, Check, Trash2 } from "lucide-react";
import { EasyGermanVideo } from "@/types/youtube";

interface EasyGermanCardProps {
  video: EasyGermanVideo;
  isWatched: boolean;
  index?: number;
  onOpen: (video: EasyGermanVideo) => void;
  onToggleWatched: (youtubeId: string, e?: React.MouseEvent) => void;
  onDelete: (videoId: string) => void;
}

export default function EasyGermanCard({
  video,
  isWatched,
  index = 1,
  onOpen,
  onToggleWatched,
  onDelete,
}: EasyGermanCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(video)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(video);
        }
      }}
      className={`group relative flex flex-col cursor-pointer text-left select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] rounded-2xl p-1.5 transition-all duration-300 hover:-translate-y-1 border border-zinc-800/80 ${
        isWatched
          ? "opacity-50 hover:opacity-100 filter grayscale-[25%] hover:grayscale-0"
          : "hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]"
      }`}
    >
      {/* Превью контейнер с мягким ховер-эффектом */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 transition-all duration-300 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]">
        <img
          src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Левый верхний угол: лаконичный бейдж эпизода Netflix */}
        <div
          className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md backdrop-blur-md text-[11px] font-mono font-bold flex items-center gap-1.5 z-10 transition-colors ${
            isWatched
              ? "bg-black/75 text-emerald-400 border border-emerald-500/30"
              : "bg-black/80 text-zinc-300 border border-white/10"
          }`}
        >
          <span>#{String(index).padStart(2, "0")}</span>
          {isWatched && <Check className="text-emerald-400" size={11} strokeWidth={3} />}
        </div>

        {/* В правом верхнем углу: кнопка удаления и кнопка-галочка «Просмотрено» */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {/* Кнопка удаления ролика */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("Удалить это видео из списка?")) {
                onDelete(video.id);
              }
            }}
            className="p-1.5 rounded-lg bg-black/70 hover:bg-red-600/80 text-zinc-400 hover:text-white transition opacity-0 group-hover:opacity-100 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
            title="Удалить видео"
          >
            <Trash2 size={14} />
          </button>

          {/* Кнопка-галочка «Просмотрено» */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWatched(video.youtube_id, e);
            }}
            className={`p-1.5 rounded-full transition-all outline-none focus:outline-none focus:ring-0 active:outline-none cursor-pointer select-none [-webkit-tap-highlight-color:transparent] ${
              isWatched
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-900"
                : "bg-black/60 text-zinc-500 hover:text-white border border-white/10"
            }`}
            title={isWatched ? "Отметить как непросмотренное" : "Отметить как выполненное"}
          >
            <Check size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Всплывающая кнопка Play при наведении */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg shadow-emerald-950/80 transform group-hover:scale-110 transition-transform duration-300">
            <Play className="fill-black ml-0.5" size={20} />
          </div>
        </div>

        {/* Полоса завершения внизу превью (стиль Netflix) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-950/80 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isWatched ? "w-full bg-emerald-500" : "w-0"
            }`}
          />
        </div>

        {/* В правом нижнем углу — длительность ролика (если есть) */}
        {video.duration_str && (
          <span className="absolute bottom-2.5 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[11px] font-mono text-white z-10">
            {video.duration_str}
          </span>
        )}
      </div>

      {/* Текст под превью: только заголовок */}
      <h3 className="mt-2 text-sm font-medium text-zinc-100 line-clamp-2 group-hover:text-white transition-colors">
        {video.title}
      </h3>
    </div>
  );
}
