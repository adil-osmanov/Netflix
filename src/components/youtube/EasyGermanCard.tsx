"use client";

import React, { useState, useEffect } from "react";
import { Play, Check, Trash2 } from "lucide-react";
import { EasyGermanVideo } from "@/types/youtube";

interface EasyGermanCardProps {
  video: EasyGermanVideo;
  isWatched: boolean;
  index?: number;
  onOpen: (video: EasyGermanVideo) => void;
  onToggleWatched: (youtubeId: string, e?: React.MouseEvent) => void;
  onDelete?: (videoId: string) => void;
  onUpdateOrder?: (videoId: string, newOrder: number) => void;
}

export default function EasyGermanCard({
  video,
  isWatched,
  index = 1,
  onOpen,
  onToggleWatched,
  onDelete,
  onUpdateOrder,
}: EasyGermanCardProps) {
  const currentOrder = video.order_index ?? index;
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [orderVal, setOrderVal] = useState(String(currentOrder));

  useEffect(() => {
    setOrderVal(String(currentOrder));
  }, [currentOrder]);

  const handleOrderSubmit = () => {
    setIsEditingOrder(false);
    const parsed = parseInt(orderVal, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed !== currentOrder) {
      onUpdateOrder?.(video.id || video.youtube_id, parsed);
    } else {
      setOrderVal(String(currentOrder));
    }
  };

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

        {/* Левый верхний угол: лаконичный бейдж эпизода Netflix или инлайн редактирование */}
        <div className="absolute top-2.5 left-2.5 z-20">
          {isEditingOrder ? (
            <input
              type="number"
              min={1}
              value={orderVal}
              autoFocus
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onChange={(e) => setOrderVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOrderSubmit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditingOrder(false);
                  setOrderVal(String(currentOrder));
                }
              }}
              onBlur={handleOrderSubmit}
              className="w-11 bg-black/95 text-emerald-400 font-mono font-bold text-[11px] px-1 py-0.5 rounded border border-emerald-500 shadow-lg shadow-black/80 outline-none text-center"
            />
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditingOrder(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditingOrder(true);
                }
              }}
              className={`px-2 py-0.5 rounded-md backdrop-blur-md text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 select-none outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] ${
                isWatched
                  ? "bg-black/75 text-emerald-400 border border-emerald-500/30"
                  : "bg-black/80 text-zinc-300 border border-white/10 hover:border-emerald-500/50 hover:text-emerald-400"
              }`}
              title="Нажмите, чтобы изменить номер урока"
            >
              <span>#{String(currentOrder).padStart(2, "0")}</span>
              {isWatched && <Check className="text-emerald-400" size={11} strokeWidth={3} />}
            </div>
          )}
        </div>

        {/* В правом верхнем углу: кнопка удаления (при наведении) и кнопка-галочка «Просмотрено» */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window !== "undefined" && window.confirm("Удалить это видео из каталога?")) {
                  onDelete(video.id || video.youtube_id);
                }
              }}
              className="p-1.5 rounded-full bg-black/70 hover:bg-red-950/80 text-red-500 hover:text-red-400 border border-red-900/40 hover:border-red-500/60 opacity-0 group-hover:opacity-100 transition-all duration-200 outline-none focus:outline-none cursor-pointer select-none [-webkit-tap-highlight-color:transparent]"
              title="Удалить видео"
            >
              <Trash2 size={13} strokeWidth={2.5} />
            </button>
          )}
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

        {/* Бейдж длительности видео */}
        {(video.duration_str || video.duration) && (
          <div className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-md border border-white/10 text-[10px] font-mono font-medium text-zinc-300 shadow-md pointer-events-none z-10">
            {video.duration_str || video.duration}
          </div>
        )}
      </div>

      {/* Текст под превью: только заголовок */}
      <h3 className="mt-2 text-sm font-medium text-zinc-100 line-clamp-2 group-hover:text-white transition-colors">
        {video.title}
      </h3>
    </div>
  );
}
