"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { TranscriptItem } from "@/types/youtube";
import { useYouTube, SubtitleSettings, SUBTITLE_FONT_SIZE_CLASSES, SubtitleFontSize } from "@/context/YouTubeContext";
import { saveWordAction } from "@/app/youtube/actions";
import { mergeTranscriptSentences, cleanGermanWord } from "@/lib/subtitleUtils";
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
  Maximize,
  Minimize,
  Loader2,
  ArrowLeft
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

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const wasPlayingRef = useRef<boolean>(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const translationCacheRef = useRef<Map<string, { lemma: string; translation: string }>>(new Map());
  const activeSideItemRef = useRef<HTMLDivElement>(null);

  // Subtitles & Player state
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState<boolean>(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      setIsControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isFullscreen, resetControlsTimeout]);

  // Settings popover
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Hover & Pinned Word state
  const [hoveredWord, setHoveredWord] = useState<{
    word: string;
    lemma: string;
    translation: string;
    isLoading: boolean;
  } | null>(null);

  const [pinnedWord, setPinnedWord] = useState<{
    word: string;
    lemma: string;
    translation: string;
    context: string;
    isSaved: boolean;
    isSaving: boolean;
  } | null>(null);

  // Automatic channel and video resolution via oEmbed when metadata is missing
  const [resolvedChannelTitle, setResolvedChannelTitle] = useState<string>(
    channelTitle && channelTitle !== "YouTube" ? channelTitle : ""
  );
  const [resolvedVideoTitle, setResolvedVideoTitle] = useState<string>(
    videoTitle && videoTitle !== "Пользовательское видео" ? videoTitle : ""
  );

  useEffect(() => {
    if (channelTitle && channelTitle !== "YouTube") {
      setResolvedChannelTitle(channelTitle);
    }
    if (videoTitle && videoTitle !== "Пользовательское видео") {
      setResolvedVideoTitle(videoTitle);
    }

    if (
      (!channelTitle || channelTitle === "YouTube" || !videoTitle || videoTitle === "Пользовательское видео") &&
      videoId
    ) {
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            if (data.author_name) {
              setResolvedChannelTitle(data.author_name);
            }
            if (data.title && (!videoTitle || videoTitle === "Пользовательское видео")) {
              setResolvedVideoTitle(data.title);
            }
          }
        })
        .catch(() => {});
    }
  }, [videoId, channelTitle, videoTitle]);

  // 1. Fetch & Merge Subtitles into full sentences
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
          // Merge fragmented phrases into natural complete sentences
          const mergedSentences = mergeTranscriptSentences(data.transcript);
          setTranscript(mergedSentences);
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

  // 2. Initialize YouTube IFrame API & 50ms High-Frequency Sync
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
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          cc_load_policy: 0, // Disable native YouTube CC so our custom overlay is used
          iv_load_policy: 3,
          fs: 0,
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

      // High-Frequency 50ms interval to eliminate subtitle desync
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
      }, 50);
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

  // 3. Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!mainContainerRef.current) return;
    if (!document.fullscreenElement) {
      mainContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

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

  // Keyboard shortcuts (Space/K = Play/Pause, F = Fullscreen, Arrows = Seek)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeekRelative(-5);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeekRelative(5);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying]);

  // Strict active subtitle calculation: start <= currentTime < start + duration
  const activeSubtitleIndex = transcript.findIndex(
    (item) => currentTime >= item.start && currentTime < (item.start + item.duration)
  );
  const activeSubtitle = activeSubtitleIndex !== -1 ? transcript[activeSubtitleIndex] : null;

  // Auto-scroll side list to active sentence
  useEffect(() => {
    if (activeSideItemRef.current && !isFullscreen) {
      activeSideItemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeSubtitleIndex, isFullscreen]);

  // Fetch translation & lemma with in-memory caching
  const fetchContextualTranslation = async (
    word: string,
    sentence: string
  ): Promise<{ lemma: string; translation: string }> => {
    const cacheKey = `${word.toLowerCase()}_${sentence.slice(0, 30).toLowerCase()}`;
    if (translationCacheRef.current.has(cacheKey)) {
      return translationCacheRef.current.get(cacheKey)!;
    }

    try {
      const resp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, sentence }),
      });
      const data = await resp.json();
      const result = {
        lemma: data.lemma || word,
        translation: data.translation || "Перевод не найден",
      };
      translationCacheRef.current.set(cacheKey, result);
      return result;
    } catch {
      return { lemma: word, translation: "Ошибка перевода" };
    }
  };

  // Pause video when cursor enters anywhere inside the subtitle container
  const handleSubtitleContainerMouseEnter = () => {
    if (pinnedWord) return;

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    if (isPlaying) {
      wasPlayingRef.current = true;
      if (playerRef.current) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
    }
  };

  // Resume playback when cursor leaves the entire subtitle container (unless a word is pinned)
  const handleSubtitleContainerMouseLeave = () => {
    if (pinnedWord) return;

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    setHoveredWord(null);
    if (wasPlayingRef.current) {
      wasPlayingRef.current = false;
      if (playerRef.current) {
        try {
          playerRef.current.playVideo();
        } catch {}
      }
    }
  };

  // Hover-to-Translate word
  const handleMouseEnterWord = async (rawWord: string, sentence: string) => {
    const cleaned = cleanGermanWord(rawWord);
    if (!cleaned || pinnedWord) return;

    setHoveredWord({ word: cleaned, lemma: cleaned, translation: "", isLoading: true });
    const { lemma, translation } = await fetchContextualTranslation(cleaned, sentence);
    setHoveredWord({ word: cleaned, lemma, translation, isLoading: false });
  };

  const handleMouseLeaveWord = () => {
    // Left word; hover card cleared or updated on next word or container leave
  };

  // Click on word pins the card
  const handleClickWord = async (rawWord: string, sentence: string) => {
    const cleaned = cleanGermanWord(rawWord);
    if (!cleaned) return;

    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch {}
    }
    wasPlayingRef.current = false;

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    setHoveredWord(null);
    const { lemma, translation } = await fetchContextualTranslation(cleaned, sentence);

    setPinnedWord({
      word: cleaned,
      lemma,
      translation,
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
        lemma: pinnedWord.lemma,
        translation: pinnedWord.translation,
        sentence: pinnedWord.context,
        channel_title: resolvedChannelTitle || channelTitle || "Общее",
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

  const bgOpacityValue = (subtitleSettings.backdropOpacity / 100).toFixed(2);

  return (
    <div
      ref={mainContainerRef}
      onMouseMove={resetControlsTimeout}
      className={`relative w-full ${
        isFullscreen
          ? "fixed inset-0 z-[1000] bg-black p-0 flex flex-col justify-center select-none"
          : "max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-2 flex flex-col gap-4"
      }`}
    >
      {/* Top Header / Video Meta (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="flex flex-col gap-3">
          {onBackToCatalog && (
            <div className="flex items-center">
              <button
                onClick={onBackToCatalog}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 backdrop-blur-md transition cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span className="text-xs font-medium">Назад к списку</span>
              </button>
            </div>
          )}

          <div>
            {(resolvedChannelTitle || channelTitle) && (
              <span className="text-[#E50914] text-xs font-bold uppercase tracking-wider block mb-0.5">
                {resolvedChannelTitle || channelTitle}
              </span>
            )}
            <h1 className="text-base md:text-xl font-extrabold text-white tracking-tight line-clamp-1">
              {resolvedVideoTitle || videoTitle || "Немецкое видео с субтитрами"}
            </h1>
          </div>
        </div>
      )}

      {/* Main Screen Layout: Grid on Desktop (Player Left, Dialogue List Right), Fullscreen on Maximize */}
      <div className={`w-full ${isFullscreen ? "h-full" : "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"}`}>
        {/* LEFT / CENTER: Video Player Box + Overlay Subtitles */}
        <div className={`${isFullscreen ? "w-full h-full" : "lg:col-span-2"} flex flex-col gap-3 relative`}>
          {/* 16:9 Video Box (or full-height in fullscreen) */}
          <div
            className={`relative w-full ${
              isFullscreen
                ? "h-full flex-1 bg-black"
                : "aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80"
            } group`}
          >
            {/* YouTube IFrame Container - pointer-events-none prevents YouTube native top/share/watermark overlays */}
            <div id={`yt-player-${videoId}`} className="w-full h-full pointer-events-none select-none" />

            {/* Transparent Interactive Shield: intercepts clicks to toggle play/pause & double-click for fullscreen */}
            <div
              onClick={handleTogglePlay}
              onDoubleClick={toggleFullscreen}
              className="absolute inset-0 z-10 cursor-pointer bg-transparent"
              title={isPlaying ? "Пауза (клик) / На весь экран (двойной клик)" : "Воспроизвести (клик) / На весь экран (двойной клик)"}
            />

            {/* OVERLAY SUBTITLES INSIDE VIDEO CONTAINER - above shield at z-30 */}
            <div
              onMouseEnter={handleSubtitleContainerMouseEnter}
              onMouseLeave={handleSubtitleContainerMouseLeave}
              className={`absolute ${subtitleSettings.bottomOffset} left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-3xl text-center pointer-events-auto transition-all duration-150`}
            >
              {/* Masking Plate for Hardsubs */}
              <div
                className="max-w-3xl w-auto mx-auto px-5 py-2.5 rounded-xl bg-black/90 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-150"
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
                    className={`line-clamp-2 text-center leading-snug flex flex-wrap justify-center items-center gap-x-2 gap-y-1 font-semibold text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                      SUBTITLE_FONT_SIZE_CLASSES[subtitleSettings.fontSize as SubtitleFontSize] || SUBTITLE_FONT_SIZE_CLASSES.md
                    }`}
                  >
                    {activeSubtitle.text.split(/\s+/).map((word, idx) => (
                      <span
                        key={idx}
                        onMouseEnter={() => handleMouseEnterWord(word, activeSubtitle.text)}
                        onMouseLeave={handleMouseLeaveWord}
                        onClick={() => handleClickWord(word, activeSubtitle.text)}
                        className="cursor-pointer hover:bg-white/20 hover:text-red-400 rounded px-1.5 py-0.5 transition-colors duration-100 inline-block active:scale-95 select-none"
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

            {/* HOVER TOOLTIP (COMPACT CARD OVER WORD) */}
            {hoveredWord && !pinnedWord && (
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-[#181818]/95 backdrop-blur-md border border-zinc-700/80 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto">
                <div>
                  {/* Lemma / Initial form */}
                  {hoveredWord.lemma && (
                    <span className="text-[10px] text-red-400 font-mono uppercase tracking-wider block font-semibold">
                      {hoveredWord.lemma}
                    </span>
                  )}
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

            {/* PINNED WORD CARD */}
            {pinnedWord && (
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 bg-[#181818] border border-zinc-700 rounded-2xl p-4 sm:p-5 shadow-2xl max-w-md w-[92%] sm:w-auto flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {pinnedWord.lemma && (
                      <span className="text-[11px] text-red-400 font-mono font-semibold block mb-0.5">
                        {pinnedWord.lemma}
                      </span>
                    )}
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
                    Точный контекстный перевод
                  </span>
                  <p className="text-base sm:text-lg font-bold text-white capitalize">
                    {pinnedWord.translation}
                  </p>
                </div>

                {/* Action Buttons */}
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
                        <span>В словаре</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        <span>Сохранить в словарь</span>
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

          {/* Controls Bar (Speed, Seek, Subtitle Settings, Fullscreen) - COMPLETELY HIDDEN in Fullscreen */}
          {!isFullscreen && (
            <div className="w-full flex items-center justify-between bg-zinc-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-zinc-800 shadow-2xl text-sm">
              {/* Play & Seek */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePlay}
                  className="w-8 h-8 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all cursor-pointer shadow-md"
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
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors bg-zinc-800/40 hover:bg-zinc-800"
                  title="Назад на 5 секунд"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSeekRelative(5)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors bg-zinc-800/40 hover:bg-zinc-800"
                  title="Вперед на 5 секунд"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Speed & Subtitle Settings & Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Speed Pills */}
                <div className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800/80">
                  <Gauge className="w-3.5 h-3.5 text-zinc-500 ml-1 hidden sm:inline" />
                  {[0.75, 1, 1.25].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                        playbackRate === rate
                          ? "bg-[#E50914] text-white shadow"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Subtitle Settings Popover Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                      isSettingsOpen
                        ? "bg-zinc-800 text-white border-zinc-600"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700"
                    }`}
                    title="Настройки отображения субтитров"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#E50914]" />
                    <span className="hidden sm:inline">Субтитры</span>
                  </button>

                  {isSettingsOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-150">
                      <div className="w-80 max-w-full bg-zinc-950/95 border border-zinc-800 rounded-2xl p-5 shadow-2xl z-50 pointer-events-auto flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                          <div className="flex items-center gap-2 text-white font-bold text-sm">
                            <Sliders className="w-4 h-4 text-[#E50914]" />
                            <span>Параметры субтитров</span>
                          </div>
                          <button
                            onClick={() => setIsSettingsOpen(false)}
                            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 1. Backdrop Opacity */}
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
                        </div>

                        {/* 2. Bottom Offset */}
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
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

                        {/* 3. Font Size: sm / md / lg */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-zinc-300 font-semibold">Размер шрифта</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { label: "Обычный", val: "sm" },
                              { label: "Крупный", val: "md" },
                              { label: "Максимум", val: "lg" },
                            ].map((item) => (
                              <button
                                key={item.val}
                                onClick={() =>
                                  updateSubtitleSettings({
                                    fontSize: item.val as SubtitleFontSize,
                                  })
                                }
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                    </div>
                  )}
                </div>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors cursor-pointer"
                  title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Vertical Transcript Dialogue List (Automatically hidden in Fullscreen) */}
        {!isFullscreen && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col h-[460px] sm:h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <List className="w-4 h-4 text-[#E50914]" />
                <span>Субтитры диалога</span>
              </div>
              <span className="text-zinc-500 text-xs">
                {transcript.length > 0 ? `${transcript.length} предложений` : ""}
              </span>
            </div>

            {isLoadingTranscript ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
                Загрузка предложений...
              </div>
            ) : transcript.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs text-center px-4">
                Субтитры недоступны
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {transcript.map((item, index) => {
                  const isActive = index === activeSubtitleIndex;
                  const minutes = Math.floor(item.start / 60);
                  const seconds = Math.floor(item.start % 60);
                  const timeStr = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

                  return (
                    <div
                      key={index}
                      ref={isActive ? activeSideItemRef : null}
                      onClick={() => handleSeekTo(item.start)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                        isActive
                          ? "bg-red-950/40 border-[#E50914]/60 text-white shadow-md scale-[1.01]"
                          : "bg-zinc-950/40 border-zinc-800/60 text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            isActive ? "bg-[#E50914] text-white" : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {timeStr}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
