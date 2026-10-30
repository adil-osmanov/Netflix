"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Play, Check, Plus, Video, Trash2 } from "lucide-react";
import {
  EasyGermanVideo,
  QuizItem,
  Language,
  DE_LEVELS,
  EN_LEVELS,
  EnglishLevel,
} from "@/types/youtube";
import { INITIAL_EASY_GERMAN_VIDEOS } from "@/data/easyGermanVideos";
import englishVideosJson from "@/data/english_videos.json";
import { fetchYouTubeTitle, isPlaceholderTitle } from "@/lib/youtube";
import {
  getEasyGermanStateAction,
  toggleEasyGermanWatchedAction,
  addEasyGermanVideoAction,
  deleteEasyGermanVideoAction,
  fetchYouTubeVideoMetadataAction,
  updateEasyGermanVideosAction,
} from "@/app/youtube/actions";
import EasyGermanPlayerModal from "./EasyGermanPlayerModal";
import AddEasyGermanModal from "./AddEasyGermanModal";
import EasyGermanCard from "./EasyGermanCard";

type LevelFilter = EnglishLevel;

const INITIAL_ENGLISH_VIDEOS: EasyGermanVideo[] = (englishVideosJson as any[]).map((item) => ({
  id: item.id,
  youtube_id: item.youtube_id,
  title: item.title,
  channel: item.channel,
  category: item.category,
  level: item.level as LevelFilter,
  duration: item.duration,
  duration_str: item.duration,
  order_index: item.order_index,
  is_watched: false,
  quiz: [],
}));

interface EasyGermanCatalogProps {
  searchQuery?: string;
  lang?: Language;
}

export default function EasyGermanCatalog({
  searchQuery = "",
  lang = "DE",
}: EasyGermanCatalogProps) {
  const isEN = lang === "EN";
  const availableLevels: LevelFilter[] = isEN ? EN_LEVELS : DE_LEVELS;

  const [customVideos, setCustomVideos] = useState<EasyGermanVideo[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>(isEN ? "A1" : "B1");
  const [activeVideo, setActiveVideo] = useState<EasyGermanVideo | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Считываем последний открытый уровень при монтировании и смене языка
  useEffect(() => {
    try {
      if (isEN) {
        const savedEn = localStorage.getItem("last_level_en");
        if (savedEn && (EN_LEVELS as string[]).includes(savedEn)) {
          setSelectedLevel(savedEn as LevelFilter);
        } else {
          setSelectedLevel("A1");
        }
      } else {
        const savedDe =
          localStorage.getItem("last_level_de") ||
          localStorage.getItem("easy_german_last_level");
        if (savedDe && (DE_LEVELS as string[]).includes(savedDe)) {
          setSelectedLevel(savedDe as LevelFilter);
        } else {
          setSelectedLevel("B1");
        }
      }
    } catch {
      setSelectedLevel(isEN ? "A1" : "B1");
    }
  }, [isEN]);

  // Функция переключения уровня с сохранением в изолированный ключ localStorage
  const handleSelectLevel = (lvl: LevelFilter) => {
    setSelectedLevel(lvl);
    try {
      if (isEN) {
        localStorage.setItem("last_level_en", lvl);
      } else {
        localStorage.setItem("last_level_de", lvl);
        localStorage.setItem("easy_german_last_level", lvl);
      }
    } catch {}
  };

  // Загрузка из localStorage + синхронизация с Supabase (только для DE)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isEN) {
      // Изолированный режим EN (American English)
      let localWatchedEn: string[] = [];
      let localCustomEn: EasyGermanVideo[] = [];

      try {
        const rawWatched = localStorage.getItem("watched_en");
        if (rawWatched) {
          const parsed = JSON.parse(rawWatched);
          if (Array.isArray(parsed)) localWatchedEn = parsed;
        }
      } catch {}

      try {
        const rawCustom = localStorage.getItem("custom_videos_en");
        if (rawCustom) {
          const parsed = JSON.parse(rawCustom);
          if (Array.isArray(parsed)) localCustomEn = parsed;
        }
      } catch {}

      setWatchedIds(new Set(localWatchedEn));
      setCustomVideos(localCustomEn);
      return;
    }

    // Режим DE (Easy German)
    let localWatched: string[] = [];
    let localCustom: EasyGermanVideo[] = [];

    try {
      const rawWatched =
        localStorage.getItem("watched_de") ||
        localStorage.getItem("easy_german_watched_ids");
      if (rawWatched) {
        const parsed = JSON.parse(rawWatched);
        if (Array.isArray(parsed)) localWatched = parsed;
      }
    } catch {}

    try {
      const rawCustomDe = localStorage.getItem("custom_videos_de");
      const rawVideos = localStorage.getItem("easy_german_videos");
      const rawCustom = localStorage.getItem("easy_german_custom_videos");
      const parsedCustomDe = rawCustomDe ? JSON.parse(rawCustomDe) : null;
      const parsedVideos = rawVideos ? JSON.parse(rawVideos) : null;
      const parsedCustom = rawCustom ? JSON.parse(rawCustom) : null;
      const mergedLocal = [
        ...(Array.isArray(parsedCustomDe) ? parsedCustomDe : []),
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

    setWatchedIds(new Set(localWatched));
    setCustomVideos(localCustom);

    // Асинхронная синхронизация с Supabase для DE
    getEasyGermanStateAction()
      .then((res) => {
        if (res.watchedIds.length > 0 || localWatched.length > 0) {
          const mergedWatched = Array.from(new Set([...localWatched, ...res.watchedIds]));
          setWatchedIds(new Set(mergedWatched));
          try {
            localStorage.setItem("watched_de", JSON.stringify(mergedWatched));
            localStorage.setItem("easy_german_watched_ids", JSON.stringify(mergedWatched));
          } catch {}
        }

        if (res.customVideos.length > 0 || localCustom.length > 0) {
          const map = new Map<string, EasyGermanVideo>();
          for (const v of [...res.customVideos, ...localCustom]) {
            if (v && v.youtube_id) {
              const existing = map.get(v.youtube_id);
              const durationStr =
                existing?.duration_str ||
                v.duration_str ||
                existing?.duration ||
                v.duration ||
                "";
              const bestTitle =
                existing?.title && !isPlaceholderTitle(existing.title)
                  ? existing.title
                  : v.title && !isPlaceholderTitle(v.title)
                  ? v.title
                  : existing?.title || v.title;
              map.set(v.youtube_id, {
                ...existing,
                ...v,
                title: bestTitle,
                duration_str: durationStr,
                duration: durationStr,
                order_index: v.order_index ?? existing?.order_index,
              });
            }
          }
          const mergedCustom = Array.from(map.values());
          setCustomVideos(mergedCustom);
          try {
            localStorage.setItem("custom_videos_de", JSON.stringify(mergedCustom));
            localStorage.setItem("easy_german_videos", JSON.stringify(mergedCustom));
            localStorage.setItem("easy_german_custom_videos", JSON.stringify(mergedCustom));
          } catch {}

          // Фоновая подгрузка длительности, если у каких-то роликов она всё ещё отсутствует
          const missing = mergedCustom.filter((v) => !v.duration_str && !v.duration && v.youtube_id);
          if (missing.length > 0) {
            Promise.all(
              missing.slice(0, 15).map(async (v) => {
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
                          duration:
                            durMap.get(item.youtube_id) || item.duration || item.duration_str,
                        }
                      : item
                  );
                  try {
                    localStorage.setItem("custom_videos_de", JSON.stringify(updated));
                    localStorage.setItem("easy_german_videos", JSON.stringify(updated));
                    localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
                  } catch {}
                  updateEasyGermanVideosAction(updated).catch(() => {});
                  return updated;
                });
              }
            });
          }
        }
      })
      .catch(() => {});
  }, [isEN]);

  // Фоновое обновление реальных названий для роликов с техническими заглушками
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
            if (isEN) {
              localStorage.setItem("custom_videos_en", JSON.stringify(updated));
            } else {
              localStorage.setItem("custom_videos_de", JSON.stringify(updated));
              localStorage.setItem("easy_german_videos", JSON.stringify(updated));
              localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
            }
          } catch {}
          return updated;
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [customVideos, isEN]);

  // Объединенный список видео (пользовательские + начальные без дублей)
  const allVideos = useMemo(() => {
    let quizMap: Record<string, QuizItem[]> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("easy_german_quizzes");
        if (raw) quizMap = JSON.parse(raw);
      } catch {}
    }

    const baseInitial = isEN ? INITIAL_ENGLISH_VIDEOS : INITIAL_EASY_GERMAN_VIDEOS;
    const map = new Map<string, EasyGermanVideo>();

    for (const v of [...customVideos, ...baseInitial]) {
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
  }, [customVideos, watchedIds, isEN]);

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
        if (isEN) {
          localStorage.setItem("watched_en", JSON.stringify(arr));
        } else {
          localStorage.setItem("watched_de", JSON.stringify(arr));
          localStorage.setItem("easy_german_watched_ids", JSON.stringify(arr));
        }
      } catch {}

      if (!isEN) {
        toggleEasyGermanWatchedAction(youtubeId, willBeWatched).catch(() => {});
      }
      return next;
    });
  };

  // Обновление/сохранение квиза для видео
  const handleUpdateQuiz = (videoIdOrYoutubeId: string, quiz: QuizItem[]) => {
    try {
      const stored = JSON.parse(localStorage.getItem("easy_german_quizzes") || "{}");
      stored[videoIdOrYoutubeId] = quiz;
      localStorage.setItem("easy_german_quizzes", JSON.stringify(stored));
    } catch {}

    setCustomVideos((prev) => {
      const updated = prev.map((v) => {
        if (v.id === videoIdOrYoutubeId || v.youtube_id === videoIdOrYoutubeId) {
          return { ...v, quiz };
        }
        return v;
      });
      try {
        if (isEN) {
          localStorage.setItem("custom_videos_en", JSON.stringify(updated));
        } else {
          localStorage.setItem("custom_videos_de", JSON.stringify(updated));
          localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });

    setActiveVideo((prev) => (prev ? { ...prev, quiz } : null));
  };

  // Добавление нового видео вручную (строго в конец списка, изолированно по языку)
  const handleAddVideo = (newVideo: EasyGermanVideo) => {
    const baseInitial = isEN ? INITIAL_ENGLISH_VIDEOS : INITIAL_EASY_GERMAN_VIDEOS;

    setCustomVideos((prev) => {
      const allForLevel = [...prev, ...baseInitial].filter((v) => v.level === newVideo.level);
      const nextOrder =
        allForLevel.length > 0
          ? Math.max(...allForLevel.map((v) => v.order_index || 0)) + 1
          : 1;

      const label = isEN ? "American English" : "Easy German";
      const videoWithOrder: EasyGermanVideo = {
        ...newVideo,
        order_index: newVideo.order_index || nextOrder,
        title: newVideo.title || `${label} ${newVideo.level} #${nextOrder}`,
        duration: newVideo.duration || newVideo.duration_str || "",
        duration_str: newVideo.duration_str || newVideo.duration || "",
        quiz: newVideo.quiz || [],
      };

      const filtered = prev.filter((v) => v.youtube_id !== videoWithOrder.youtube_id);
      const updated = [...filtered, videoWithOrder];
      try {
        if (isEN) {
          localStorage.setItem("custom_videos_en", JSON.stringify(updated));
        } else {
          localStorage.setItem("custom_videos_de", JSON.stringify(updated));
          localStorage.setItem("easy_german_videos", JSON.stringify(updated));
          localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });

    if (!isEN) {
      addEasyGermanVideoAction(newVideo).catch(() => {});
    }
  };

  // Удаление ролика
  const handleDeleteVideo = (videoId: string) => {
    setCustomVideos((prev) => {
      const updated = prev.filter((v) => v.id !== videoId && v.youtube_id !== videoId);
      try {
        if (isEN) {
          localStorage.setItem("custom_videos_en", JSON.stringify(updated));
        } else {
          localStorage.setItem("custom_videos_de", JSON.stringify(updated));
          localStorage.setItem("easy_german_videos", JSON.stringify(updated));
          localStorage.setItem("easy_german_custom_videos", JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });

    if (!isEN) {
      deleteEasyGermanVideoAction(videoId).catch(() => {});
    }
  };

  // Изменение номера урока с авто-сортировкой
  const handleUpdateOrder = (videoIdOrYoutubeId: string, newOrder: number) => {
    const baseInitial = isEN ? INITIAL_ENGLISH_VIDEOS : INITIAL_EASY_GERMAN_VIDEOS;

    setCustomVideos((prev) => {
      const map = new Map<string, EasyGermanVideo>();
      for (const v of [...prev, ...baseInitial]) {
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
        if (isEN) {
          localStorage.setItem("custom_videos_en", JSON.stringify(updatedAll));
        } else {
          localStorage.setItem("custom_videos_de", JSON.stringify(updatedAll));
          localStorage.setItem("easy_german_videos", JSON.stringify(updatedAll));
          localStorage.setItem("easy_german_custom_videos", JSON.stringify(updatedAll));
        }
      } catch {}

      return updatedAll;
    });
  };

  // Фильтрация строго по выбранному уровню и строке поиска с авто-сортировкой
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

  return (
    <div className="w-full">
      {/* Бесшовный чистый блок уровней */}
      <div className="relative z-10 mb-6 py-2 bg-transparent flex flex-wrap items-center justify-between gap-4">
        {/* Левая часть: Уровни (B1-C1 для DE, A1-C1 для EN) */}
        <div className="flex items-center gap-1.5 p-1 bg-black/50 rounded-xl border border-zinc-800/80">
          {availableLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => handleSelectLevel(lvl)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] cursor-pointer ${
                selectedLevel === lvl
                  ? isEN
                    ? "bg-blue-600 text-white shadow-md shadow-blue-950/50"
                    : "bg-emerald-500 text-black shadow-md shadow-emerald-950/50"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Центральная часть: Статус усвоения и прогресс */}
        <div className="flex-1 max-w-xs mx-auto flex flex-col items-center">
          <span
            className={`text-xs font-mono font-bold mb-1.5 ${
              isEN ? "text-blue-400" : "text-zinc-300"
            }`}
          >
            {watchedCount} / {totalCount}
          </span>
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden p-[1px] border border-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isEN
                  ? "bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_10px_rgba(37,99,235,0.7)]"
                  : "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
              }`}
              style={{ width: `${totalCount > 0 ? (watchedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Правая часть: Кнопка «+ Видео» */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className={`px-4 py-2 rounded-xl font-semibold text-xs text-white transition-all shadow-lg flex items-center gap-1.5 active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 [-webkit-tap-highlight-color:transparent] cursor-pointer ${
            isEN
              ? "bg-blue-600 hover:bg-blue-500 shadow-blue-950/50 border border-blue-400/20"
              : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50 border border-emerald-400/20"
          }`}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Видео</span>
        </button>
      </div>

      {/* Сетка карточек с порядковой нумерацией (#01, #02...) */}
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
              index={video.order_index ?? index + 1}
              isWatched={Boolean(video.is_watched)}
              accentColor={isEN ? "blue" : "emerald"}
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
        lang={lang}
        onAddVideo={handleAddVideo}
      />
    </div>
  );
}
