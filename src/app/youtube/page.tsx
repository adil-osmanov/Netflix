"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  Loader2, 
  RotateCw,
  Video,
  Bookmark,
  Tv,
  Plus,
  Film
} from "lucide-react";
import { NetflixLogo } from "@/components/common/NetflixLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import {
  YouTubeRecommendedVideo,
  Language,
  DE_LEVELS,
  EN_LEVELS,
} from "@/types/youtube";
import { useYouTube } from "@/context/YouTubeContext";
import VideoCard from "@/components/youtube/VideoCard";
import InfiniteVideoFeed, { appendUniqueVideos } from "@/components/youtube/InfiniteVideoFeed";
import ManageChannelsModal, { SubscribedChannel } from "@/components/youtube/ManageChannelsModal";
import EasyGermanCatalog from "@/components/youtube/EasyGermanCatalog";
import MediathekCatalog from "@/components/mediathek/MediathekCatalog";
import CinemaCatalog from "@/components/cinema/CinemaCatalog";
import englishVideosJson from "@/data/english_videos.json";
import { shuffleArray } from "@/lib/youtube";

import {
  Subscription,
  fetchSubscriptions,
  addSubscriptionToDb,
  removeSubscriptionFromDb,
  cleanSubscriptionsAndCache,
  DEFAULT_DE_SUBSCRIPTIONS,
  DEFAULT_EN_SUBSCRIPTIONS,
} from "@/lib/subscriptions";

export type TopCategory = "youtube" | "mediathek" | "cinema" | "favorites";
export type MainTab = "recommendations" | "subscriptions" | "easy_german";
export type LevelType = "ALL" | "A1" | "A2" | "B1" | "B2" | "C1";

export const DE_STANDARD_LEVELS: LevelType[] = ["A1", "A2", "B1", "B2", "C1"];
export const EN_STANDARD_LEVELS: LevelType[] = ["A1", "A2", "B1", "B2", "C1"];
export const EASY_GERMAN_LEVELS: LevelType[] = ["B1", "B2", "C1"];

/**
 * Duration validator:
 * - For DE Recommendations: >= 10 minutes (600s)
 * - For EN Recommendations / Subscriptions: >= 3 min (180s)
 */
function isValidDuration(
  durationStr?: string,
  seconds?: number,
  minSeconds: number = 600
): boolean {
  if (typeof seconds === "number") {
    return seconds >= minSeconds;
  }
  if (!durationStr) return false;

  const minMinutes = Math.ceil(minSeconds / 60);
  const minMatch = durationStr.match(/(\d+)\s*(?:мин|min)/i);
  if (minMatch) {
    return parseInt(minMatch[1], 10) >= minMinutes;
  }

  const parts = durationStr.split(":").map(Number);
  if (parts.some(isNaN)) return false;
  if (parts.length === 2) {
    const totalSec = parts[0] * 60 + parts[1];
    return totalSec >= minSeconds;
  }
  if (parts.length === 3) {
    return true;
  }
  return false;
}

const BLOCKED_PATTERNS = [
  /winnetou/i,
  /die\s+entzifferung/i,
  /harald\s+lesch.*terra/i,
  /sarg\s+selbst/i,
  /testosteron[-_\s]*krise/i,
  /testosteron/i,
];

function isYouTubeShort(
  video: {
    title?: string;
    description?: string;
    id?: string;
    duration?: number;
    duration_seconds?: number;
    durationText?: string;
    duration_str?: string;
  },
  minDurationSeconds: number = 600
): boolean {
  const title = (video.title || "").toLowerCase();
  const desc = (video.description || "").toLowerCase();
  const id = (video.id || "").toLowerCase();
  const combined = `${id} ${title} ${desc}`;

  if (BLOCKED_PATTERNS.some((p) => p.test(combined))) {
    return true;
  }

  if (id.includes("shorts") || id.includes("/shorts/")) {
    return true;
  }

  if (
    /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(title) ||
    /#(shorts?|short|vertical|tiktok|reels?)/i.test(title) ||
    /\b(shorts?|short|vertical|tiktok|reels?|livestream|live-stream|24\/7)\b/i.test(desc) ||
    /#(shorts?|short|vertical|tiktok|reels?)/i.test(desc) ||
    title.includes("🔴")
  ) {
    return true;
  }

  const sec = video.duration_seconds ?? video.duration;
  const durStr = video.durationText || video.duration_str;

  if (typeof sec === "number" && sec < minDurationSeconds) {
    return true;
  }

  if (durStr && !isValidDuration(durStr, sec, minDurationSeconds)) {
    return true;
  }

  return false;
}

export default function YouTubeCatalogPage() {
  const {
    currentLang,
    setLanguage,
    favorites,
    favoritesDE,
    favoritesEN,
    removeFavorite,
  } = useYouTube();

  const isEN = currentLang === "EN";

  // 1. Главная трехуровневая навигация: 'youtube' | 'mediathek' / 'podcasts' | 'favorites'
  const [activeCategory, setActiveCategory] = useState<TopCategory>("youtube");

  // Подвкладки YouTube: 'recommendations' | 'subscriptions' | 'easy_german' (в EN: American English)
  const [activeTab, setActiveTab] = useState<MainTab>("recommendations");

  // Recommendations & Subscriptions Level Filter
  const [selectedLevel, setSelectedLevel] = useState<LevelType>("ALL");

  // Subscriptions: Filter by specific channel ('ALL' | channelId)
  const [selectedSubscribedChannel, setSelectedSubscribedChannel] = useState<string>("ALL");

  // Subscriptions Management Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Subscriptions state (isolated per language, backed by Supabase with optimistic updates)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subVideos, setSubVideos] = useState<YouTubeRecommendedVideo[]>([]);
  const [subPage, setSubPage] = useState<number>(1);
  const [hasMoreSub, setHasMoreSub] = useState<boolean>(true);
  const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(true);
  const [isFetchingMoreSub, setIsFetchingMoreSub] = useState<boolean>(false);

  // Токены пагинации (continuationToken) по каналам
  const channelTokensRef = useRef<Record<string, string | null>>({});
  const subVideosRef = useRef<YouTubeRecommendedVideo[]>([]);
  subVideosRef.current = subVideos;

  // Recommendations state
  const [recommendations, setRecommendations] = useState<YouTubeRecommendedVideo[]>([]);
  const [recPage, setRecPage] = useState<number>(1);
  const [hasMoreRec, setHasMoreRec] = useState<boolean>(true);
  const [isLoadingRec, setIsLoadingRec] = useState<boolean>(false);
  const [isFetchingMoreRec, setIsFetchingMoreRec] = useState<boolean>(false);

  const recommendationsRef = useRef<YouTubeRecommendedVideo[]>([]);
  recommendationsRef.current = recommendations;

  // Поддержка прямых ссылок с параметром категории (например, /youtube?category=cinema)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category");
      if (cat === "mediathek" || cat === "cinema" || cat === "podcasts" || cat === "favorites" || cat === "youtube") {
        setActiveCategory(cat === "podcasts" ? "cinema" : (cat as TopCategory));
      }
    }
  }, []);

  // Загрузка актуальных подписок при смене языка или открытии
  useEffect(() => {
    let isMounted = true;

    async function syncAndLoad() {
      setIsLoadingSubs(true);

      // 1. Проверяем старый LocalStorage на наличие несинхронизированных подписок
      const localKeys = [
        currentLang === "EN" ? "subscriptions_en" : "subscriptions_de",
        currentLang === "EN" ? "yt_en_subscriptions" : "yt_de_subscriptions",
      ];

      for (const localKey of localKeys) {
        if (typeof window === "undefined") break;
        const legacyLocal = localStorage.getItem(localKey);
        if (legacyLocal) {
          try {
            const parsed: any[] = JSON.parse(legacyLocal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              for (const item of parsed) {
                const chId = item.channel_id || item.id;
                const chTitle = item.channel_title || item.name || item.title || "";
                if (chId) {
                  await addSubscriptionToDb({
                    channel_id: chId,
                    channel_title: chTitle,
                    channel_thumbnail: item.channel_thumbnail || item.thumbnail || "",
                    language: currentLang,
                  });
                }
              }
              // Очищаем старый ключ после успешного переноса в БД
              localStorage.removeItem(localKey);
            }
          } catch (e) {
            console.error("Ошибка миграции локальных подписок:", e);
          }
        }
      }

      // 2. Загружаем свежие данные из Supabase
      const dbSubs = await fetchSubscriptions(currentLang);
      if (isMounted) {
        setSubscriptions(dbSubs);
        setSelectedSubscribedChannel("ALL");
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `cached_subscriptions_${currentLang.toLowerCase()}`,
            JSON.stringify(dbSubs)
          );
        }
        setIsLoadingSubs(false);
      }

      // 3. Фоновая очистка старых кэшей и записей Supabase от плейсхолдеров "Канал"
      cleanSubscriptionsAndCache().catch(console.error);
    }

    syncAndLoad();

    return () => {
      isMounted = false;
    };
  }, [currentLang]);

  // Загрузка видео подписок
  const fetchSubscriptionVideos = useCallback(
    async (
      pageToLoad: number,
      append: boolean = false,
      targetChannelOverride?: string
    ) => {
      if (subscriptions.length === 0) {
        setSubVideos([]);
        setHasMoreSub(false);
        return;
      }

      const activeChannel =
        targetChannelOverride !== undefined
          ? targetChannelOverride
          : selectedSubscribedChannel;

      if (append) {
        setIsFetchingMoreSub(true);
      } else {
        setIsLoadingSubs(true);
        channelTokensRef.current = {};
      }

      try {
        const excludeIds = append
          ? subVideosRef.current.map((v) => (v as any).youtube_id || v.id)
          : [];

        if (activeChannel !== "ALL") {
          const chObj = subscriptions.find((s) => (s.channel_id || s.id) === activeChannel);
          const token = append ? channelTokensRef.current[activeChannel] || null : null;

          const res = await fetch(
            `/api/youtube/channel-videos?t=${Date.now()}&rnd=${Math.random()}`,
            {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channelId: activeChannel,
                channelName: chObj?.channel_title || chObj?.name || "",
                continuationToken: token,
                excludeIds,
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const newVideos: YouTubeRecommendedVideo[] = data.items || data.videos || [];
            channelTokensRef.current[activeChannel] = data.continuationToken || null;

            setSubVideos((prev) =>
              append ? appendUniqueVideos(prev, newVideos) : newVideos
            );
            setHasMoreSub(Boolean(data.continuationToken));
            setSubPage(pageToLoad);
          }
        } else {
          const channelIds = subscriptions
            .map((s) => s.channel_id || s.id)
            .filter(Boolean) as string[];
          const res = await fetch(
            `/api/youtube/subscriptions?t=${Date.now()}&rnd=${Math.random()}`,
            {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channelIds,
                page: pageToLoad,
                limit: 24,
                excludeIds,
                continuationTokens: append ? channelTokensRef.current : {},
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const newVideos: YouTubeRecommendedVideo[] = data.videos || data.items || [];
            if (data.continuationTokens) {
              channelTokensRef.current = data.continuationTokens;
            }
            setSubVideos((prev) =>
              append ? appendUniqueVideos(prev, newVideos) : newVideos
            );
            setHasMoreSub(data.hasMore ?? true);
            setSubPage(pageToLoad);
          }
        }
      } catch (err) {
        console.error("Failed to fetch subscriptions feed:", err);
      } finally {
        setIsLoadingSubs(false);
        setIsFetchingMoreSub(false);
      }
    },
    [subscriptions, selectedSubscribedChannel]
  );

  // Загрузка рекомендаций (с учетом языка DE / EN)
  const fetchRecommendations = useCallback(
    async (
      pageToLoad: number,
      append: boolean = false,
      levelOverride?: LevelType,
      langOverride?: Language,
      reset: boolean = false
    ) => {
      if (append && !reset) {
        setIsFetchingMoreRec(true);
      } else {
        setIsLoadingRec(true);
      }

      const lvl = levelOverride !== undefined ? levelOverride : selectedLevel;
      const targetLang = langOverride !== undefined ? langOverride : currentLang;
      const excludeIds =
        append && !reset
          ? recommendationsRef.current.map((v) => (v as any).youtube_id || v.id)
          : [];

      try {
        const res = await fetch(
          `/api/youtube/recommendations?t=${Date.now()}&rnd=${Math.random()}`,
          {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page: pageToLoad,
              limit: 16,
              level: lvl,
              lang: targetLang,
              excludeIds,
              timestamp: Date.now(),
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          const newVideos: YouTubeRecommendedVideo[] = data.videos || data.items || [];
          setRecommendations((prev) =>
            append && !reset ? appendUniqueVideos(prev, newVideos) : newVideos
          );
          setHasMoreRec(data.hasMore ?? true);
          setRecPage(pageToLoad);
        }
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setIsLoadingRec(false);
        setIsFetchingMoreRec(false);
      }
    },
    [selectedLevel, currentLang]
  );

  // Динамическая загрузка подкастов (порциями по 12 штук)
  // Auto switch to B1 if user is on Easy German in DE mode and level is A1 or A2
  useEffect(() => {
    if (!isEN && activeCategory === "youtube" && activeTab === "easy_german") {
      if (selectedLevel === "A1" || selectedLevel === "A2") {
        setSelectedLevel("B1");
      }
    }
  }, [isEN, activeCategory, activeTab, selectedLevel]);

  // Refetch recommendations when language changes
  useEffect(() => {
    setRecommendations([]);
    setRecPage(1);
    fetchRecommendations(1, false, selectedLevel, currentLang);
  }, [currentLang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch subscriptions when subscriptions list or selected channel changes
  useEffect(() => {
    fetchSubscriptionVideos(1, false);
  }, [subscriptions, selectedSubscribedChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Обработчик переключения языка DE / EN
  const handleLanguageChange = (newLang: Language) => {
    if (newLang === currentLang) return;
    setLanguage(newLang);

    if (newLang === "EN") {
      if (activeCategory === "mediathek") {
        setActiveCategory("cinema");
      }
    } else if (newLang === "DE") {
      if (activeCategory === "cinema" || (activeCategory as string) === "podcasts") {
        setActiveCategory("mediathek");
      }
    }
  };

  // Переключение подвкладок YouTube
  const handleTabChange = (tab: MainTab) => {
    if (tab === "easy_german" && !isEN && (selectedLevel === "A1" || selectedLevel === "A2")) {
      setSelectedLevel("B1");
    }
    setActiveTab(tab);
  };

  // Смена уровня сложности со сбросом пагинации в начало
  const handleLevelChange = (lvl: LevelType) => {
    if (lvl === selectedLevel) return;
    setSelectedLevel(lvl);

    if (activeCategory === "youtube") {
      setRecommendations([]);
      setRecPage(1);
      setHasMoreRec(true);
      fetchRecommendations(1, false, lvl, currentLang, true);
    }
  };

  // Load more handler for InfiniteVideoFeed (YouTube Recommendations & Subscriptions)
  const handleLoadMoreYouTube = useCallback(() => {
    if (activeCategory !== "youtube") return;

    if (activeTab === "recommendations" && hasMoreRec && !isLoadingRec && !isFetchingMoreRec) {
      fetchRecommendations(recPage + 1, true);
    } else if (
      activeTab === "subscriptions" &&
      hasMoreSub &&
      !isLoadingSubs &&
      !isFetchingMoreSub
    ) {
      fetchSubscriptionVideos(subPage + 1, true);
    }
  }, [
    activeCategory,
    activeTab,
    hasMoreRec,
    isLoadingRec,
    isFetchingMoreRec,
    recPage,
    fetchRecommendations,
    hasMoreSub,
    isLoadingSubs,
    isFetchingMoreSub,
    subPage,
    fetchSubscriptionVideos,
  ]);

  // Refresh feed: рандомизация и перезагрузка свежей порции без дублей
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (currentLang === "EN") {
      if (activeTab === "recommendations") {
        setRecPage(1);
        await fetchRecommendations(1, false, selectedLevel, "EN", true);
      } else if (activeTab === "subscriptions") {
        setSubPage(1);
        await fetchSubscriptionVideos(1, false);
      }
    } else {
      if (activeTab === "recommendations") {
        setRecPage(1);
        await fetchRecommendations(1, false, selectedLevel, "DE", true);
      } else if (activeTab === "subscriptions") {
        setSubPage(1);
        await fetchSubscriptionVideos(1, false);
      }
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Оптимистичные обработчики добавления и удаления подписок (без задержек UI)
  const handleToggleSubscribe = async (channel: { id: string; title: string; thumbnail?: string }) => {
    const channelId = channel.id;
    const isSubbed = subscriptions.some((s) => (s.channel_id || s.id) === channelId);

    if (isSubbed) {
      await handleRemoveChannel(channelId);
    } else {
      await handleAddChannel({
        id: channelId,
        channel_id: channelId,
        name: channel.title,
        channel_title: channel.title,
        channel_thumbnail: channel.thumbnail || "",
        language: currentLang,
      });
    }
  };

  const handleAddChannel = async (channel: SubscribedChannel) => {
    const channelId = channel.channel_id || channel.id || "";
    const channelTitle = channel.channel_title || channel.name || "";
    if (!channelId) return;

    const newSub: Subscription = {
      channel_id: channelId,
      channel_title: channelTitle,
      channel_thumbnail: channel.channel_thumbnail || "",
      language: currentLang,
      id: channelId,
      name: channelTitle,
    };

    // Мгновенно добавляем в стейт
    setSubscriptions((prev) => {
      const filtered = prev.filter((s) => (s.channel_id || s.id) !== channelId);
      const updated = [newSub, ...filtered];
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `cached_subscriptions_${currentLang.toLowerCase()}`,
          JSON.stringify(updated)
        );
      }
      return updated;
    });

    await addSubscriptionToDb({
      channel_id: newSub.channel_id,
      channel_title: newSub.channel_title,
      channel_thumbnail: newSub.channel_thumbnail,
      language: currentLang,
    });
  };

  const handleRemoveChannel = async (channelId: string) => {
    // Мгновенно убираем из стейта
    setSubscriptions((prev) => {
      const updated = prev.filter((s) => (s.channel_id || s.id) !== channelId);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `cached_subscriptions_${currentLang.toLowerCase()}`,
          JSON.stringify(updated)
        );
      }
      return updated;
    });
    setSubVideos((prev) => prev.filter((v) => v.channelId !== channelId));
    if (selectedSubscribedChannel === channelId) {
      setSelectedSubscribedChannel("ALL");
    }

    await removeSubscriptionFromDb(channelId, currentLang);
  };

  // Уровни в зависимости от выбранного языка (A1-C1 для обоих в каталоге)
  const levelPills: { id: LevelType; label: string }[] = [
    { id: "ALL", label: "Все" },
    ...(isEN ? EN_STANDARD_LEVELS : DE_STANDARD_LEVELS).map((l) => ({ id: l as LevelType, label: l })),
  ];

  // Base videos for YouTube subtabs
  const baseVideos = activeTab === "recommendations" ? recommendations : subVideos;
  const minDurSec =
    isEN || selectedLevel === "A1" || selectedLevel === "A2"
      ? 180
      : activeTab === "subscriptions"
      ? 200
      : 600;

  const isFilterActive =
    Boolean(selectedLevel) &&
    (selectedLevel as string) !== "ALL" &&
    (selectedLevel as string) !== "Все" &&
    (selectedLevel as string) !== "all";

  const currentVideos = baseVideos.filter((video) => {
    if (isYouTubeShort(video, minDurSec)) return false;

    // Строгая фильтрация по выбранному уровню: исключаем видео без level или с другим level
    if (isFilterActive) {
      if (!video.level) return false;
      if (String(video.level).trim().toUpperCase() !== String(selectedLevel).trim().toUpperCase()) {
        return false;
      }
    }

    if (activeTab === "subscriptions") {
      if (selectedSubscribedChannel === "ALL") return true;
      const chClean = (video.channel || "").toLowerCase().trim();
      const selClean = selectedSubscribedChannel.toLowerCase().trim();
      return (
        chClean === selClean ||
        chClean.includes(selClean) ||
        video.channelId === selectedSubscribedChannel
      );
    }

    return true;
  });

  // Client-side deduplication of unique videos by ID and Title
  const seenTitles = new Set<string>();
  const uniqueVideos = Array.from(
    new Map(currentVideos.map((v) => [(v as any).youtube_id || v.id, v])).values()
  ).filter((v) => {
    const norm = (v.title || "").trim().toLowerCase();
    if (seenTitles.has(norm)) return false;
    seenTitles.add(norm);
    return true;
  });

  // Client-side deduplication of isolated favorites
  const uniqueFavorites = Array.from(
    new Map(
      favorites.map((v) => [(v as any).youtube_id || v.id || (v as any).url_website, v])
    ).values()
  );

  const favCount = isEN ? favoritesEN.length : favoritesDE.length;

  return (
    <div className="relative min-h-screen bg-black text-white pb-24 px-4 md:px-12 pt-1 transition-colors duration-500 overflow-x-hidden">
      {/* 1. Основное кинематографичное красное свечение Netflix (1-в-1 для DE и EN) */}
      <div 
        className={`fixed -top-36 left-1/2 -translate-x-1/2 w-[1100px] h-[420px] pointer-events-none transition-opacity duration-700 ease-out z-0 blur-[150px] ${
          activeCategory === "youtube" && activeTab === "easy_german"
            ? "opacity-0"
            : "opacity-25 bg-[radial-gradient(ellipse_at_top,rgba(229,9,20,0.8),transparent_70%)]"
        }`}
      />

      {/* 2. Синяя фоновая дымка (Blue Cinema Glow) для Easy English в режиме EN */}
      <div 
        className={`fixed -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[520px] pointer-events-none transition-opacity duration-1000 ease-out z-0 blur-[160px] ${
          isEN && activeCategory === "youtube" && activeTab === "easy_german"
            ? "opacity-35 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.7),rgba(30,58,138,0.25)_45%,transparent_75%)]"
            : "opacity-0"
        }`}
      />

      {/* 3. Изумрудная дымка (rgba(16,185,129,0.3)) для Easy German в режиме DE */}
      <div
        className={`fixed -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] pointer-events-none transition-opacity duration-1000 ease-out z-0 blur-[160px] ${
          !isEN && activeCategory === "youtube" && activeTab === "easy_german"
            ? "opacity-100"
            : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(16,185,129,0.3), rgba(6,78,59,0.15) 45%, transparent 75%)",
        }}
      />

      <div className="relative z-10">
        {/* Шапка: логотип Netflix + свитчер языка в правом верхнем углу + кнопки выбора источников */}
        <header className="relative w-full pt-6 pb-4 flex flex-col items-center">
          {/* Переключатель языка (DE | EN) в правом верхнем углу */}
          <div className="absolute top-6 right-6 sm:right-10 z-30">
            <LanguageSwitcher
              currentLang={currentLang}
              onLanguageChange={handleLanguageChange}
            />
          </div>

          <div className="mb-4">
            <NetflixLogo className="h-7 sm:h-8" />
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center">
            {/* YouTube */}
            <button
              onClick={() => setActiveCategory("youtube")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] cursor-pointer ${
                activeCategory === "youtube"
                  ? "bg-white text-black shadow-md"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-red-600 shrink-0" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span>YouTube</span>
            </button>

            {/* Второй источник: Mediathek (DE) или Cinema (EN) */}
            {isEN ? (
              <button
                onClick={() => setActiveCategory("cinema")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-all duration-200 cursor-pointer ${
                  activeCategory === "cinema"
                    ? "bg-white text-black shadow-lg shadow-white/10"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Cinema</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveCategory("mediathek")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-colors duration-200 cursor-pointer ${
                  activeCategory === "mediathek"
                    ? "bg-white text-black shadow-md"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                Mediathek
              </button>
            )}

            {/* Избранное (Изолированное по языку DE / EN) */}
            <button
              onClick={() => setActiveCategory("favorites")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 outline-none select-none [-webkit-tap-highlight-color:transparent] active:scale-95 cursor-pointer ${
                activeCategory === "favorites"
                  ? "bg-[#E50914] text-white shadow-lg shadow-red-950/60"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
              }`}
              title="Избранное"
            >
              <Bookmark
                size={13}
                className={
                  activeCategory === "favorites"
                    ? "fill-white text-white"
                    : "text-zinc-400"
                }
              />
              <span>{favCount}</span>
            </button>
          </div>
        </header>

        {/* RENDER ACTIVE TOP CATEGORY */}
        {activeCategory === "favorites" ? (
          <div className="max-w-7xl mx-auto">
            {uniqueFavorites.length === 0 ? (
              <div className="py-24 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center flex flex-col items-center justify-center p-8 gap-3 max-w-lg mx-auto">
                <Bookmark className="w-12 h-12 text-zinc-600" />
                <h3 className="text-base font-bold text-white">
                  Здесь будут ваши сохраненные фильмы и ролики ({currentLang})
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {isEN
                    ? "Нажмите на значок закладки на любой карточке в YouTube, чтобы добавить видео в избранное английского раздела."
                    : "Нажмите на значок закладки на любой карточке в YouTube или ARD & ZDF, чтобы добавить видео в этот список."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {uniqueFavorites.map((item) => (
                  <VideoCard
                    key={(item as any).youtube_id || item.id || (item as any).url_website}
                    video={item}
                    onRemoveFavorite={() => removeFavorite(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeCategory === "mediathek" && !isEN ? (
          <MediathekCatalog />
        ) : activeCategory === "cinema" ? (
          <div className="max-w-7xl mx-auto">
            <CinemaCatalog />
          </div>
        ) : (
          <>
            {/* YouTube Подменю: [ Рекомендации ] [ Подписки ] [ Easy German / Easy English ] */}
            <div className="max-w-7xl mx-auto mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {/* Таб 1: Рекомендации */}
                  <button
                    onClick={() => handleTabChange("recommendations")}
                    className={`px-4 py-2 rounded-full text-xs font-semibold outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-colors duration-200 cursor-pointer ${
                      activeTab === "recommendations"
                        ? "bg-red-600 text-white shadow-lg shadow-red-950/40"
                        : "bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Рекомендации
                  </button>

                  {/* Таб 2: Подписки с бейджем количества каналов */}
                  <button
                    onClick={() => handleTabChange("subscriptions")}
                    className={`px-4 py-2 rounded-full text-xs font-semibold outline-none flex items-center gap-2 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-colors duration-200 cursor-pointer ${
                      activeTab === "subscriptions"
                        ? "bg-red-600 text-white shadow-lg shadow-red-950/40"
                        : "bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>Подписки</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        activeTab === "subscriptions"
                          ? "bg-white/20 text-white"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {subscriptions.length}
                    </span>
                  </button>

                  {/* Таб 3: Easy German (DE) / Easy English (EN) */}
                  <button
                    onClick={() => handleTabChange("easy_german")}
                    className={`px-4 py-2 rounded-full text-xs font-semibold outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-colors duration-200 cursor-pointer ${
                      activeTab === "easy_german"
                        ? isEN
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/60"
                          : "bg-emerald-600 text-white shadow-lg shadow-emerald-950/60"
                        : isEN
                        ? "bg-zinc-900/90 text-zinc-400 hover:text-white border border-zinc-800 hover:border-blue-500/30"
                        : "bg-zinc-900/90 text-zinc-400 hover:text-white border border-zinc-800 hover:border-emerald-500/30"
                    }`}
                  >
                    {isEN ? "Easy English" : "Easy German"}
                  </button>
                </div>

                {/* Controls right side (only for Recommendations & Subscriptions) */}
                {activeTab !== "easy_german" && (
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Группа переключателей уровней (DE: B1–C1, EN: A1–C1) */}
                    <div className="flex items-center p-1 bg-zinc-900 rounded-full border border-zinc-800 flex-wrap">
                      {levelPills.map((lvl) => {
                        const isActive = selectedLevel === lvl.id;
                        return (
                          <button
                            key={lvl.id}
                            onClick={() => handleLevelChange(lvl.id)}
                            className={`px-3 py-1 text-xs rounded-full outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-colors duration-200 cursor-pointer ${
                              isActive
                                ? "bg-white text-black font-semibold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            {lvl.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Refresh Feed Button */}
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing || isLoadingRec || isLoadingSubs}
                      className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 [-webkit-tap-highlight-color:transparent] transition-colors duration-200 disabled:opacity-50 cursor-pointer shadow"
                      title="Обновить"
                    >
                      <RotateCw
                        className={`w-4 h-4 transition-transform duration-500 ${
                          isRefreshing ? "rotate-180 animate-spin text-white" : "text-red-500 hover:scale-110"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Subscriptions sub-bar */}
              {activeTab === "subscriptions" && (
                <div className="mt-4 flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span className="text-xs text-zinc-400 font-medium whitespace-nowrap mr-1">
                      Канал:
                    </span>
                    <button
                      onClick={() => setSelectedSubscribedChannel("ALL")}
                      className={`px-3 py-1 rounded-full text-xs outline-none cursor-pointer whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-colors duration-200 ${
                        selectedSubscribedChannel === "ALL"
                          ? "bg-white text-black font-semibold"
                          : "bg-zinc-900 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Все каналы
                    </button>
                    {subscriptions.map((ch) => {
                      const chId = ch.channel_id || ch.id || "";
                      const chName = ch.channel_title || ch.name || "";
                      const displayName = chName && chName.toLowerCase() !== "канал" ? chName : chId;
                      return (
                        <button
                          key={chId}
                          onClick={() => setSelectedSubscribedChannel(chId)}
                          className={`px-3 py-1 rounded-full text-xs outline-none cursor-pointer whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent] transition-colors duration-200 ${
                            selectedSubscribedChannel === chId
                              ? "bg-white text-black font-semibold"
                              : "bg-zinc-900 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {displayName}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setIsManageModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer shadow transition active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ring-0 border-none [-webkit-tap-highlight-color:transparent]"
                    >
                      <Plus size={14} />
                      <span>Добавить канал</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Video Feed Area */}
            <div className="max-w-7xl mx-auto">
              {activeTab === "easy_german" ? (
                <EasyGermanCatalog lang={currentLang} />
              ) : (activeTab === "subscriptions" && isLoadingSubs && subVideos.length === 0) ||
                (activeTab === "recommendations" && isLoadingRec && recommendations.length === 0) ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
                  <span className="text-sm font-medium">
                    {isEN
                      ? "Загрузка видео на американском английском..."
                      : "Загрузка свежих видео из немецких каналов..."}
                  </span>
                </div>
              ) : uniqueVideos.length === 0 ? (
                <div className="py-20 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center flex flex-col items-center justify-center p-8 gap-3 max-w-lg mx-auto">
                  {activeTab === "subscriptions" ? (
                    <>
                      <Tv className="w-10 h-10 text-zinc-600" />
                      <h3 className="text-base font-bold text-white">
                        В ваших подписках пока нет доступных видео
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {isEN
                          ? "Добавьте больше американских YouTube-каналов или выберите другой канал в списке."
                          : "Добавьте больше немецких YouTube-каналов или выберите другой канал в списке."}
                      </p>
                      <button
                        onClick={() => setIsManageModalOpen(true)}
                        className="mt-2 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
                      >
                        {isEN
                          ? "Добавить американский YouTube-канал"
                          : "Добавить немецкий YouTube-канал"}
                      </button>
                    </>
                  ) : (
                    <>
                      <Video className="w-10 h-10 text-zinc-600" />
                      <h3 className="text-base font-bold text-white">Видео не найдены</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        В каталоге пока нет видео по выбранным критериям.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                /* Бесконечная лента YouTube (Рекомендации и Подписки) */
                <InfiniteVideoFeed
                  items={uniqueVideos}
                  hasMore={activeTab === "recommendations" ? hasMoreRec : hasMoreSub}
                  isFetchingMore={
                    activeTab === "recommendations" ? isFetchingMoreRec : isFetchingMoreSub
                  }
                  onLoadMore={handleLoadMoreYouTube}
                />
              )}
            </div>
          </>
        )}

        {/* Manage Channels Modal */}
        <ManageChannelsModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          channels={subscriptions}
          onAddChannel={handleAddChannel}
          onRemoveChannel={handleRemoveChannel}
          language={currentLang}
        />
      </div>
    </div>
  );
}
