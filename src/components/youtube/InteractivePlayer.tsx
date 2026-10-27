"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { TranscriptItem } from "@/types/youtube";
import { useYouTube, SubtitleSettings } from "@/context/YouTubeContext";
import { saveWordAction } from "@/app/youtube/actions";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Subtitles, 
  AlertCircle, 
  List, 
  Volume2, 
  Check, 
  Sliders, 
  X,
  Bookmark,
  Sparkles,
  Gauge,
  Layers,
  ChevronRight,
  Loader2
} from "lucide-react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface InteractivePlayerProps {
  videoId: string;
  videoTitle?: string;
  channelTitle?: string;
  onBackToCatalog?: () => void;
}

export default function InteractivePlayer({
  videoId,
  videoTitle,
  channelTitle,
  onBackToCatalog,
}: InteractivePlayerProps) {
  const { subtitleSettings, updateSubtitleSettings, refreshSavedWords } = useYouTube();

  const playerRef = useRef<any>(null);
  const wasPlayingRef = useRef<boolean>(false);
  const translationCacheRef = useRef<Map<string, string>>(new Map());

  // Subtitles & Player state
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState<boolean>(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  // UI state
  const [isTranscriptDrawerOpen, setIsTranscriptDrawerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Hover-to-Translate & Pinned Word state
  const [hoveredWord, setHoveredWord] = useState<{
    word: string;
    translation: string;
    isLoading: boolean;
  } | null>(null);

  const [pinnedWord, setPinnedWord] = useState<{
    word: string;
    translation: string;
    context: string;
    isSaved: boolean;
    isSaving: boolean;
  } | null>(null);

  // 1. Fetch Subtitles from our API route
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingTranscript(true);
    setTranscriptError(null);

    async function loadTranscript() {
      try {
        const resp = await fetch(`/api/youtube/transcript?videoId=${videoId}`);
        const data = await resp.json();

        if (isCancelled) return;

        if (resp.ok && data.transcript && data.transcript.length > 0) {
          setTranscript(data.transcript);
        } else {
          setTranscriptError(
            data.error || "У этого видео нет доступных немецких субтитров."
          );
        }
      } catch (err: any) {
        if (!isCancelled) {
          setTranscriptError("Ошибка загрузки субтитров. Проверьте соединение с интернетом.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingTranscript(false);
        }
      }
    }

    if (videoId) {
      loadTranscript();
    }

    return () => {
      isCancelled = true;
    };
  }, [videoId]);

  // 2. Initialize YouTube IFrame API
  useEffect(() => {
    let timer: NodeJS.Timeout;

    function initPlayer() {
      if (!window.YT || !window.YT.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
      }

      playerRef.current = new window.YT.Player(`yt-player-${videoId}`, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          cc_load_policy: 0, // Disable native YouTube CC so our custom overlay is used
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {},
          onStateChange: (event: any) => {
            // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
            setIsPlaying(event.data === 1);
          },
        },
      });
    }

    if (typeof window !== "undefined") {
      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        if (!document.getElementById("yt-iframe-script")) {
          const tag = document.createElement("script");
          tag.id = "yt-iframe-script";
          tag.src = "https://www.youtube.com/iframe_api";
          const firstScriptTag = document.getElementsByTagName("script")[0];
          firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        }

        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevReady) prevReady();
          initPlayer();
        };
      }

      // Sync currentTime every 100ms
      timer = setInterval(() => {
        if (
          playerRef.current &&
          typeof playerRef.current.getCurrentTime === "function"
        ) {
          try {
            const time = playerRef.current.getCurrentTime();
            setCurrentTime(time);
          } catch {}
        }
      }, 100);
    }

    return () => {
      clearInterval(timer);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, [videoId]);

  // Player Controls
  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch {}
  };

  const handleSeekRelative = (seconds: number) => {
    if (!playerRef.current) return;
    try {
      const current = playerRef.current.getCurrentTime();
      playerRef.current.seekTo(Math.max(0, current + seconds), true);
    } catch {}
  };

  const handleSeekTo = (seconds: number) => {
    if (!playerRef.current) return;
    try {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    } catch {}
  };

  const handleSpeedChange = (rate: number) => {
    if (!playerRef.current) return;
    try {
      playerRef.current.setPlaybackRate(rate);
      setPlaybackRate(rate);
    } catch {}
  };

  // Find active subtitle item with +0.3s tolerance to eliminate flickering
  const activeSubtitleIndex = transcript.findIndex(
    (item) => currentTime >= item.start && currentTime <= item.start + item.duration + 0.3
  );
  const activeSubtitle = activeSubtitleIndex !== -1 ? transcript[activeSubtitleIndex] : null;

  // Clean word helper
  const cleanWord = (raw: string): string => {
    return raw.replace(/^[\s.,/#!$%"?^&*;:{}=\-_`~()«»„“”'’–—]+|[\s.,/#!$%"?^&*;:{}=\-_`~()«»„“”'’–—]+$/g, "");
  };

  // Translate word helper with caching
  const translateWord = async (word: string): Promise<string> => {
    if (translationCacheRef.current.has(word.toLowerCase())) {
      return translationCacheRef.current.get(word.toLowerCase())!;
    }
    try {
      const resp = await fetch(`/api/translate?text=${encodeURIComponent(word)}&from=de&to=ru`);
      const data = await resp.json();
      const translation = data.translation || "Перевод не найден";
      translationCacheRef.current.set(word.toLowerCase(), translation);
      return translation;
    } catch {
      return "Ошибка перевода";
    }
  };

  // Hover-to-Translate & Auto-Pause/Resume Logic
  const handleMouseEnterWord = async (rawWord: string) => {
    const cleaned = cleanWord(rawWord);
    if (!cleaned) return;

    // If pinned word is open, don't override with hover
    if (pinnedWord) return;

    // Auto-pause if playing
    if (isPlaying) {
      wasPlayingRef.current = true;
      if (playerRef.current) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
    }

    setHoveredWord({ word: cleaned, translation: "", isLoading: true });
    const trans = await translateWord(cleaned);
    setHoveredWord({ word: cleaned, translation: trans, isLoading: false });
  };

  const handleMouseLeaveWord = () => {
    if (pinnedWord) return;

    setHoveredWord(null);

    // Auto-resume if it was playing before hover
    if (wasPlayingRef.current) {
      wasPlayingRef.current = false;
      if (playerRef.current) {
        try {
          playerRef.current.playVideo();
        } catch {}
      }
    }
  };

  const handleClickWord = async (rawWord: string, sentence: string) => {
    const cleaned = cleanWord(rawWord);
    if (!cleaned) return;

    // Freeze playback
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch {}
    }
    wasPlayingRef.current = false;

    // Clear hover tooltip and pin the word
    setHoveredWord(null);
    const trans = await translateWord(cleaned);

    setPinnedWord({
      word: cleaned,
      translation: trans,
      context: sentence,
      isSaved: false,
      isSaving: false,
    });
  };

  // Save pinned word to Supabase
  const handleSavePinnedWord = async () => {
    if (!pinnedWord || pinnedWord.isSaving || pinnedWord.isSaved) return;

    setPinnedWord((prev) => (prev ? { ...prev, isSaving: true } : null));

    try {
      const res = await saveWordAction({
        word: pinnedWord.word,
        translation: pinnedWord.translation,
        context_sentence: pinnedWord.context,
        source: "youtube",
        video_id: videoId,
      });

      if (res.success) {
        setPinnedWord((prev) => (prev ? { ...prev, isSaved: true, isSaving: false } : null));
        refreshSavedWords();
      } else {
        alert(res.error || "Не удалось сохранить слово");
        setPinnedWord((prev) => (prev ? { ...prev, isSaving: false } : null));
      }
    } catch (e: any) {
      alert("Ошибка сохранения: " + e.message);
      setPinnedWord((prev) => (prev ? { ...prev, isSaving: false } : null));
    }
  };

  // Web Speech API German pronunciation
  const handleSpeak = (word: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "de-DE";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const handleResumePlayback = () => {
    setPinnedWord(null);
    setHoveredWord(null);
    wasPlayingRef.current = false;
    if (playerRef.current) {
      try {
        playerRef.current.playVideo();
      } catch {}
    }
  };

  // Background opacity calculation (0 to 1)
  const bgOpacityValue = (subtitleSettings.backdropOpacity / 100).toFixed(2);

  return (
    <div className="relative w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Top Header / Video Meta */}
      <div className="flex items-center justify-between">
        <div>
          {channelTitle && (
            <span className="text-[#E50914] text-xs font-bold uppercase tracking-wider block mb-0.5">
              {channelTitle}
            </span>
          )}
          <h1 className="text-lg md:text-2xl font-extrabold text-white tracking-tight line-clamp-1">
            {videoTitle || "Немецкое видео с субтитрами"}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onBackToCatalog && (
            <button
              onClick={onBackToCatalog}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs md:text-sm font-medium transition-colors"
            >
              ← Каталог
            </button>
          )}

          {/* Toggle Transcript Drawer Button */}
          <button
            onClick={() => setIsTranscriptDrawerOpen(!isTranscriptDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all border ${
              isTranscriptDrawerOpen
                ? "bg-[#E50914] text-white border-transparent shadow-lg shadow-red-900/30"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800"
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Показать стенограмму</span>
          </button>
        </div>
      </div>

      {/* Central Video Player Box with Subtitle Overlay */}
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 group">
        {/* YouTube IFrame Container */}
        <div id={`yt-player-${videoId}`} className="w-full h-full" />

        {/* SUBTITLE OVERLAY INSIDE THE VIDEO CONTAINER */}
        <div
          className={`absolute ${subtitleSettings.bottomOffset} left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-4xl text-center pointer-events-auto transition-all duration-200`}
        >
          {/* Backdrop mask plate to cover baked-in subtitles (hardsubs) */}
          <div
            className="inline-block mx-auto rounded-xl px-5 sm:px-7 py-2.5 sm:py-3.5 shadow-2xl border border-white/10 transition-all duration-200"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${bgOpacityValue})`,
              backdropFilter: subtitleSettings.backdropOpacity > 20 ? "blur(4px)" : "none",
            }}
          >
            {isLoadingTranscript ? (
              <div className="flex items-center justify-center gap-2 py-1 text-zinc-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[#E50914]" />
                <span>Загрузка субтитров...</span>
              </div>
            ) : transcriptError ? (
              <div className="flex items-center gap-2 text-amber-400 text-xs sm:text-sm py-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{transcriptError}</span>
              </div>
            ) : activeSubtitle ? (
              <div
                className={`flex flex-wrap justify-center items-center gap-x-2 gap-y-1.5 font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${subtitleSettings.fontSize}`}
              >
                {activeSubtitle.text.split(/\s+/).map((word, idx) => (
                  <span
                    key={idx}
                    onMouseEnter={() => handleMouseEnterWord(word)}
                    onMouseLeave={handleMouseLeaveWord}
                    onClick={() => handleClickWord(word, activeSubtitle.text)}
                    className="cursor-pointer hover:bg-white/20 hover:text-red-400 rounded px-1.5 py-0.5 transition-colors duration-150 inline-block active:scale-95 select-none"
                    title="Наведите для перевода или кликните для сохранения"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm sm:text-base italic py-1">
                ... (пауза в речи) ...
              </p>
            )}
          </div>
        </div>

        {/* HOVER TOOLTIP (TRANSLATION OVERLAY) */}
        {hoveredWord && !pinnedWord && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-[#181818]/95 backdrop-blur-md border border-zinc-700/80 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                {hoveredWord.word}
              </span>
              {hoveredWord.isLoading ? (
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs py-0.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E50914]" />
                  <span>Переводим...</span>
                </div>
              ) : (
                <span className="text-sm sm:text-base font-bold text-white capitalize">
                  {hoveredWord.translation}
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
              Клик для фиксации
            </span>
          </div>
        )}

        {/* PINNED WORD CARD (CLICK-TO-PIN) */}
        {pinnedWord && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 bg-[#181818] border border-zinc-700 rounded-2xl p-4 sm:p-5 shadow-2xl max-w-md w-[92%] sm:w-auto flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold block">
                  Немецкое слово
                </span>
                <h4 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                  {pinnedWord.word}
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSpeak(pinnedWord.word)}
                  title="Озвучить"
                  className="p-2 rounded-full bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResumePlayback}
                  title="Закрыть и продолжить просмотр"
                  className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Translation Box */}
            <div className="bg-zinc-900/90 rounded-xl px-4 py-2.5 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-0.5 font-semibold">
                Перевод на русский
              </span>
              <p className="text-base sm:text-lg font-bold text-white capitalize">
                {pinnedWord.translation}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSavePinnedWord}
                disabled={pinnedWord.isSaving || pinnedWord.isSaved}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  pinnedWord.isSaved
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
                    : pinnedWord.isSaving
                    ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : "bg-[#E50914] hover:bg-[#b80710] text-white shadow-lg shadow-red-900/30 active:scale-95"
                }`}
              >
                {pinnedWord.isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Сохранение...</span>
                  </>
                ) : pinnedWord.isSaved ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Сохранено во флешкарты</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Добавить во флешкарты</span>
                  </>
                )}
              </button>

              <button
                onClick={handleResumePlayback}
                className="py-2.5 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Продолжить</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modern Player Bar (Speed, Seeks, Subtitle Settings) */}
      <div className="flex items-center justify-between bg-zinc-900/80 px-4 py-3 rounded-2xl border border-zinc-800 text-sm">
        {/* Play & Seek */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePlay}
            className="w-9 h-9 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all cursor-pointer shadow-md"
            title={isPlaying ? "Пауза" : "Воспроизвести"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => handleSeekRelative(-5)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors bg-zinc-800/40 hover:bg-zinc-800"
            title="Назад на 5 секунд"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleSeekRelative(5)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors bg-zinc-800/40 hover:bg-zinc-800"
            title="Вперед на 5 секунд"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector & Subtitle Settings */}
        <div className="flex items-center gap-3">
          {/* Speed Pills */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800/80">
            <Gauge className="w-3.5 h-3.5 text-zinc-500 ml-1 hidden sm:inline" />
            {[0.75, 1, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => handleSpeedChange(rate)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  playbackRate === rate
                    ? "bg-[#E50914] text-white shadow"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Subtitle Settings Button */}
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all border ${
                isSettingsOpen
                  ? "bg-zinc-800 text-white border-zinc-600"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700"
              }`}
              title="Настройки отображения субтитров"
            >
              <Sliders className="w-4 h-4 text-[#E50914]" />
              <span className="hidden sm:inline">Настройки субтитров</span>
            </button>

            {/* Subtitle Settings Popover */}
            {isSettingsOpen && (
              <div className="absolute right-0 bottom-full mb-3 w-80 bg-[#181818] border border-zinc-700/80 rounded-2xl p-5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Sliders className="w-4 h-4 text-[#E50914]" />
                    <span>Параметры субтитров</span>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. Backdrop Opacity (Masking Hardsubs) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-zinc-300 font-semibold">
                    <span>Перекрытие хардсабов</span>
                    <span className="text-[#E50914] font-bold">
                      {subtitleSettings.backdropOpacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={subtitleSettings.backdropOpacity}
                    onChange={(e) =>
                      updateSubtitleSettings({ backdropOpacity: Number(e.target.value) })
                    }
                    className="w-full accent-[#E50914] cursor-pointer"
                  />
                  <span className="text-[10px] text-zinc-500">
                    100% — глухая черная плашка, полностью скрывающая вшитые титры
                  </span>
                </div>

                {/* 2. Bottom Offset Presets */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-zinc-300 font-semibold">Высота расположения</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "Низко", val: "bottom-4" },
                      { label: "Стандарт", val: "bottom-10" },
                      { label: "Выше титров", val: "bottom-20" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() =>
                          updateSubtitleSettings({
                            bottomOffset: item.val as SubtitleSettings["bottomOffset"],
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          subtitleSettings.bottomOffset === item.val
                            ? "bg-white text-black font-extrabold shadow"
                            : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Font Size Presets */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-zinc-300 font-semibold">Размер шрифта</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "Обычный", val: "text-lg" },
                      { label: "Крупный", val: "text-2xl" },
                      { label: "Максимум", val: "text-3xl" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() =>
                          updateSubtitleSettings({
                            fontSize: item.val as SubtitleSettings["fontSize"],
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                          subtitleSettings.fontSize === item.val
                            ? "bg-white text-black font-extrabold shadow"
                            : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Drawer: Full Transcript */}
      {isTranscriptDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-[100] w-full sm:w-[420px] bg-[#181818]/98 backdrop-blur-md border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <List className="w-5 h-5 text-[#E50914]" />
              <span>Стенограмма видео</span>
            </div>
            <button
              onClick={() => setIsTranscriptDrawerOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {isLoadingTranscript ? (
              <div className="py-20 text-center text-zinc-500 text-sm">
                Загрузка стенограммы...
              </div>
            ) : transcript.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 text-sm">
                Субтитры недоступны
              </div>
            ) : (
              transcript.map((item, index) => {
                const isActive = index === activeSubtitleIndex;
                const minutes = Math.floor(item.start / 60);
                const seconds = Math.floor(item.start % 60);
                const timeStr = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

                return (
                  <div
                    key={index}
                    onClick={() => {
                      handleSeekTo(item.start);
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                      isActive
                        ? "bg-red-950/40 border-[#E50914]/60 text-white shadow-md"
                        : "bg-zinc-900/40 border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          isActive
                            ? "bg-[#E50914] text-white"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {timeStr}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm leading-snug">{item.text}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
