"use client";

import React, { useEffect } from "react";
import { X, Check, Sparkles, Brain } from "lucide-react";
import { EasyGermanVideo } from "@/types/youtube";

interface EasyGermanPlayerModalProps {
  video: EasyGermanVideo | null;
  isWatched: boolean;
  onClose: () => void;
  onToggleWatched: (youtubeId: string) => void;
}

function getLevelBadgeStyle(level: "B1" | "B2" | "C1"): string {
  switch (level) {
    case "B1":
      return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
    case "B2":
      return "bg-sky-500/20 text-sky-400 border border-sky-500/40";
    case "C1":
      return "bg-purple-500/20 text-purple-400 border border-purple-500/40";
  }
}

export default function EasyGermanPlayerModal({
  video,
  isWatched,
  onClose,
  onToggleWatched,
}: EasyGermanPlayerModalProps) {
  useEffect(() => {
    if (!video) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-4xl w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Шапка модалки */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-bold flex-shrink-0 ${getLevelBadgeStyle(
                video.level
              )}`}
            >
              {video.level}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {video.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer flex-shrink-0"
            title="Закрыть (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Адаптивный фрейм 16:9 с встраиваемым YouTube */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&enablejsapi=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Нижняя панель действий */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Кнопка: ✓ Отметить как просмотренное */}
          <button
            type="button"
            onClick={() => onToggleWatched(video.youtube_id)}
            className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              isWatched
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-600"
            }`}
          >
            <Check className={`w-4 h-4 ${isWatched ? "stroke-[3]" : ""}`} />
            <span>
              {isWatched ? "Просмотрено" : "Отметить как просмотренное"}
            </span>
          </button>

          {/* Зарезервированный блок-заглушка под будущий Шаг 2 */}
          <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-900/60 border border-dashed border-zinc-800 text-zinc-400 text-xs sm:text-sm select-none">
            <Brain className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>Интерактивные упражнения к видео (Шаг 2)</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
