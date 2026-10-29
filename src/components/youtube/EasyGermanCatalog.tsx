"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Play, Check, Plus, Video, Trash2 } from "lucide-react";
import { EasyGermanVideo } from "@/types/youtube";
import { INITIAL_EASY_GERMAN_VIDEOS } from "@/data/easyGermanVideos";
import {
  getEasyGermanStateAction,
  toggleEasyGermanWatchedAction,
  addEasyGermanVideoAction,
  deleteEasyGermanVideoAction,
} from "@/app/youtube/actions";
import EasyGermanPlayerModal from "./EasyGermanPlayerModal";
import AddEasyGermanModal from "./AddEasyGermanModal";
import EasyGermanCard from "./EasyGermanCard";

type LevelFilter = "B1" | "B2" | "C1";

interface EasyGermanCatalogProps {
  searchQuery?: string;
}

export default function EasyGermanCatalog({ searchQuery = "" }: EasyGermanCatalogProps) {
  const [customVideos, setCustomVideos] = useState<EasyGermanVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>("B1");
  const [activeVideo, setActiveVideo] = useState<EasyGermanVideo | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Загрузка из localStorage + синхронизация с Supabase
  useEffect(() => {
    let localWatched: string[] = [];
    let localCustom: EasyGermanVideo[] = [];

    if (typeof window !== "undefined") {
      try {
        const rawWatched = localStorage.getItem("easy_german_watched_ids");
        if (rawWatched) {
          const parsed = JSON.parse(rawWatched);
          if (Array.isArray(parsed)) localWatched = parsed;
        }
      } catch {}

      try {
        const rawCustom = localStorage.getItem("easy_german_custom_videos");
        if (rawCustom) {
          const parsed = JSON.parse(rawCustom);
          if (Array.isArray(parsed)) localCustom = parsed;
        }
      } catch {}
    }

    setWatchedIds(new Set(localWatched));
    setCustomVideos(localCustom);

    // Асинхронная синхронизация с Supabase
    getEasyGermanStateAction()
      .then((res) => {
        if (res.watchedIds.length > 0 || localWatched.length > 0) {
          const mergedWatched = Array.from(new Set([...localWatched, ...res.watchedIds]));
          setWatchedIds(new Set(mergedWatched));
          try {
            localStorage.setItem("easy_german_watched_ids", JSON.stringify(mergedWatched));
          } catch {}
        }

        if (res.customVideos.length > 0 || localCustom.length > 0) {
          const map = new Map<string, EasyGermanVideo>();
          for (const v of [...localCustom, ...res.customVideos]) {
            if (v && v.youtube_id) {
              map.set(v.youtube_id, v);
            }
          }
          const mergedCustom = Array.from(map.values());
          setCustomVideos(mergedCustom);
          try {
            localStorage.setItem("easy_german_custom_videos", JSON.stringify(mergedCustom));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Объединенный список видео (пользовательские + начальные без дублей)
  const allVideos = useMemo(() => {
    const map = new Map<string, EasyGermanVideo>();
    for (const v of [...customVideos, ...INITIAL_EASY_GERMAN_VIDEOS]) {
      if (v && v.youtube_id && !map.has(v.youtube_id)) {
        map.set(v.youtube_id, {
          ...v,
          is_watched: watchedIds.has(v.youtube_id),
        });
      }
    }
    return Array.from(map.values());
  }, [customVideos, watchedIds]);

  // Переключение статуса «Просмотрено»
  const handleToggleWatched = (youtubeId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setWatchedIds((prev) => {
      const next = new Set(prev);
      const willBeWatched = !next.has(youtubeId);
      if (willBeWatched) {
        next.add(youtubeId);
      } else {
        next.delete(youtubeId);
      }

      const arr = Array.from(next);
      try {
        localStorage.setItem("easy_german_watched_ids", JSON.stringify(arr));
      } catch {}

      toggleEasyGermanWatchedAction(youtubeId, willBeWatched).catch(() => {});
      return next;
    });
  };

  // Добавление нового видео вручную
  const handleAddVideo = (newVideo: EasyGermanVideo) => {
    setCustomVideos((prev) => {
      const filtered = prev.filter((v) => v.youtube_id !== newVideo.youtube_id);
      const updated = [newVideo, ...filtered];
      try {
        localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    addEasyGermanVideoAction(newVideo).catch(() => {});
  };

  // Удаление ролика
  const handleDeleteVideo = (videoId: string) => {
    setCustomVideos((prev) => {
      const updated = prev.filter((v) => v.id !== videoId && v.youtube_id !== videoId);
      try {
        localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    deleteEasyGermanVideoAction(videoId).catch(() => {});
  };

  // Фильтрация строго по выбранному уровню (B1 / B2 / C1) и строке поиска
  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allVideos.filter((v) => {
      if (v.level !== selectedLevel) return false;
      if (q && !v.title.toLowerCase().includes(q) && !v.youtube_id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [allVideos, selectedLevel, searchQuery]);

  // Статистика прогресса для текущего уровня
  const totalCount = filteredVideos.length;
  const watchedCount = filteredVideos.filter((v) => v.is_watched).length;
  const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full">
      {/* Премиальный статус-блок Easy German */}
      <div className="relative z-10 mb-6 p-4 rounded-2xl bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 border border-emerald-500/20 backdrop-blur-xl shadow-2xl shadow-emerald-950/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Левая часть: Уровни B1, B2, C1 в капсуле */}
          <div className="flex items-center gap-1.5 p-1 bg-black/50 rounded-xl border border-emerald-950/60">
            {(["B1", "B2", "C1"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] cursor-pointer ${
                  selectedLevel === lvl
                    ? lvl === "C1"
                      ? "bg-red-600 text-white shadow-md shadow-red-950/50"
                      : "bg-emerald-500 text-black shadow-md shadow-emerald-950/50"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Центральная часть: Статус усвоения и неоновый прогресс */}
          <div className="flex-1 max-w-xs mx-auto flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] tracking-wider uppercase font-extrabold text-emerald-400">
                Lernfortschritt
              </span>
              <span className="text-xs font-mono font-bold text-zinc-300">
                {watchedCount} / {totalCount}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden p-[1px] border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                style={{ width: `${totalCount > 0 ? (watchedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Правая часть: Кнопка «+ Видео» */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2 border border-emerald-400/20 active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>+ Видео</span>
          </button>
        </div>
      </div>

      {/* Сетка карточек Easy German */}
      {filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-8 max-w-lg mx-auto">
          <Video className="w-10 h-10 text-zinc-600" />
          <p className="text-sm text-zinc-300">
            В уровне <span className="font-bold text-white">{selectedLevel}</span> пока нет роликов.
            Добавьте первое видео через кнопку справа.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredVideos.map((video) => (
            <EasyGermanCard
              key={video.id}
              video={video}
              isWatched={Boolean(video.is_watched)}
              onOpen={setActiveVideo}
              onToggleWatched={handleToggleWatched}
              onDelete={handleDeleteVideo}
            />
          ))}
        </div>
      )}

      {/* Модальное окно просмотра в стиле Netflix */}
      <EasyGermanPlayerModal
        video={activeVideo}
        isWatched={activeVideo ? watchedIds.has(activeVideo.youtube_id) : false}
        onClose={() => setActiveVideo(null)}
        onToggleWatched={(ytId) => handleToggleWatched(ytId)}
      />

      {/* Модальное окно ручного добавления видео */}
      <AddEasyGermanModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        level={selectedLevel}
        onAddVideo={handleAddVideo}
      />
    </div>
  );
}
