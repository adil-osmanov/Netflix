"use client";

import React from "react";
import { Play, Check, Trash2 } from "lucide-react";
import { EasyGermanVideo } from "@/types/youtube";

interface EasyGermanCardProps {
  video: EasyGermanVideo;
  isWatched: boolean;
  onOpen: (video: EasyGermanVideo) => void;
  onToggleWatched: (youtubeId: string, e?: React.MouseEvent) => void;
  onDelete: (videoId: string) => void;
}

export default function EasyGermanCard({
  video,
  isWatched,
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
      className={`group relative flex flex-col cursor-pointer text-left select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] transition-transform duration-300 hover:-translate-y-1 rounded-2xl p-1 ${
        isWatched
          ? "border-2 border-emerald-500 shadow-lg shadow-emerald-950/30"
          : "border border-transparent hover:border-zinc-800/60"
      }`}
    >
      {/* Превью контейнер с мягким изумрудным ховер-эффектом */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 transition-colors duration-300 group-hover:border-emerald-500/40 group-hover:shadow-lg group-hover:shadow-emerald-950/30">
        <img
          src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Если просмотрено: легкий изумрудный оверлей + плашка завершения в левом верхнем углу */}
        {isWatched && (
          <>
            <div className="absolute inset-0 bg-emerald-950/20 pointer-events-none" />
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md z-10">
              <Check size={13} strokeWidth={3} />
              <span>Выполнено</span>
            </div>
          </>
        )}

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
            onClick={(e) => onToggleWatched(video.youtube_id, e)}
            title={isWatched ? "Отметить как непросмотренное" : "Отметить как просмотренное"}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer backdrop-blur-md select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] ${
              isWatched
                ? "bg-emerald-500 text-black shadow-md font-bold"
                : "bg-black/60 text-zinc-400 hover:text-white"
            }`}
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Всплывающая красная кнопка Play по центру при наведении */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg translate-y-2 group-hover:translate-y-0">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* В правом нижнем углу — длительность ролика (если есть) */}
        {video.duration_str && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[11px] font-mono text-white">
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
