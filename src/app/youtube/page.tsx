"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Play, 
  Search, 
  Sparkles, 
  BookMarked, 
  Languages, 
  ExternalLink, 
  AlertCircle,
  X,
  Trash2,
  Volume2
} from "lucide-react";
import { RECOMMENDED_YOUTUBE_VIDEOS, extractYouTubeId } from "@/data/youtubeVideos";
import { YouTubeRecommendedVideo, UserWord } from "@/types/youtube";
import InteractivePlayer from "@/components/youtube/InteractivePlayer";
import { getSavedWordsAction, deleteSavedWordAction } from "@/app/youtube/actions";

export default function YouTubeCatalogPage() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Selected video for inline Netflix-style modal player
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title?: string;
    channel?: string;
  } | null>(null);

  // Saved words (Flashcards / Dictionary) modal
  const [showDictionaryModal, setShowDictionaryModal] = useState<boolean>(false);
  const [savedWords, setSavedWords] = useState<UserWord[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState<boolean>(false);

  // Filter channels
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  const channels = ["all", "Easy German", "WDR Doku", "DW Deutsch lernen", "MrWissen2go"];

  const filteredVideos = selectedChannel === "all"
    ? RECOMMENDED_YOUTUBE_VIDEOS
    : RECOMMENDED_YOUTUBE_VIDEOS.filter((v) => v.channel === selectedChannel);

  // Handle URL submit
  const handleWatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const videoId = extractYouTubeId(urlInput);
    if (!videoId) {
      setInputError(
        "Пожалуйста, введите корректную ссылку на YouTube (например, https://www.youtube.com/watch?v=... или 11-значный ID)."
      );
      return;
    }

    // Open video in interactive player
    setActiveVideo({ id: videoId, title: "Пользовательское видео", channel: "YouTube" });
  };

  // Load saved words
  const handleOpenDictionary = async () => {
    setShowDictionaryModal(true);
    setIsLoadingWords(true);
    try {
      const res = await getSavedWordsAction();
      if (res.success && res.data) {
        setSavedWords(res.data);
      }
    } catch {}
    setIsLoadingWords(false);
  };

  const handleDeleteWord = async (word: string) => {
    setSavedWords((prev) => prev.filter((item) => item.word !== word));
    await deleteSavedWordAction(word);
  };

  const handleSpeak = (word: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "de-DE";
      window.speechSynthesis.speak(u);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white pt-24 pb-20 px-4 md:px-12">
      {/* Hero / Header Section */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded bg-[#E50914] text-white text-[11px] font-extrabold uppercase tracking-wider">
              YouTube DE
            </span>
            <span className="text-zinc-400 text-xs font-medium">
              Интерактивные немецкие субтитры B1–B2
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
            Изучение немецкого по YouTube
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Смотрите видео от лучших немецких каналов, кликайте на любое незнакомое слово в субтитрах для моментального перевода и сохраняйте слова в личные флешкарты.
          </p>
        </div>

        {/* Dictionary Button */}
        <button
          onClick={handleOpenDictionary}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold text-sm transition-all hover:border-zinc-500 shadow-lg cursor-pointer"
        >
          <BookMarked className="w-4 h-4 text-[#E50914]" />
          <span>Мой словарь</span>
        </button>
      </div>

      {/* URL Input Box */}
      <div className="max-w-3xl mx-auto mb-14">
        <form
          onSubmit={handleWatchSubmit}
          className="relative bg-zinc-900/90 border border-zinc-700/80 rounded-2xl p-2 md:p-2.5 shadow-2xl flex flex-col sm:flex-row items-center gap-2 focus-within:border-[#E50914] transition-all"
        >
          <div className="flex items-center gap-3 w-full pl-3 pr-2 py-1">
            <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="Вставьте ссылку на YouTube (или ID видео)..."
              className="w-full bg-transparent outline-none text-white placeholder:text-zinc-500 text-sm md:text-base"
            />
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

      {/* Recommended Channels Filter Tabs */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Рекомендуемые каналы (B1–B2)
          </h2>
          <p className="text-zinc-400 text-xs md:text-sm">
            Оригинальные немецкие материалы с проверенными субтитрами
          </p>
        </div>

        {/* Channel Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {channels.map((ch) => (
            <button
              key={ch}
              onClick={() => setSelectedChannel(ch)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedChannel === ch
                  ? "bg-white text-black font-bold shadow-md"
                  : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {ch === "all" ? "Все каналы" : ch}
            </button>
          ))}
        </div>
      </div>

      {/* Netflix-style Video Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6">
        {filteredVideos.map((video) => (
          <div
            key={video.id}
            onClick={() => setActiveVideo({ id: video.id, title: video.title, channel: video.channel })}
            className="group relative bg-[#181818] rounded-xl overflow-hidden border border-zinc-800/80 hover:border-zinc-600 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-20 flex flex-col cursor-pointer"
          >
            {/* Thumbnail Box */}
            <div className="relative w-full aspect-video bg-zinc-900 overflow-hidden">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              {/* Difficulty Level Badge */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded shadow-md tracking-wider ${
                    video.level === "B1"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 text-white"
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

              {/* Play Hover Icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
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

              <p className="text-zinc-400 text-xs line-clamp-2 mt-2 leading-relaxed">
                {video.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Interactive Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl flex justify-end mb-2">
            <button
              onClick={() => setActiveVideo(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors cursor-pointer"
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

      {/* My Dictionary / Saved Words Modal */}
      {showDictionaryModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <BookMarked className="w-5 h-5 text-[#E50914]" />
                <h3 className="text-lg font-bold text-white">
                  Мой немецкий словарь ({savedWords.length})
                </h3>
              </div>
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {isLoadingWords ? (
                <div className="py-12 text-center text-zinc-500">Загружаем слова...</div>
              ) : savedWords.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 flex flex-col items-center gap-2">
                  <Languages className="w-10 h-10 text-zinc-700" />
                  <p className="text-base text-zinc-400">У вас пока нет сохраненных слов.</p>
                  <p className="text-xs text-zinc-500">
                    Смотрите видео, кликайте по незнакомым словам в субтитрах и нажимайте «Добавить во флешкарты»!
                  </p>
                </div>
              ) : (
                savedWords.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-start justify-between gap-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white">{item.word}</span>
                        <button
                          onClick={() => handleSpeak(item.word)}
                          title="Озвучить"
                          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-zinc-300 mb-2">
                        {item.translation}
                      </p>
                      {item.context_sentence && (
                        <p className="text-xs text-zinc-400 italic bg-black/40 p-2 rounded-lg border border-zinc-800/80">
                          &ldquo;{item.context_sentence}&rdquo;
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteWord(item.word)}
                      title="Удалить из словаря"
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
