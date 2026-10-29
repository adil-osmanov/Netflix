"use client";

import React, { useEffect } from "react";
import { Check } from "lucide-react";
import { EasyGermanVideo } from "@/types/youtube";

interface EasyGermanPlayerModalProps {
  video: EasyGermanVideo | null;
  isWatched: boolean;
  onClose: () => void;
  onToggleWatched: (youtubeId: string) => void;
}

export default function EasyGermanPlayerModal({
  video,
  isWatched,
  onClose,
  onToggleWatched,
}: EasyGermanPlayerModalProps) {
  useEffect(() => {
    if (!video) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Адаптивный плеер 16:9 */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&rel=0`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Нижняя панель действий */}
        <div className="p-4 bg-zinc-950 flex items-center justify-between border-t border-zinc-900">
          <button
            type="button"
            onClick={() => onToggleWatched(video.youtube_id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              isWatched
                ? "bg-emerald-600 text-white"
                : "bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800"
            }`}
          >
            <Check size={14} strokeWidth={2.5} />
            <span>{isWatched ? "Выполнено" : "Отметить как выполненное"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
