"use client";

import React, { useState, useEffect } from "react";
import { 
  Play, 
  Search, 
  BookMarked, 
  Plus, 
  X, 
  AlertCircle, 
  Loader2, 
  Tv, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { 
  RECOMMENDED_YOUTUBE_VIDEOS, 
  CORE_CHANNELS, 
  extractYouTubeId, 
  extractYouTubeChannelId 
} from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import InteractivePlayer from "@/components/youtube/InteractivePlayer";
import { useYouTube } from "@/context/YouTubeContext";

interface CustomSubscription {
  id: string; // UC...
  name: string;
}

const DEFAULT_SUBSCRIPTIONS: CustomSubscription[] = [
  { id: "UCbxb2fqe9oNgglAoYqsYOtQ", name: "Easy German" },
  { id: "UCUuab1dctZzN5ZmRmQnTzkg", name: "WDR Doku" },
  { id: "UCxUWIEL-USsiPak0Qy6_vVg", name: "DW Deutsch lernen" },
  { id: "UCZHpIFMfoJJ_1QxNGLJTzyA", name: "MrWissen2go" },
];

export default function YouTubeCatalogPage() {
  const { openDictionary, savedWords } = useYouTube();

  // Search & Direct Watch
  const [searchInput, setSearchInput] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Active Video Modal
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title?: string;
    channel?: string;
  } | null>(null);

  // Subscriptions & Dynamic Feed
  const [subscriptions, setSubscriptions] = useState<CustomSubscription[]>(DEFAULT_SUBSCRIPTIONS);
  const [subVideos, setSubVideos] = useState<YouTubeRecommendedVideo[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(false);

  // Add Channel Modal
  const [isAddChannelOpen, setIsAddChannelOpen] = useState<boolean>(false);
  const [newChannelInput, setNewChannelInput] = useState<string>("");
  const [newChannelName, setNewChannelName] = useState<string>("");
  const [addChannelError, setAddChannelError] = useState<string | null>(null);

  // Load subscriptions from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("yt_de_subscriptions");
      if (stored) {
        setSubscriptions(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Save subscriptions
  const saveSubscriptions = (subs: CustomSubscription[]) => {
    setSubscriptions(subs);
    try {
      localStorage.setItem("yt_de_subscriptions", JSON.stringify(subs));
    } catch {}
  };

  // Fetch subscription videos via RSS route (excluding #shorts)
  useEffect(() => {
    let isCancelled = false;

    async function loadSubFeeds() {
      if (subscriptions.length === 0) return;
      setIsLoadingSubs(true);

      const allVideos: YouTubeRecommendedVideo[] = [];
      for (const sub of subscriptions) {
        try {
          const resp = await fetch(`/api/youtube/channel?channelId=${encodeURIComponent(sub.id)}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.videos && Array.isArray(data.videos)) {
              allVideos.push(...data.videos);
            }
          }
        } catch (err) {
          console.warn("Feed error for", sub.name, err);
        }
      }

      if (!isCancelled) {
        // Exclude shorts and deduplicate
        const filtered = allVideos.filter((v) => {
          const t = v.title.toLowerCase();
          return !t.includes("#shorts") && !t.includes("shorts") && !t.includes("#short");
        });
        setSubVideos(filtered);
        setIsLoadingSubs(false);
      }
    }

    loadSubFeeds();

    return () => {
      isCancelled = true;
    };
  }, [subscriptions]);

  // Handle Search / Direct Watch
  const handleSearchOrWatch = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const trimmed = searchInput.trim();
    if (!trimmed) return;

    // Direct YouTube link or 11-char ID
    const directId = extractYouTubeId(trimmed);
    if (directId) {
      setActiveVideo({
        id: directId,
        title: "Пользовательское видео",
        channel: "YouTube",
      });
      return;
    }
  };

  // Add channel handler
  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    setAddChannelError(null);

    const channelId = extractYouTubeChannelId(newChannelInput);
    if (!channelId) {
      setAddChannelError("Укажите ссылку на канал или ID (начинается с UC...).");
      return;
    }

    const name = newChannelName.trim() || `Канал (${channelId.slice(0, 8)}...)`;
    const updated = [...subscriptions.filter((s) => s.id !== channelId), { id: channelId, name }];
    saveSubscriptions(updated);

    setIsAddChannelOpen(false);
    setNewChannelInput("");
    setNewChannelName("");
  };

  // Filter recommendations based on search
  const isSearchQuery = searchInput.trim().length > 0 && !extractYouTubeId(searchInput.trim());
  const query = searchInput.trim().toLowerCase();

  const filteredRecommendations = isSearchQuery
    ? RECOMMENDED_YOUTUBE_VIDEOS.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.channel.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query) ||
          v.level.toLowerCase().includes(query)
      )
    : RECOMMENDED_YOUTUBE_VIDEOS;

  const filteredSubVideos = isSearchQuery
    ? subVideos.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.channel.toLowerCase().includes(query)
      )
    : subVideos;

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24 px-4 md:px-12 pt-4">
      {/* Top Controls: Search Bar & Dictionary Button */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 pt-2">
        {/* Search Input Box */}
        <div className="w-full sm:max-w-xl">
          <form
            onSubmit={handleSearchOrWatch}
            className="relative bg-zinc-900/90 border border-zinc-800 rounded-full px-4 py-2 flex items-center gap-2.5 focus-within:border-zinc-500 transition-all shadow-lg"
          >
            <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="Поиск видео или вставка ссылки YouTube..."
              className="bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none w-full"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="text-zinc-500 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="hidden sm:inline-block px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
            >
              Смотреть
            </button>
          </form>

          {inputError && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs mt-2 px-3">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{inputError}</span>
            </div>
          )}
        </div>

        {/* Dictionary / Flashcards Button */}
        <button
          onClick={openDictionary}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white font-medium text-xs sm:text-sm transition-all shadow-md cursor-pointer group"
        >
          <BookMarked className="w-4 h-4 text-[#E50914] group-hover:scale-105 transition-transform" />
          <span>Мой словарь</span>
          {savedWords.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-600/20 border border-red-500/40 text-[11px] font-bold text-red-400">
              {savedWords.length}
            </span>
          )}
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        {/* CATEGORY 1: Рекомендации (B1–B2) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Рекомендации (B1–B2)
              </h2>
              <span className="text-xs text-zinc-500 hidden sm:inline">• Тематические видео</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredRecommendations.map((video) => (
              <div
                key={video.id}
                onClick={() => setActiveVideo({ id: video.id, title: video.title, channel: video.channel })}
                className="group relative bg-[#181818] rounded-xl overflow-hidden border border-zinc-800/80 hover:border-zinc-600 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-20 flex flex-col cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-video bg-zinc-900 overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  {/* Level Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow ${
                        video.level === "B2"
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {video.level}
                    </span>
                  </div>

                  {/* Duration Badge */}
                  {video.durationText && (
                    <div className="absolute bottom-2 right-2.5 z-10 bg-black/80 text-zinc-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {video.durationText}
                    </div>
                  )}

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="w-11 h-11 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3.5 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[#E50914] text-[10px] font-bold uppercase tracking-wider block mb-1">
                      {video.channel}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                      {video.title}
                    </h3>
                  </div>

                  <p className="text-zinc-500 text-[11px] line-clamp-2 mt-2 leading-relaxed">
                    {video.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CATEGORY 2: Мои подписки */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Мои подписки
              </h2>
              <span className="text-xs text-zinc-500 hidden sm:inline">
                • {subscriptions.length} {subscriptions.length === 1 ? "канал" : "каналов"}
              </span>
            </div>

            {/* Add Channel Button */}
            <button
              onClick={() => setIsAddChannelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#E50914]" />
              <span>+ Добавить канал</span>
            </button>
          </div>

          {isLoadingSubs && subVideos.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#E50914]" />
              <span className="text-xs">Загрузка видео из подписок...</span>
            </div>
          ) : filteredSubVideos.length === 0 ? (
            <div className="py-12 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center flex flex-col items-center justify-center p-6 gap-2">
              <Tv className="w-8 h-8 text-zinc-600" />
              <p className="text-xs text-zinc-400">Нет видео в подписках</p>
              <button
                onClick={() => setIsAddChannelOpen(true)}
                className="mt-1 text-xs text-[#E50914] hover:underline"
              >
                Добавить немецкий YouTube-канал
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredSubVideos.slice(0, 16).map((video) => (
                <div
                  key={video.id}
                  onClick={() => setActiveVideo({ id: video.id, title: video.title, channel: video.channel })}
                  className="group relative bg-[#181818] rounded-xl overflow-hidden border border-zinc-800/80 hover:border-zinc-600 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-20 flex flex-col cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative w-full aspect-video bg-zinc-900 overflow-hidden">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    {/* Level */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow bg-zinc-800/90 text-zinc-200 border border-zinc-700">
                        {video.level || "B1"}
                      </span>
                    </div>

                    {/* Play Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="w-11 h-11 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between">
                    <div>
                      <span className="text-[#E50914] text-[10px] font-bold uppercase tracking-wider block mb-1">
                        {video.channel}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                        {video.title}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal Interactive Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-7xl flex justify-end mb-2">
            <button
              onClick={() => setActiveVideo(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Закрыть плеер</span>
            </button>
          </div>

          <InteractivePlayer
            videoId={activeVideo.id}
            videoTitle={activeVideo.title}
            channelTitle={activeVideo.channel}
            onBackToCatalog={() => setActiveVideo(null)}
          />
        </div>
      )}

      {/* Add Channel Modal */}
      {isAddChannelOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#181818] border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Tv className="w-5 h-5 text-[#E50914]" />
                <span>Добавить канал в подписки</span>
              </div>
              <button
                onClick={() => setIsAddChannelOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddChannel} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">
                  ID канала YouTube или ссылка (UC...):
                </label>
                <input
                  type="text"
                  value={newChannelInput}
                  onChange={(e) => setNewChannelInput(e.target.value)}
                  placeholder="https://www.youtube.com/channel/UC..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#E50914]"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">
                  Название канала (опционально):
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Например, Galileo Deutsch"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#E50914]"
                />
              </div>

              {addChannelError && (
                <p className="text-xs text-red-400">{addChannelError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddChannelOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all shadow-md shadow-red-900/30"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
