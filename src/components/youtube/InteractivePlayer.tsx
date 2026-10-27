"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { TranscriptItem } from "@/types/youtube";
import WordActionCard from "./WordActionCard";
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
  ExternalLink,
  ChevronDown,
  Gauge
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
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Subtitles & Player state
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState<boolean>(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState<boolean>(false);

  // Word selection state for popup
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string>("");

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

      // Clean up existing player if any
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
          cc_load_policy: 0, // Disable native YouTube CC to use our interactive subtitles!
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            // Player is ready
          },
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
        // Load YouTube Iframe script if not present
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

      // Sync currentTime with 100-150ms interval
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
      }, 120);
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

  // Pause / Play controls
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

  // Find active subtitle item with +0.3s tolerance to eliminate flickering between cuts
  const activeSubtitleIndex = transcript.findIndex(
    (item) => currentTime >= item.start && currentTime <= (item.start + item.duration + 0.3)
  );
  const activeSubtitle = activeSubtitleIndex !== -1 ? transcript[activeSubtitleIndex] : null;

  // Clean word helper
  const cleanWord = (raw: string): string => {
    return raw.replace(/^[\s.,/#!$%"?^&*;:{}=\-_`~()«»„“”'’–—]+|[\s.,/#!$%"?^&*;:{}=\-_`~()«»„“”'’–—]+$/g, "");
  };

  // Click on word handler
  const handleWordClick = (rawWord: string, sentence: string) => {
    const cleaned = cleanWord(rawWord);
    if (!cleaned) return;

    // Immediately pause video
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch {}
    }

    setSelectedWord(cleaned);
    setSelectedContext(sentence);
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto px-4 md:px-6 py-4">
      {/* Top Header / Video Meta */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {channelTitle && (
            <span className="text-[#E50914] text-xs font-bold uppercase tracking-wider block mb-1">
              {channelTitle}
            </span>
          )}
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight line-clamp-1">
            {videoTitle || "Немецкое видео с субтитрами"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onBackToCatalog && (
            <button
              onClick={onBackToCatalog}
              className="px-3.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs md:text-sm font-medium transition-colors"
            >
              ← Каталог
            </button>
          )}

          <button
            onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors border ${
              showTranscriptDrawer
                ? "bg-[#E50914] text-white border-transparent"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700"
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Транскрипт</span>
          </button>
        </div>
      </div>

      {/* Main Player & Subtitles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Video Container + Subtitles */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* 16:9 Video Box */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800 group">
            <div id={`yt-player-${videoId}`} className="w-full h-full" />
          </div>

          {/* Quick Player Bar (Speed, Seek, Play) */}
          <div className="flex items-center justify-between bg-zinc-900/80 px-4 py-2.5 rounded-xl border border-zinc-800 text-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                className="w-8 h-8 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all cursor-pointer"
                title={isPlaying ? "Пауза" : "Воспроизвести"}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => handleSeekRelative(-5)}
                className="p-1.5 text-zinc-400 hover:text-white rounded transition-colors"
                title="Назад на 5 секунд"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSeekRelative(5)}
                className="p-1.5 text-zinc-400 hover:text-white rounded transition-colors"
                title="Вперед на 5 секунд"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Gauge className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Скорость:</span>
              {[0.75, 1, 1.25].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    playbackRate === rate
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Subtitles Box */}
          <div className="relative min-h-[140px] md:min-h-[160px] bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 border border-zinc-800/90 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col justify-center items-center text-center">
            {/* Top Indicator */}
            <div className="absolute top-3 left-4 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
              <Subtitles className="w-3.5 h-3.5 text-[#E50914]" />
              <span>Интерактивные субтитры (нажмите на слово для перевода)</span>
            </div>

            {/* Content states */}
            {isLoadingTranscript ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-zinc-400 text-sm">Загружаем немецкие субтитры...</span>
              </div>
            ) : transcriptError ? (
              <div className="flex items-center gap-3 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl max-w-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs md:text-sm text-left">{transcriptError}</p>
              </div>
            ) : activeSubtitle ? (
              <div className="mt-4 flex flex-wrap justify-center items-center gap-x-2 gap-y-1.5 text-xl sm:text-2xl md:text-3xl font-bold tracking-wide text-white">
                {activeSubtitle.text.split(/\s+/).map((word, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleWordClick(word, activeSubtitle.text)}
                    className="cursor-pointer hover:bg-white/20 hover:text-red-400 rounded-md px-1.5 py-0.5 transition-colors duration-150 inline-block active:scale-95 select-none"
                    title="Нажмите, чтобы перевести"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-base md:text-lg italic mt-4">
                ... (пауза в речи) ...
              </p>
            )}
          </div>
        </div>

        {/* Right Col: Full Transcript List */}
        <div
          className={`${
            showTranscriptDrawer ? "block" : "hidden lg:block"
          } bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col h-[520px]`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <List className="w-4 h-4 text-[#E50914]" />
              <span>Полный текст</span>
            </div>
            <span className="text-zinc-400 text-xs">
              {transcript.length > 0 ? `${transcript.length} фраз` : ""}
            </span>
          </div>

          {isLoadingTranscript ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Загрузка...
            </div>
          ) : transcript.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm text-center px-4">
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
                    onClick={() => handleSeekTo(item.start)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all border text-left ${
                      isActive
                        ? "bg-red-950/40 border-[#E50914]/50 text-white shadow-sm"
                        : "bg-zinc-950/40 border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isActive
                            ? "bg-[#E50914] text-white font-bold"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {timeStr}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm leading-snug">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Word Action Popover / Drawer */}
      {selectedWord && (
        <WordActionCard
          word={selectedWord}
          contextSentence={selectedContext}
          videoId={videoId}
          onClose={() => setSelectedWord(null)}
          onContinue={() => {
            if (playerRef.current) {
              try {
                playerRef.current.playVideo();
              } catch {}
            }
          }}
        />
      )}
    </div>
  );
}
