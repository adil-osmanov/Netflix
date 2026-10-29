"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Video, Clock, AlertCircle } from "lucide-react";
import { EasyGermanVideo } from "@/types/youtube";
import { extractYouTubeId } from "@/data/youtubeVideos";

interface AddEasyGermanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVideo: (video: EasyGermanVideo) => void;
}

const LEVELS: Array<{ id: "B1" | "B2" | "C1"; label: string; activeClass: string }> = [
  {
    id: "B1",
    label: "B1",
    activeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-lg shadow-emerald-950/40",
  },
  {
    id: "B2",
    label: "B2",
    activeClass: "bg-sky-500/20 text-sky-400 border-sky-500/60 shadow-lg shadow-sky-950/40",
  },
  {
    id: "C1",
    label: "C1",
    activeClass: "bg-purple-500/20 text-purple-400 border-purple-500/60 shadow-lg shadow-purple-950/40",
  },
];

export default function AddEasyGermanModal({
  isOpen,
  onClose,
  onAddVideo,
}: AddEasyGermanModalProps) {
  const [urlOrId, setUrlOrId] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<"B1" | "B2" | "C1">("B1");
  const [durationStr, setDurationStr] = useState("");
  const [error, setError] = useState<string | null>(null);

  const extractedId = extractYouTubeId(urlOrId);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const ytId = extractYouTubeId(urlOrId);
    if (!ytId) {
      setError("Укажите корректную ссылку на YouTube или 11-значный ID видео.");
      return;
    }

    if (!title.trim()) {
      setError("Укажите название видео.");
      return;
    }

    const newVideo: EasyGermanVideo = {
      id: `eg-custom-${Date.now()}`,
      youtube_id: ytId,
      title: title.trim(),
      level,
      duration_str: durationStr.trim() || undefined,
      is_watched: false,
      created_at: new Date().toISOString(),
    };

    onAddVideo(newVideo);

    // Сброс формы и закрытие
    setUrlOrId("");
    setTitle("");
    setLevel("B1");
    setDurationStr("");
    onClose();
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
            <Video className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white">Добавить видео в Easy German</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
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

          {/* 1. Ссылка или ID YouTube */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              Ссылка на YouTube или ID ролика *
            </label>
            <input
              type="text"
              value={urlOrId}
              onChange={(e) => setUrlOrId(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... или 11 символов ID"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 text-sm text-white placeholder:text-zinc-500 outline-none transition"
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
                </div>
              </div>
            )}
          </div>

          {/* 2. Название видео */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              Название видео *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Alltagsgespräche in Berlin"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 text-sm text-white placeholder:text-zinc-500 outline-none transition"
            />
          </div>

          {/* 3. Уровень сложности и Длительность */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Уровень сложности
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((item) => {
                  const isActive = level === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLevel(item.id)}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        isActive
                          ? item.activeClass
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Длительность (опционально)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  placeholder="14:20"
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 text-sm text-white placeholder:text-zinc-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Кнопка сохранения */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-950/50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Сохранить в Easy German</span>
          </button>
        </form>
      </div>
    </div>
  );
}
