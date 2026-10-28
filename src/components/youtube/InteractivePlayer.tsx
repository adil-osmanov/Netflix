"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { TranscriptItem, TranslationData } from "@/types/youtube";
import { 
  useYouTube, 
  SubtitleSettings, 
  SUBTITLE_FONT_SIZE_CLASSES, 
  SubtitleFontSize 
} from "@/context/YouTubeContext";
import { saveWordAction } from "@/app/youtube/actions";
import { mergeTranscriptSentences, cleanGermanWord } from "@/lib/subtitleUtils";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  AlertCircle, 
  List, 
  Volume2, 
  Check, 
  Sliders, 
  X,
  Bookmark,
  Gauge,
  Maximize,
  Minimize,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  ExternalLink
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
  onNextVideo?: () => void;
}

export default function InteractivePlayer({
  videoId,
  videoTitle,
  channelTitle,
  onBackToCatalog,
  onNextVideo,
}: InteractivePlayerProps) {
  const { subtitleSettings, updateSubtitleSettings, refreshSavedWords, isFavorite, toggleFavorite } = useYouTube();

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const wasPlayingRef = useRef<boolean>(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const translationCacheRef = useRef<Map<string, TranslationData>>(new Map());
  const activeSideItemRef = useRef<HTMLDivElement>(null);

  // Video Engine Mode: "native" (direct mp4/hls) or "iframe" (YouTube iframe fallback)
  const [engineMode, setEngineMode] = useState<"native" | "iframe">("native");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isCheckingStream, setIsCheckingStream] = useState<boolean>(true);

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

  // Mouse Cursor auto-hide (2 seconds of inactivity when playing)
  const [isCursorIdle, setIsCursorIdle] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isFav = isFavorite(videoId);

  // Settings popover & refs
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Embed error state (YouTube error codes 150/101/2/100)
  const [embedError, setEmbedError] = useState<boolean>(false);

  // Hidden controls bar toggle state
  const [isControlsHidden, setIsControlsHidden] = useState<boolean>(false);

  // Hover & Pinned Word state
  const [hoveredWord, setHoveredWord] = useState<{
    word: string;
    lemma: string;
    article: "der" | "die" | "das" | null;
    wordClean: string;
    pos: "noun" | "verb" | "adj" | "adv" | "other";
    translation: string;
    isLoading: boolean;
  } | null>(null);
  const [hoveredWordIdx, setHoveredWordIdx] = useState<number | null>(null);

  const [pinnedWord, setPinnedWord] = useState<{
    word: string;
    lemma: string;
    article: "der" | "die" | "das" | null;
    wordClean: string;
    pos: "noun" | "verb" | "adj" | "adv" | "other";
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

  // Controls visibility timeout in fullscreen
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

  // Mouse move handler: controls visibility + cursor auto-hide after 2s of idle
  const handleMouseMove = () => {
    setIsCursorIdle(false);
    resetControlsTimeout();

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      if (isPlaying && !hoveredWord && !pinnedWord) {
        setIsCursorIdle(true);
      }
    }, 2000);
  };

  // 0. Body scroll lock when video player is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Close settings popover on click outside
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(e.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSettingsOpen]);

  // 1. Fetch & Merge Subtitles into full sentences
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingTranscript(true);
    setTranscriptError(null);

    async function loadTranscript() {
      try {
        const resp = await fetch(`/api/youtube/transcript?videoId=${videoId}`);
        const data = await resp.json().catch(() => ({}));

        if (isCancelled) return;

        if (resp.ok && Array.isArray(data.transcript) && data.transcript.length > 0) {
          const mergedSentences = mergeTranscriptSentences(data.transcript);
          setTranscript(Array.isArray(mergedSentences) ? mergedSentences : []);
          setTranscriptError(null);
        } else {
          setTranscript([]);
          setTranscriptError(data.error || "Субтитры недоступны для этого видео");
        }
      } catch {
        if (!isCancelled) {
          setTranscript([]);
          setTranscriptError("Субтитры недоступны для этого видео");
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

  // 2. Fetch Native Video Stream or Fallback to IFrame
  useEffect(() => {
    let isCancelled = false;
    setIsCheckingStream(true);
    setStreamUrl(null);

    async function checkStream() {
      try {
        const res = await fetch(`/api/youtube/stream?videoId=${videoId}`);
        if (!res.ok) throw new Error("Stream route error");
        const data = await res.json();

        if (isCancelled) return;

        if (data.success && data.streamUrl) {
          setStreamUrl(data.streamUrl);
          setEngineMode("native");
        } else {
          setEngineMode("iframe");
        }
      } catch {
        if (!isCancelled) {
          setEngineMode("iframe");
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingStream(false);
        }
      }
    }

    checkStream();

    return () => {
      isCancelled = true;
    };
  }, [videoId]);

  // 3. Initialize YouTube IFrame API (used if engineMode === "iframe")
  useEffect(() => {
    if (engineMode !== "iframe") return;

    let timer: NodeJS.Timeout;

    function initPlayer() {
      if (!window.YT || !window.YT.Player) return;

      setEmbedError(false);

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
          cc_load_policy: 0,
          cc_lang_pref: "none",
          iv_load_policy: 3,
          fs: 0,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            try {
              const p = event?.target || playerRef.current;
              if (p) {
                if (typeof p.unloadModule === "function") {
                  p.unloadModule("captions");
                  p.unloadModule("cc");
                }
                if (typeof p.setOption === "function") {
                  p.setOption("captions", "track", {});
                  p.setOption("cc", "track", {});
                  p.setOption("captions", "reload", false);
                }
              }
            } catch {}
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === 1);
            if (event.data === 1) {
              try {
                const p = event?.target || playerRef.current;
                if (p && typeof p.unloadModule === "function") {
                  p.unloadModule("captions");
                  p.unloadModule("cc");
                }
              } catch {}
            }
          },
          onError: (event: any) => {
            if (event.data === 150 || event.data === 101 || event.data === 2 || event.data === 100) {
              setEmbedError(true);
            }
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
  }, [videoId, engineMode]);

  // 4. Safe Fullscreen Change Listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (playerContainerRef.current?.requestFullscreen) {
          await playerContainerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle non-critical handled:", err);
    }
  };

  // Player Controls (Unified Native <video> + IFrame)
  const handleTogglePlay = () => {
    if (engineMode === "native" && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
      return;
    }

    if (playerRef.current) {
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo();
        } else {
          playerRef.current.playVideo();
        }
      } catch {}
    }
  };

  const handleSeekRelative = (seconds: number) => {
    if (engineMode === "native" && videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
      return;
    }

    if (playerRef.current) {
      try {
        const current = playerRef.current.getCurrentTime();
        playerRef.current.seekTo(Math.max(0, current + seconds), true);
      } catch {}
    }
  };

  const handleSeekTo = (seconds: number) => {
    if (engineMode === "native" && videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      return;
    }

    if (playerRef.current) {
      try {
        playerRef.current.seekTo(seconds, true);
        playerRef.current.playVideo();
      } catch {}
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (engineMode === "native" && videoRef.current) {
      videoRef.current.playbackRate = rate;
      return;
    }

    if (playerRef.current) {
      try {
        playerRef.current.setPlaybackRate(rate);
      } catch {}
    }
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
  }, [isPlaying, engineMode]);

  // Safe transcript array guard
  const safeTranscript = Array.isArray(transcript) ? transcript : [];

  // Strict active subtitle calculation: start <= currentTime < start + duration
  const activeSubtitleIndex = safeTranscript.findIndex(
    (item) => item && typeof item.start === "number" && currentTime >= item.start && currentTime < (item.start + (item.duration || 0))
  );
  const activeSubtitle = activeSubtitleIndex !== -1 ? safeTranscript[activeSubtitleIndex] : null;

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
  ): Promise<TranslationData> => {
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
      const result: TranslationData = {
        lemma: data.lemma || word,
        article: data.article || null,
        wordClean: data.wordClean || word,
        pos: data.pos || "other",
        translation: data.translation || "Перевод не найден",
      };
      translationCacheRef.current.set(cacheKey, result);
      return result;
    } catch {
      return {
        lemma: word,
        article: null,
        wordClean: word,
        pos: "other",
        translation: "Ошибка перевода",
      };
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
      if (engineMode === "native" && videoRef.current) {
        videoRef.current.pause();
      } else if (playerRef.current) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
    }
  };

  // Resume playback when cursor leaves the entire subtitle container
  const handleSubtitleContainerMouseLeave = () => {
    if (pinnedWord) return;

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    setHoveredWord(null);
    setHoveredWordIdx(null);

    if (wasPlayingRef.current) {
      wasPlayingRef.current = false;
      if (engineMode === "native" && videoRef.current) {
        videoRef.current.play().catch(() => {});
      } else if (playerRef.current) {
        try {
          playerRef.current.playVideo();
        } catch {}
      }
    }
  };

  // Hover-to-Translate word
  const handleMouseEnterWord = async (rawWord: string, sentence: string, idx: number) => {
    const cleaned = cleanGermanWord(rawWord);
    if (!cleaned || pinnedWord) return;

    setHoveredWordIdx(idx);
    setHoveredWord({
      word: cleaned,
      lemma: cleaned,
      article: null,
      wordClean: cleaned,
      pos: "other",
      translation: "",
      isLoading: true,
    });

    const data = await fetchContextualTranslation(cleaned, sentence);
    setHoveredWord({
      word: cleaned,
      lemma: data.lemma,
      article: data.article,
      wordClean: data.wordClean,
      pos: data.pos,
      translation: data.translation,
      isLoading: false,
    });
  };

  const handleMouseLeaveWord = () => {
    // Left single word
  };

  // Click on word pins the card
  const handleClickWord = async (rawWord: string, sentence: string) => {
    const cleaned = cleanGermanWord(rawWord);
    if (!cleaned) return;

    if (engineMode === "native" && videoRef.current) {
      videoRef.current.pause();
    } else if (playerRef.current) {
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
    setHoveredWordIdx(null);

    const data = await fetchContextualTranslation(cleaned, sentence);

    setPinnedWord({
      word: cleaned,
      lemma: data.lemma,
      article: data.article,
      wordClean: data.wordClean,
      pos: data.pos,
      translation: data.translation,
      context: sentence,
      isSaved: false,
      isSaving: false,
    });
  };

  // Save pinned word to Supabase / LocalStorage
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
        video_title: resolvedVideoTitle || videoTitle || "Немецкое видео",
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
    setHoveredWordIdx(null);
    wasPlayingRef.current = false;
    if (engineMode === "native" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (playerRef.current) {
      try {
        playerRef.current.playVideo();
      } catch {}
    }
  };

  const bgOpacityValue = (subtitleSettings.backdropOpacity / 100).toFixed(2);

  const renderControls = (inFullscreen: boolean) => (
    <div
      className={
        inFullscreen
          ? `absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-40 flex items-center justify-between bg-zinc-950/85 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-zinc-800/80 shadow-2xl text-sm pointer-events-auto transition-all duration-300 ${
              !isControlsVisible || isControlsHidden
                ? "translate-y-20 opacity-0 pointer-events-none"
                : "translate-y-0 opacity-100"
            }`
          : `w-full py-2.5 sm:py-3 px-4 mt-2 bg-zinc-950/90 rounded-xl border border-zinc-800/60 flex items-center justify-between transition-all duration-300 pointer-events-auto ${
              isControlsHidden
                ? "h-0 py-0 opacity-0 overflow-hidden pointer-events-none mt-0 border-0"
                : "opacity-100"
            }`
      }
    >
      {/* Play & Seek -10s / +10s */}
      <div className="flex items-center gap-2 sm:gap-3">
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
          onClick={() => handleSeekRelative(-10)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-300 hover:text-white rounded-lg transition-colors bg-zinc-800/60 hover:bg-zinc-800 cursor-pointer"
          title="Назад на 10 секунд"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono font-bold">-10s</span>
        </button>

        <button
          onClick={() => handleSeekRelative(10)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-300 hover:text-white rounded-lg transition-colors bg-zinc-800/60 hover:bg-zinc-800 cursor-pointer"
          title="Вперед на 10 секунд"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono font-bold">+10s</span>
        </button>
      </div>

      {/* Speed & Subtitle Settings & Favorite & Fullscreen & Hide Button */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Speed Selector */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-xs text-zinc-400 bg-zinc-900/80 p-0.5 sm:p-1 rounded-xl border border-zinc-800/80">
          <Gauge className="w-3.5 h-3.5 text-zinc-500 ml-1 hidden md:inline" />
          {[0.75, 1, 1.25].map((rate) => (
            <button
              key={rate}
              onClick={() => handleSpeedChange(rate)}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                playbackRate === rate
                  ? "bg-[#E50914] text-white shadow"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Subtitle Settings Trigger & Anchored Popover */}
        <div className="relative">
          <button
            ref={settingsButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setIsSettingsOpen((prev) => !prev);
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
              isSettingsOpen
                ? "bg-zinc-800 text-white border-zinc-600 shadow"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700/80"
            }`}
            title="Параметры субтитров"
          >
            <Sliders className="w-3.5 h-3.5 text-[#E50914]" />
            <span className="hidden sm:inline">Субтитры</span>
          </button>

          {isSettingsOpen && (
            <div
              ref={settingsRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-full mb-3 right-0 z-50 w-72 sm:w-80 p-4 sm:p-5 rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl pointer-events-auto flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
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
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Низко", val: "bottom-4" },
                    { label: "Стандарт", val: "bottom-8" },
                    { label: "Выше", val: "bottom-14" },
                    { label: "Высоко", val: "bottom-20" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() =>
                        updateSubtitleSettings({
                          bottomOffset: item.val as SubtitleSettings["bottomOffset"],
                        })
                      }
                      className={`py-1.5 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
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
                      className={`py-1.5 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
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

        {/* Favorite Bookmark Button */}
        <button
          onClick={() =>
            toggleFavorite({
              id: videoId,
              title: resolvedVideoTitle || videoTitle || "YouTube Video",
              channel: resolvedChannelTitle || channelTitle || "YouTube",
              thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              level: "B1",
            })
          }
          className="p-1.5 sm:p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors cursor-pointer"
          title={isFav ? "Удалить из избранного" : "Сохранить в избранное"}
        >
          <Bookmark
            size={16}
            className={isFav ? "fill-[#E50914] text-[#E50914]" : "text-zinc-400 hover:text-white"}
          />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 sm:p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors cursor-pointer"
          title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Hide Controls Button */}
        <button
          onClick={() => setIsControlsHidden(true)}
          className="p-1.5 sm:p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors cursor-pointer"
          title="Скрыть панель управления"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full ${
        isCursorIdle ? "cursor-none" : "cursor-default"
      } ${
        isFullscreen
          ? "fixed inset-0 z-[1000] bg-black p-0 flex flex-col justify-center select-none"
          : "flex flex-col lg:flex-row h-full gap-4 max-w-[1920px] w-full mx-auto overflow-hidden p-2 sm:p-4"
      }`}
    >
      {/* LEFT / CENTER: Video Player Column + Controls strictly in flow below */}
      <div className={`${isFullscreen ? "w-full h-full" : "flex-1 flex flex-col justify-between h-full min-w-0"} relative`}>
        {/* Video Box */}
        <div
          className={`relative w-full ${
            isFullscreen
              ? "h-full flex-1 bg-black overflow-hidden"
              : "aspect-video rounded-2xl bg-black overflow-hidden shadow-2xl border border-zinc-800/80"
          } group`}
        >
          {/* Top Header Row: Back Button + Video Title side-by-side */}
          <div className="absolute top-4 left-4 z-40 flex items-center gap-3 max-w-[70%] pointer-events-auto">
            {onBackToCatalog && (
              <button
                onClick={onBackToCatalog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white backdrop-blur-md transition shadow-lg shrink-0 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span className="text-xs font-medium">Назад</span>
              </button>
            )}
            <span className="text-xs font-medium text-zinc-300/90 truncate drop-shadow-md">
              {resolvedVideoTitle || videoTitle}
            </span>
          </div>

          {/* DUAL ENGINE: 1) Native HTML5 Video (zero YouTube chrome) or 2) YouTube IFrame fallback */}
          {engineMode === "native" && streamUrl ? (
            <video
              ref={videoRef}
              src={streamUrl}
              autoPlay
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                if (onNextVideo) onNextVideo();
              }}
              onError={() => {
                // If native stream fails to load/play, fallback cleanly to IFrame
                setEngineMode("iframe");
              }}
              onClick={handleTogglePlay}
              onDoubleClick={toggleFullscreen}
              className="w-full h-full object-contain cursor-pointer select-none"
            />
          ) : (
            <>
              {/* YouTube IFrame Container - 100% original size (1:1, NO zoom, NO scale) */}
              <div
                id={`yt-player-${videoId}`}
                className="w-full h-full block pointer-events-none select-none"
              />

              {/* Transparent Interactive Shield: intercepts clicks to toggle play/pause & double-click for fullscreen */}
              <div
                onClick={handleTogglePlay}
                onDoubleClick={toggleFullscreen}
                className="absolute inset-0 z-10 cursor-pointer bg-transparent"
              />
            </>
          )}

          {/* Embed Error Overlay (Codes 150 / 101 / 2 / 100) */}
          {embedError && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/95 backdrop-blur-md rounded-2xl pointer-events-auto animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-full bg-red-950/50 border border-red-500/40 flex items-center justify-center mb-3 shadow-lg shadow-red-950/40">
                <AlertCircle className="w-7 h-7 text-[#E50914]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                Воспроизведение ограничено правообладателем
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-md mb-5 leading-relaxed">
                Правообладатель ограничил просмотр этого видео внутри сторонних сайтов. Попробуйте следующее видео или откройте его напрямую на YouTube.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {(onNextVideo || onBackToCatalog) && (
                  <button
                    onClick={onNextVideo || onBackToCatalog}
                    className="px-5 py-2.5 rounded-full bg-[#E50914] hover:bg-[#b80710] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-red-950/40"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Включить следующее видео</span>
                  </button>
                )}
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 border border-zinc-700 transition"
                >
                  <span>Смотреть на YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>
              </div>
            </div>
          )}

          {/* OVERLAY SUBTITLES INSIDE VIDEO CONTAINER - max 1 sentence (2 lines) */}
          <div
            onMouseEnter={handleSubtitleContainerMouseEnter}
            onMouseLeave={handleSubtitleContainerMouseLeave}
            className={`absolute ${subtitleSettings.bottomOffset} left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-3xl text-center pointer-events-auto transition-all duration-150`}
          >
            {/* Masking Plate for Hardsubs */}
            <div
              className="max-w-3xl w-auto mx-auto px-6 py-3 rounded-xl bg-black/90 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-150"
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
                <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs sm:text-sm py-1">
                  <span>Субтитры недоступны для этого видео</span>
                </div>
              ) : activeSubtitle && typeof activeSubtitle.text === "string" ? (
                <div
                  className={`line-clamp-2 text-center leading-snug flex flex-wrap justify-center items-center gap-x-2 gap-y-1 font-sans font-semibold text-white tracking-normal drop-shadow-md ${
                    SUBTITLE_FONT_SIZE_CLASSES[subtitleSettings.fontSize as SubtitleFontSize] || SUBTITLE_FONT_SIZE_CLASSES.md
                  }`}
                >
                  {activeSubtitle.text.split(/\s+/).filter(Boolean).map((word, idx) => (
                    <span
                      key={idx}
                      className="relative inline-block"
                    >
                      <span
                        onMouseEnter={() => handleMouseEnterWord(word, activeSubtitle.text, idx)}
                        onMouseLeave={handleMouseLeaveWord}
                        onClick={() => handleClickWord(word, activeSubtitle.text)}
                        className="cursor-pointer hover:bg-white/20 hover:text-red-400 rounded px-1.5 py-0.5 transition-colors duration-100 inline-block active:scale-95 select-none"
                      >
                        {word}
                      </span>

                      {/* Adaptive Tooltip directly 8px above this hovered word */}
                      {hoveredWord && hoveredWordIdx === idx && !pinnedWord && (
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-auto w-max max-w-xs bg-[#181818]/95 backdrop-blur-md border border-zinc-700/80 rounded-xl px-3.5 py-2 shadow-2xl flex flex-col gap-1 text-left animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClickWord(word, activeSubtitle.text);
                          }}
                        >
                          <div className="flex items-center gap-1.5 text-xs">
                            {hoveredWord.article && (
                              <span
                                className={`font-bold lowercase ${
                                  hoveredWord.article === "der"
                                    ? "text-blue-400"
                                    : hoveredWord.article === "die"
                                    ? "text-red-500"
                                    : "text-emerald-400"
                                }`}
                              >
                                {hoveredWord.article}
                              </span>
                            )}
                            <span
                              className={
                                hoveredWord.article
                                  ? "text-white font-medium"
                                  : "text-zinc-400 font-medium"
                              }
                            >
                              {hoveredWord.wordClean || hoveredWord.lemma}
                            </span>
                          </div>

                          {hoveredWord.isLoading ? (
                            <div className="flex items-center gap-1 text-zinc-400 text-xs py-0.5">
                              <Loader2 className="w-3 h-3 animate-spin text-[#E50914]" />
                              <span>Переводим...</span>
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm font-bold text-white capitalize">
                              {hoveredWord.translation}
                            </span>
                          )}
                        </div>
                      )}
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

          {/* PINNED WORD CARD */}
          {pinnedWord && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-[#181818] border border-zinc-700 rounded-2xl p-4 sm:p-5 shadow-2xl max-w-md w-[92%] sm:w-auto flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs mb-0.5 font-mono">
                    {pinnedWord.article && (
                      <span
                        className={`font-bold lowercase ${
                          pinnedWord.article === "der"
                            ? "text-blue-400"
                            : pinnedWord.article === "die"
                            ? "text-red-500"
                            : "text-emerald-400"
                        }`}
                      >
                        {pinnedWord.article}
                      </span>
                    )}
                    <span
                      className={
                        pinnedWord.article
                          ? "text-white font-medium"
                          : "text-zinc-400 font-medium"
                      }
                    >
                      {pinnedWord.wordClean || pinnedWord.lemma}
                    </span>
                  </div>
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

          {/* Fullscreen Controls Bar (Rendered inside video container when fullscreen) */}
          {isFullscreen && renderControls(true)}

          {/* Floating Unhide Controls Button when hidden */}
          {isControlsHidden && (
            <button
              onClick={() => setIsControlsHidden(false)}
              className="absolute bottom-3 right-3 z-40 p-2 sm:p-2.5 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-white/10 backdrop-blur-md shadow-2xl transition-all duration-200 cursor-pointer animate-in fade-in"
              title="Показать панель управления"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Non-Fullscreen Controls Bar: Strictly in document flow BELOW the video */}
        {!isFullscreen && renderControls(false)}
      </div>

      {/* RIGHT: Vertical Transcript Dialogue List (Automatically hidden in Fullscreen) */}
      {!isFullscreen && (
        <div className="w-80 lg:w-[420px] flex-shrink-0 h-full bg-zinc-950/80 rounded-2xl border border-zinc-800/80 flex flex-col overflow-hidden p-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <List className="w-4 h-4 text-[#E50914]" />
              <span>Субтитры диалога</span>
            </div>
            <span className="text-zinc-500 text-xs">
              {safeTranscript.length > 0 ? `${safeTranscript.length} предложений` : ""}
            </span>
          </div>

          {isLoadingTranscript ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              Загрузка предложений...
            </div>
          ) : safeTranscript.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs text-center px-4">
              Субтитры недоступны для этого видео
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {safeTranscript.map((item, index) => {
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
  );
}
