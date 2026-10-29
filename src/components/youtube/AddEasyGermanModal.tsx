"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Video, AlertCircle, Loader2 } from "lucide-react";
import { EasyGermanVideo } from "@/types/youtube";
import { extractYouTubeId } from "@/data/youtubeVideos";

interface AddEasyGermanModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: "B1" | "B2" | "C1";
  onAddVideo: (video: EasyGermanVideo) => void;
}

async function fetchYouTubeTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    return data.title || `Easy German Video (${videoId})`;
  } catch {
    return `Easy German Video (${videoId})`;
  }
}

export default function AddEasyGermanModal({
  isOpen,
  onClose,
  level,
  onAddVideo,
}: AddEasyGermanModalProps) {
  const [urlOrId, setUrlOrId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractedId = extractYouTubeId(urlOrId);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const ytId = extractYouTubeId(urlOrId);
    if (!ytId) {
      setError("Укажите корректную ссылку на YouTube или 11-значный ID видео.");
      return;
    }

    setIsLoading(true);
    try {
      const title = await fetchYouTubeTitle(ytId);

      const newVideo: EasyGermanVideo = {
        id: `eg-custom-${Date.now()}`,
        youtube_id: ytId,
        title,
        level,
        is_watched: false,
        created_at: new Date().toISOString(),
      };

      onAddVideo(newVideo);

      // Сброс формы и закрытие
      setUrlOrId("");
      onClose();
    } catch {
      setError("Не удалось добавить видео. Попробуйте ещё раз.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-lg w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <Video className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-bold text-white">
              Добавить видео
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Единственное поле ввода: Ссылка или ID YouTube */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              Ссылка на YouTube
            </label>
            <input
              type="text"
              value={urlOrId}
              disabled={isLoading}
              onChange={(e) => setUrlOrId(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-sm text-white placeholder:text-zinc-500 outline-none transition disabled:opacity-50"
              autoFocus
            />
            {extractedId && (
              <div className="mt-2 flex items-center gap-3 p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <img
                  src={`https://i.ytimg.com/vi/${extractedId}/hqdefault.jpg`}
                  alt="Preview"
                  className="w-24 aspect-video object-cover rounded-lg border border-zinc-700"
                />
                <div className="text-xs text-zinc-400">
                  <div>
                    ID распознан:{" "}
                    <span className="font-mono text-emerald-400 font-semibold">{extractedId}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Название будет получено автоматически
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Кнопка сохранения */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-[0.99] outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Получение данных...</span>
              </>
            ) : (
              <span>+ Видео</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
