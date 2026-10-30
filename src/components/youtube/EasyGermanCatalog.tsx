"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Play, Check, Plus, Video, Trash2 } from "lucide-react";
import { EasyGermanVideo, QuizItem } from "@/types/youtube";
import { INITIAL_EASY_GERMAN_VIDEOS } from "@/data/easyGermanVideos";
import { fetchYouTubeTitle, isPlaceholderTitle } from "@/lib/youtube";
import {
  getEasyGermanStateAction,
  toggleEasyGermanWatchedAction,
  addEasyGermanVideoAction,
  deleteEasyGermanVideoAction,
  fetchYouTubeVideoMetadataAction,
} from "@/app/youtube/actions";
import EasyGermanPlayerModal from "./EasyGermanPlayerModal";
import AddEasyGermanModal from "./AddEasyGermanModal";
import EasyGermanCard from "./EasyGermanCard";

type LevelFilter = "B1" | "B2" | "C1";
const EASY_GERMAN_LEVELS = ["B1", "B2", "C1"] as const;

interface EasyGermanCatalogProps {
  searchQuery?: string;
}

export default function EasyGermanCatalog({ searchQuery = "" }: EasyGermanCatalogProps) {
  const [customVideos, setCustomVideos] = useState<EasyGermanVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>("B1");
  const [activeVideo, setActiveVideo] = useState<EasyGermanVideo | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Считываем последний открытый уровень при монтировании (если A1/A2, сбрасываем на B1)
  useEffect(() => {
    try {
      const savedLevel = localStorage.getItem("easy_german_last_level");
      if (savedLevel && ["B1", "B2", "C1"].includes(savedLevel)) {
        setSelectedLevel(savedLevel as LevelFilter);
      } else {
        setSelectedLevel("B1");
      }
    } catch {
      setSelectedLevel("B1");
    }
  }, []);

  // Функция переключения уровня с сохранением в localStorage
  const handleSelectLevel = (lvl: LevelFilter) => {
    setSelectedLevel(lvl);
    try {
      localStorage.setItem("easy_german_last_level", lvl);
    } catch {}
  };

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
        const rawVideos = localStorage.getItem("easy_german_videos");
        const rawCustom = localStorage.getItem("easy_german_custom_videos");
        const parsedVideos = rawVideos ? JSON.parse(rawVideos) : null;
        const parsedCustom = rawCustom ? JSON.parse(rawCustom) : null;
        const mergedLocal = [
          ...(Array.isArray(parsedCustom) ? parsedCustom : []),
          ...(Array.isArray(parsedVideos) ? parsedVideos : []),
        ];
        if (mergedLocal.length > 0) {
          const localMap = new Map<string, EasyGermanVideo>();
          for (const v of mergedLocal) {
            if (v && v.youtube_id) localMap.set(v.youtube_id, v);
          }
          localCustom = Array.from(localMap.values());
        }
      } catch {}
    }

    setWatchedIds(new Set(localWatched));
    if (localCustom.length > 0) {
      setCustomVideos(localCustom);
    }

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
          // Сначала Supabase, затем localCustom поверх — локальный стейт никогда не затирается!
          for (const v of [...res.customVideos, ...localCustom]) {
            if (v && v.youtube_id) {
              const existing = map.get(v.youtube_id);
              map.set(v.youtube_id, {
                ...existing,
                ...v,
                duration_str: v.duration_str || existing?.duration_str || "",
                duration: v.duration || v.duration_str || existing?.duration || existing?.duration_str || "",
                order_index: v.order_index ?? existing?.order_index,
              });
            }
          }
          const mergedCustom = Array.from(map.values());
          setCustomVideos(mergedCustom);
          try {
            localStorage.setItem("easy_german_videos", JSON.stringify(mergedCustom));
            localStorage.setItem("easy_german_custom_videos", JSON.stringify(mergedCustom));
          } catch {}

          // Фоновая подгрузка длительности, если у каких-то роликов она отсутствует
          const missing = mergedCustom.filter((v) => !v.duration_str && !v.duration && v.youtube_id);
          if (missing.length > 0) {
            Promise.all(
              missing.map(async (v) => {
                try {
                  const meta = await fetchYouTubeVideoMetadataAction(v.youtube_id);
                  return { youtube_id: v.youtube_id, duration_str: meta.duration_str };
                } catch {
                  return null;
                }
              })
            ).then((results) => {
              const valid = results.filter(Boolean) as { youtube_id: string; duration_str: string }[];
              if (valid.length > 0) {
                setCustomVideos((prev) => {
                  const durMap = new Map(valid.map((r) => [r.youtube_id, r.duration_str]));
                  const updated = prev.map((item) =>
                    durMap.has(item.youtube_id)
                      ? {
                          ...item,
                          duration_str: durMap.get(item.youtube_id) || item.duration_str,
                          duration: durMap.get(item.youtube_id) || item.duration || item.duration_str,
                        }
                      : item
                  );
                  try {
                    localStorage.setItem("easy_german_videos", JSON.stringify(updated));
                    localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
                  } catch {}
                  return updated;
                });
              }
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Фоновое обновление реальных названий для роликов с техническими заглушками (Easy German B1 (...))
  const checkedTitleIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (customVideos.length === 0) return;

    const needsTitle = customVideos.filter(
      (v) =>
        v.youtube_id &&
        isPlaceholderTitle(v.title) &&
        !checkedTitleIdsRef.current.has(v.youtube_id)
    );

    if (needsTitle.length === 0) return;

    needsTitle.forEach((v) => checkedTitleIdsRef.current.add(v.youtube_id));

    let isCancelled = false;

    Promise.all(
      needsTitle.map(async (v) => {
        try {
          const title = await fetchYouTubeTitle(v.youtube_id);
          if (title && !isCancelled) {
            return { youtube_id: v.youtube_id, title };
          }
        } catch {}
        return null;
      })
    ).then((results) => {
      if (isCancelled) return;
      const valid = results.filter(Boolean) as { youtube_id: string; title: string }[];
      if (valid.length > 0) {
        setCustomVideos((prev) => {
          const titleMap = new Map(valid.map((r) => [r.youtube_id, r.title]));
          const updated = prev.map((item) =>
            titleMap.has(item.youtube_id)
              ? { ...item, title: titleMap.get(item.youtube_id)! }
              : item
          );
          try {
            localStorage.setItem("easy_german_videos", JSON.stringify(updated));
            localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [customVideos]);

  // Объединенный список видео (пользовательские + начальные без дублей) с подгрузкой квизов
  const allVideos = useMemo(() => {
    let quizMap: Record<string, QuizItem[]> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("easy_german_quizzes");
        if (raw) quizMap = JSON.parse(raw);
      } catch {}
    }

    const map = new Map<string, EasyGermanVideo>();
    for (const v of [...customVideos, ...INITIAL_EASY_GERMAN_VIDEOS]) {
      if (v && v.youtube_id && !map.has(v.youtube_id)) {
        const assignedQuiz = quizMap[v.youtube_id] || quizMap[v.id] || v.quiz;
        map.set(v.youtube_id, {
          ...v,
          quiz: assignedQuiz,
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

  // Обновление/сохранение квиза для видео
  const handleUpdateQuiz = (videoIdOrYoutubeId: string, quiz: QuizItem[]) => {
    // 1. Сохранение в dedicated localStorage map
    try {
      const stored = JSON.parse(localStorage.getItem("easy_german_quizzes") || "{}");
      stored[videoIdOrYoutubeId] = quiz;
      localStorage.setItem("easy_german_quizzes", JSON.stringify(stored));
    } catch {}

    // 2. Обновление customVideos если это кастомное видео
    setCustomVideos((prev) => {
      const updated = prev.map((v) => {
        if (v.id === videoIdOrYoutubeId || v.youtube_id === videoIdOrYoutubeId) {
          return { ...v, quiz };
        }
        return v;
      });
      try {
        localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 3. Немедленное обновление активного видео в плеере
    setActiveVideo((prev) => (prev ? { ...prev, quiz } : null));
  };

  // Добавление нового видео вручную (строго в конец списка)
  const handleAddVideo = (newVideo: EasyGermanVideo) => {
    setCustomVideos((prev) => {
      const currentLevelVideos = prev.filter((v) => v.level === newVideo.level);
      const nextOrder = currentLevelVideos.length > 0
        ? Math.max(...currentLevelVideos.map((v) => v.order_index || 0)) + 1
        : 1;

      const videoWithOrder: EasyGermanVideo = {
        ...newVideo,
        order_index: newVideo.order_index || nextOrder,
        title: newVideo.title || `Easy German ${newVideo.level} #${nextOrder}`,
        duration: newVideo.duration || newVideo.duration_str || "",
        duration_str: newVideo.duration_str || newVideo.duration || "",
        quiz: newVideo.quiz || [],
      };

      const filtered = prev.filter((v) => v.youtube_id !== videoWithOrder.youtube_id);
      const updated = [...filtered, videoWithOrder];
      try {
        localStorage.setItem("easy_german_videos", JSON.stringify(updated));
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
        localStorage.setItem("easy_german_videos", JSON.stringify(updated));
        localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    deleteEasyGermanVideoAction(videoId).catch(() => {});
  };

  // Изменение номера урока с авто-сортировкой
  const handleUpdateOrder = (videoIdOrYoutubeId: string, newOrder: number) => {
    setCustomVideos((prev) => {
      const map = new Map<string, EasyGermanVideo>();
      for (const v of [...prev, ...INITIAL_EASY_GERMAN_VIDEOS]) {
        if (v && v.youtube_id && !map.has(v.youtube_id)) {
          map.set(v.youtube_id, { ...v });
        }
      }
      const all = Array.from(map.values());

      const target = all.find(
        (v) => v.id === videoIdOrYoutubeId || v.youtube_id === videoIdOrYoutubeId
      );
      if (!target) return prev;

      const targetLevel = target.level;
      const levelVideos = all
        .filter((v) => v.level === targetLevel)
        .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));

      const remaining = levelVideos.filter(
        (v) => v.id !== target.id && v.youtube_id !== target.youtube_id
      );

      const insertIdx = Math.max(0, Math.min(newOrder - 1, remaining.length));
      remaining.splice(insertIdx, 0, { ...target, order_index: newOrder });

      const reindexedLevelVideos = remaining.map((v, idx) => ({
        ...v,
        order_index: idx + 1,
      }));

      const levelMap = new Map(reindexedLevelVideos.map((v) => [v.youtube_id, v]));

      const updatedAll = all.map((v) => {
        if (levelMap.has(v.youtube_id)) {
          return levelMap.get(v.youtube_id)!;
        }
        return v;
      });

      try {
        localStorage.setItem("easy_german_videos", JSON.stringify(updatedAll));
        localStorage.setItem("easy_german_custom_videos", JSON.stringify(updatedAll));
      } catch {}

      return updatedAll;
    });
  };

  // Фильтрация строго по выбранному уровню (B1 / B2 / C1) и строке поиска с авто-сортировкой
  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = allVideos.filter((v) => {
      if (v.level !== selectedLevel) return false;
      if (q && !v.title.toLowerCase().includes(q) && !v.youtube_id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      const orderA = a.order_index ?? 9999;
      const orderB = b.order_index ?? 9999;
      return orderA - orderB;
    });
  }, [allVideos, selectedLevel, searchQuery]);

  // Статистика прогресса для текущего уровня
  const totalCount = filteredVideos.length;
  const watchedCount = filteredVideos.filter((v) => v.is_watched).length;
  const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full">
      {/* Премиальный статус-блок Easy German */}
      <div className="relative z-10 mb-6 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Левая часть: Уровни B1, B2, C1 в капсуле (все изумрудные при выборе) */}
          <div className="flex items-center gap-1.5 p-1 bg-black/50 rounded-xl border border-zinc-800/80">
            {EASY_GERMAN_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleSelectLevel(lvl)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] cursor-pointer ${
                  selectedLevel === lvl
                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-950/50"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Центральная часть: Статус усвоения и неоновый прогресс */}
          <div className="flex-1 max-w-xs mx-auto flex flex-col items-center">
            <span className="text-xs font-mono font-bold text-zinc-300 mb-1.5">
              {watchedCount} / {totalCount}
            </span>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden p-[1px] border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                style={{ width: `${totalCount > 0 ? (watchedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Правая часть: Кнопка «+ Видео» (без дублирования знака +) */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 border border-emerald-400/20 active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Видео</span>
          </button>
        </div>
      </div>

      {/* Сетка карточек Easy German с порядковой нумерацией (#01, #02...) */}
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
          {filteredVideos.map((video, index) => (
            <EasyGermanCard
              key={video.id || video.youtube_id}
              video={video}
              index={video.order_index ?? (index + 1)}
              isWatched={Boolean(video.is_watched)}
              onOpen={setActiveVideo}
              onToggleWatched={handleToggleWatched}
              onDelete={handleDeleteVideo}
              onUpdateOrder={handleUpdateOrder}
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
        onUpdateQuiz={handleUpdateQuiz}
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
