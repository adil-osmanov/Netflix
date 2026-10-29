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
      {/* Шапка вкладки Easy German */}
      <div className="mb-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4">
        {/* Левая часть: Фильтр по уровням сложности [ B1 ] [ B2 ] [ C1 ] */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* B1 - зеленый */}
          <button
            type="button"
            onClick={() => setSelectedLevel("B1")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition outline-none select-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] cursor-pointer ${
              selectedLevel === "B1"
                ? "bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-950/50"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            B1
          </button>

          {/* B2 - синий */}
          <button
            type="button"
            onClick={() => setSelectedLevel("B2")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition outline-none select-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] cursor-pointer ${
              selectedLevel === "B2"
                ? "bg-sky-600 text-white font-bold shadow-lg shadow-sky-950/50"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            B2
          </button>

          {/* C1 - красный */}
          <button
            type="button"
            onClick={() => setSelectedLevel("C1")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition outline-none select-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] cursor-pointer ${
              selectedLevel === "C1"
                ? "bg-red-600 text-white font-bold border border-red-600 shadow-md"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            C1
          </button>
        </div>

        {/* Центр: Счетчик прогресса в стиле Netflix (строго по центру) */}
        <div className="flex-1 max-w-xs mx-auto flex flex-col items-center">
          <span className="text-[11px] text-zinc-400 font-medium mb-1">
            {watchedCount} из {totalCount} • {progressPercent}%
          </span>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Правая часть: Кнопка «+ Видео» */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-950/40 cursor-pointer flex-shrink-0 select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Видео</span>
        </button>
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
                className={`group relative flex flex-col cursor-pointer text-left select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] transition rounded-2xl p-1 ${
                  isWatched
                    ? "border-2 border-emerald-500 shadow-lg shadow-emerald-950/30"
                    : "border border-transparent hover:border-zinc-800"
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
                          handleDeleteVideo(video.id);
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
                      onClick={(e) => handleToggleWatched(video.youtube_id, e)}
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
        level={selectedLevel}
        onAddVideo={handleAddVideo}
      />
    </div>
  );
}
