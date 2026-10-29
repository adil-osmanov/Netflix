"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Play, Check, Plus, Video } from "lucide-react";
import { EasyGermanVideo } from "@/types/youtube";
import { INITIAL_EASY_GERMAN_VIDEOS } from "@/data/easyGermanVideos";
import {
  getEasyGermanStateAction,
  toggleEasyGermanWatchedAction,
  addEasyGermanVideoAction,
} from "@/app/youtube/actions";
import EasyGermanPlayerModal from "./EasyGermanPlayerModal";
import AddEasyGermanModal from "./AddEasyGermanModal";

type LevelFilter = "ALL" | "B1" | "B2" | "C1";

const LEVEL_BADGE_CLASSES: Record<"B1" | "B2" | "C1", string> = {
  B1: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  B2: "bg-sky-500/20 text-sky-400 border border-sky-500/40",
  C1: "bg-purple-500/20 text-purple-400 border border-purple-500/40",
};

interface EasyGermanCatalogProps {
  searchQuery?: string;
}

export default function EasyGermanCatalog({ searchQuery = "" }: EasyGermanCatalogProps) {
  const [customVideos, setCustomVideos] = useState<EasyGermanVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>("ALL");
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

  // Объединенный список видео (пользовательские сверху + курируемая база без дублей)
  const allVideos = useMemo(() => {
    const map = new Map<string, EasyGermanVideo>();
    for (const v of [...customVideos, ...INITIAL_EASY_GERMAN_VIDEOS]) {
      if (!map.has(v.youtube_id)) {
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

  // Фильтрация по уровню и поиску
  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allVideos.filter((v) => {
      if (selectedLevel !== "ALL" && v.level !== selectedLevel) return false;
      if (q && !v.title.toLowerCase().includes(q) && !v.youtube_id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [allVideos, selectedLevel, searchQuery]);

  // Статистика прогресса
  const totalCount = allVideos.length;
  const watchedCount = allVideos.filter((v) => v.is_watched).length;
  const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full">
      {/* Шапка вкладки Easy German */}
      <div className="mb-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4">
        {/* Левая часть: Фильтр по уровням сложности [ Все ] [ B1 ] [ B2 ] [ C1 ] */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedLevel("ALL")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedLevel === "ALL"
                ? "bg-white text-black shadow font-bold"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            Все
          </button>
          <button
            type="button"
            onClick={() => setSelectedLevel("B1")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedLevel === "B1"
                ? "bg-emerald-500 text-black shadow font-bold"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            B1
          </button>
          <button
            type="button"
            onClick={() => setSelectedLevel("B2")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedLevel === "B2"
                ? "bg-sky-500 text-black shadow font-bold"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            B2
          </button>
          <button
            type="button"
            onClick={() => setSelectedLevel("C1")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedLevel === "C1"
                ? "bg-purple-500 text-white shadow font-bold"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            C1
          </button>
        </div>

        {/* Центр: Счетчик прогресса в стиле Netflix */}
        <div className="flex flex-col gap-1.5 min-w-[220px] sm:min-w-[260px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">
              Просмотрено <strong className="text-white">{watchedCount}</strong> из{" "}
              <strong className="text-white">{totalCount}</strong> ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#E50914] to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Правая часть: Кнопка «+ Добавить видео» */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-lg shadow-red-950/40 cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить видео</span>
        </button>
      </div>

      {/* Сетка карточек Easy German */}
      {filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Video className="w-10 h-10 text-zinc-600" />
          <h3 className="text-base font-bold text-white">Ролики не найдены</h3>
          <p className="text-xs text-zinc-400">
            Попробуйте переключить фильтр уровня или добавить новое видео.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredVideos.map((video) => {
            const isWatched = Boolean(video.is_watched);

            return (
              <div
                key={video.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveVideo(video)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveVideo(video);
                  }
                }}
                className={`group relative flex flex-col cursor-pointer text-left select-none transition ${
                  isWatched ? "opacity-65 hover:opacity-100" : ""
                }`}
              >
                {/* Визуал превью */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                  <img
                    src={`https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />

                  {/* В левом верхнем углу — бейдж уровня (B1 / B2 / C1) */}
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-md z-10 ${
                      LEVEL_BADGE_CLASSES[video.level]
                    }`}
                  >
                    {video.level}
                  </span>

                  {/* В правом верхнем углу — кнопка-галочка «Просмотрено» */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleWatched(video.youtube_id, e)}
                    title={isWatched ? "Отметить как непросмотренное" : "Отметить как просмотренное"}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition z-10 cursor-pointer backdrop-blur-md ${
                      isWatched
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
                        : "bg-black/60 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Всплывающая красная кнопка Play по центру при наведении */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg translate-y-2 group-hover:translate-y-0">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* В правом нижнем углу — длительность ролика */}
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
          })}
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
        onAddVideo={handleAddVideo}
      />
    </div>
  );
}
