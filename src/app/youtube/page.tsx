"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Play, 
  Search, 
  Sparkles, 
  BookMarked, 
  Languages, 
  AlertCircle,
  X,
  Plus,
  Tv,
  Check,
  Loader2,
  Trash2,
  ExternalLink
} from "lucide-react";
import { 
  RECOMMENDED_YOUTUBE_VIDEOS, 
  CORE_CHANNELS, 
  extractYouTubeId, 
  extractYouTubeChannelId 
} from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo } from "@/types/youtube";
import InteractivePlayer from "@/components/youtube/InteractivePlayer";

interface CustomSubscription {
  id: string;       // Channel ID (UC...)
  name: string;
  handle?: string;
}

const DEFAULT_CUSTOM_SUBSCRIPTIONS: CustomSubscription[] = [
  { id: "UCbxb2fqe9oNgglAoYqsYOtQ", name: "Easy German", handle: "@EasyGerman" },
  { id: "UCUuab1dctZzN5ZmRmQnTzkg", name: "WDR Doku", handle: "@WDRDoku" },
  { id: "UCxUWIEL-USsiPak0Qy6_vVg", name: "DW Deutsch lernen", handle: "@dwdeutschlernen" },
  { id: "UCZHpIFMfoJJ_1QxNGLJTzyA", name: "MrWissen2go", handle: "@MrWissen2go" },
];

export default function YouTubeCatalogPage() {
  const router = useRouter();

  // Search / Direct Link Input
  const [searchInput, setSearchInput] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Active Video Modal Player
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title?: string;
    channel?: string;
  } | null>(null);

  // Tabs: "all", "Easy German", "WDR Doku", "DW Deutsch", "MrWissen2go", "subscriptions"
  const [selectedTab, setSelectedTab] = useState<string>("all");

  // Dynamic Channel Feed Cache: channelId -> YouTubeRecommendedVideo[]
  const [channelVideos, setChannelVideos] = useState<Record<string, YouTubeRecommendedVideo[]>>({});
  const [isLoadingChannel, setIsLoadingChannel] = useState<boolean>(false);

  // Custom User Subscriptions
  const [subscriptions, setSubscriptions] = useState<CustomSubscription[]>(DEFAULT_CUSTOM_SUBSCRIPTIONS);
  const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState<boolean>(false);
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

  // Save subscriptions to localStorage
  const saveSubscriptions = (subs: CustomSubscription[]) => {
    setSubscriptions(subs);
    try {
      localStorage.setItem("yt_de_subscriptions", JSON.stringify(subs));
    } catch {}
  };

  // Fetch channel videos via RSS API route
  const fetchChannelVideos = async (channelId: string, channelName: string) => {
    if (channelVideos[channelId]) return;

    setIsLoadingChannel(true);
    try {
      const resp = await fetch(`/api/youtube/channel?channelId=${encodeURIComponent(channelId)}`);
      const data = await resp.json();
      if (resp.ok && data.videos && Array.isArray(data.videos)) {
        setChannelVideos((prev) => ({
          ...prev,
          [channelId]: data.videos.map((v: any) => ({
            ...v,
            channel: channelName,
          })),
        }));
      }
    } catch (err) {
      console.error("Failed to load channel RSS:", err);
    } finally {
      setIsLoadingChannel(false);
    }
  };

  // Load channel videos when selecting a core channel tab
  useEffect(() => {
    const channelInfo = CORE_CHANNELS[selectedTab];
    if (channelInfo) {
      fetchChannelVideos(channelInfo.id, channelInfo.name);
    }
  }, [selectedTab]);

  // Handle Search / Direct Watch submit
  const handleSearchOrWatch = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const trimmed = searchInput.trim();
    if (!trimmed) return;

    // 1. If it's a YouTube URL or pure 11-char ID -> Open player immediately
    const directVideoId = extractYouTubeId(trimmed);
    if (directVideoId) {
      setActiveVideo({
        id: directVideoId,
        title: "Пользовательское видео",
        channel: "YouTube",
      });
      return;
    }

    // 2. Otherwise it's a text search query -> Filter the view below
  };

  // Combine videos for the current tab
  const getCurrentTabVideos = (): YouTubeRecommendedVideo[] => {
    let list: YouTubeRecommendedVideo[] = [];

    if (selectedTab === "all") {
      // Show curated list + cached RSS items
      list = [...RECOMMENDED_YOUTUBE_VIDEOS];
    } else if (selectedTab === "subscriptions") {
      // Gather videos for all custom subscriptions
      const allSubIds = subscriptions.map((s) => s.id);
      const subVideos: YouTubeRecommendedVideo[] = [];

      allSubIds.forEach((id) => {
        if (channelVideos[id]) {
          subVideos.push(...channelVideos[id]);
        }
      });

      list = subVideos.length > 0 ? subVideos : RECOMMENDED_YOUTUBE_VIDEOS;
    } else if (CORE_CHANNELS[selectedTab]) {
      const channelInfo = CORE_CHANNELS[selectedTab];
      const feedVideos = channelVideos[channelInfo.id];
      const curated = RECOMMENDED_YOUTUBE_VIDEOS.filter(
        (v) => v.channel.toLowerCase().includes(channelInfo.name.toLowerCase()) ||
               channelInfo.name.toLowerCase().includes(v.channel.toLowerCase())
      );

      // Merge curated with latest RSS feed (deduplicating by id)
      const map = new Map<string, YouTubeRecommendedVideo>();
      curated.forEach((v) => map.set(v.id, v));
      feedVideos?.forEach((v) => map.set(v.id, v));
      list = Array.from(map.values());
    }

    // Apply text search filter if user typed a topic (e.g. "B2", "Beruf", "Doku", "Grammatik")
    if (searchInput.trim() && !extractYouTubeId(searchInput.trim())) {
      const q = searchInput.trim().toLowerCase();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.channel.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.level?.toLowerCase().includes(q)
      );
    }

    return list;
  };

  // Add custom subscription channel handler
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddChannelError(null);

    const channelId = extractYouTubeChannelId(newChannelInput);
    if (!channelId) {
      setAddChannelError("Пожалуйста, укажите валидный ID канала (начинается с UC...) или ссылку на канал.");
      return;
    }

    const name = newChannelName.trim() || `Канал (${channelId.slice(0, 8)}...)`;
    const updated = [...subscriptions.filter((s) => s.id !== channelId), { id: channelId, name }];
    saveSubscriptions(updated);

    // Fetch its videos
    fetchChannelVideos(channelId, name);

    setIsAddChannelModalOpen(false);
    setNewChannelInput("");
    setNewChannelName("");
    setSelectedTab("subscriptions");
  };

  const currentVideos = getCurrentTabVideos();

  const tabs = [
    { key: "all", label: "Все" },
    { key: "Easy German", label: "Easy German" },
    { key: "WDR Doku", label: "WDR Doku" },
    { key: "DW Deutsch", label: "DW Deutsch" },
    { key: "MrWissen2go", label: "MrWissen2go" },
    { key: "subscriptions", label: `Мои подписки (${subscriptions.length})` },
  ];

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20 px-4 md:px-12 pt-6">
      {/* Title & Description Hero */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded bg-[#E50914] text-white text-[11px] font-extrabold uppercase tracking-wider">
            YOUTUBE DE
          </span>
          <span className="text-zinc-400 text-xs font-medium">
            Интерактивный плеер с оверлеем и hover-переводом
          </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-2">
          Изучайте немецкий по оригинальным видео
        </h1>
        <p className="text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
          Наводите курсор на слова в субтитрах для моментального перевода без остановки потока речи или кликайте, чтобы сохранить слово в свой словарь.
        </p>
      </div>

      {/* Unified Search & Watch Input Box */}
      <div className="max-w-4xl mx-auto mb-10">
        <form
          onSubmit={handleSearchOrWatch}
          className="relative bg-zinc-900/90 border border-zinc-700/80 rounded-2xl p-2 md:p-2.5 shadow-2xl flex flex-col sm:flex-row items-center gap-2 focus-within:border-[#E50914] transition-all"
        >
          <div className="flex items-center gap-3 w-full pl-3 pr-2 py-1">
            <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="Вставьте ссылку на YouTube / ID или введите тему («B2», «Beruf», «Doku»)..."
              className="w-full bg-transparent outline-none text-white placeholder:text-zinc-500 text-sm md:text-base"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/30 flex-shrink-0 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Смотреть</span>
          </button>
        </form>

        {inputError && (
          <div className="flex items-center gap-2 text-red-400 text-xs md:text-sm mt-3 px-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{inputError}</span>
          </div>
        )}
      </div>

      {/* Channel & Subscription Tabs Bar */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800 pb-4">
        {/* Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedTab === tab.key
                  ? "bg-white text-black shadow-lg scale-105"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add Channel Button */}
        <button
          onClick={() => setIsAddChannelModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#E50914]" />
          <span>Добавить канал</span>
        </button>
      </div>

      {/* Videos Section */}
      <div className="max-w-6xl mx-auto">
        {isLoadingChannel ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
            <span className="text-sm">Загружаем свежие видео канала...</span>
          </div>
        ) : currentVideos.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <Languages className="w-12 h-12 text-zinc-700" />
            <h3 className="text-lg font-bold text-white">Видео не найдены</h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              Попробуйте изменить поисковый запрос или вставьте прямую ссылку на любое немецкое видео с YouTube.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
            {currentVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => setActiveVideo({ id: video.id, title: video.title, channel: video.channel })}
                className="group relative bg-[#181818] rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-zinc-600 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-20 flex flex-col cursor-pointer"
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
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded shadow-md tracking-wider ${
                        video.level === "B2"
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {video.level || "B1"}
                    </span>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[#E50914] text-[11px] font-bold uppercase tracking-wider block mb-1">
                      {video.channel}
                    </span>
                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                      {video.title}
                    </h3>
                  </div>

                  <p className="text-zinc-500 text-xs line-clamp-2 mt-2 leading-relaxed">
                    {video.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Overlay Interactive Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl flex justify-end mb-2">
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
      {isAddChannelModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Tv className="w-5 h-5 text-[#E50914]" />
                <span>Добавить канал в подписки</span>
              </div>
              <button
                onClick={() => setIsAddChannelModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddChannel} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">
                  ID канала YouTube или ссылка (например, UCbxb2fqe9oNgglAoYqsYOtQ):
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
                  onClick={() => setIsAddChannelModalOpen(false)}
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
