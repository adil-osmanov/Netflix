"use client";

import React, { useState, useEffect } from "react";
import { Volume2, Bookmark, Check, Play, X, Loader2, Sparkles, BookOpen } from "lucide-react";
import { saveWordAction } from "@/app/youtube/actions";

interface WordActionCardProps {
  word: string;
  contextSentence: string;
  videoId: string;
  onClose: () => void;
  onContinue: () => void;
  position?: { x: number; y: number } | null;
}

export default function WordActionCard({
  word,
  contextSentence,
  videoId,
  onClose,
  onContinue,
}: WordActionCardProps) {
  const [translation, setTranslation] = useState<string>("");
  const [isLoadingTranslation, setIsLoadingTranslation] = useState<boolean>(true);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Fetch translation on word change
  useEffect(() => {
    let isMounted = true;
    setIsLoadingTranslation(true);
    setTranslationError(null);
    setIsSaved(false);

    async function fetchTranslation() {
      try {
        const resp = await fetch(`/api/translate?text=${encodeURIComponent(word)}&from=de&to=ru`);
        const data = await resp.json();
        if (isMounted) {
          if (data.translation) {
            setTranslation(data.translation);
          } else {
            setTranslationError(data.error || "Не удалось получить перевод");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setTranslationError("Ошибка сети при переводе");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTranslation(false);
        }
      }
    }

    if (word) {
      fetchTranslation();
    }

    return () => {
      isMounted = false;
    };
  }, [word]);

  // Audio pronunciation using Web Speech API with German voice
  const playPronunciation = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "de-DE";
      utterance.rate = 0.9;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlayingAudio(false);
    }
  };

  // Save to Supabase flashcards
  const handleSaveWord = async () => {
    if (isSaving || isSaved || !translation) return;
    setIsSaving(true);
    try {
      const res = await saveWordAction({
        word,
        translation,
        context_sentence: contextSentence,
        source: "youtube",
        video_id: videoId,
      });

      if (res.success) {
        setIsSaved(true);
      } else {
        alert(res.error || "Не удалось сохранить слово в словарь");
      }
    } catch (e: any) {
      alert("Ошибка сохранения: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Highlight selected word in context sentence
  const renderHighlightedContext = () => {
    if (!contextSentence) return null;
    const parts = contextSentence.split(new RegExp(`(${word})`, "gi"));
    return (
      <p className="text-zinc-300 text-sm leading-relaxed italic bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/80">
        &ldquo;
        {parts.map((part, i) =>
          part.toLowerCase() === word.toLowerCase() ? (
            <span
              key={i}
              className="text-[#E50914] font-semibold underline underline-offset-2 bg-red-500/10 px-1 rounded"
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
        &rdquo;
      </p>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90] transition-opacity"
        onClick={onClose}
      />

      {/* Responsive Container: Bottom Sheet on Mobile, Centered Popover on Desktop */}
      <div className="fixed z-[100] bottom-0 left-0 right-0 md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[460px] md:max-w-[90vw] animate-in fade-in slide-in-from-bottom-6 md:slide-in-from-bottom-3 duration-200">
        <div className="bg-[#181818] text-white border border-zinc-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-[#E50914]" />
              <span>Немецкий словарь</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
            {/* Word & Audio */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Немецкое слово
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  {word}
                </h3>
              </div>

              <button
                onClick={playPronunciation}
                title="Озвучить на немецком"
                className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                  isPlayingAudio
                    ? "bg-[#E50914] text-white border-transparent scale-105"
                    : "bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-700"
                }`}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Translation Box */}
            <div className="bg-zinc-900/90 rounded-xl p-3.5 border border-zinc-800/80">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold block mb-1">
                Перевод на русский
              </span>
              {isLoadingTranslation ? (
                <div className="flex items-center gap-2 text-zinc-400 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E50914]" />
                  <span className="text-sm">Ищем перевод...</span>
                </div>
              ) : translationError ? (
                <p className="text-sm text-red-400">{translationError}</p>
              ) : (
                <p className="text-xl md:text-2xl font-bold text-white capitalize">
                  {translation}
                </p>
              )}
            </div>

            {/* Context in Subtitles */}
            {contextSentence && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Контекст из видео:
                </span>
                {renderHighlightedContext()}
              </div>
            )}
          </div>

          {/* Action Buttons Footer */}
          <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex flex-col sm:flex-row gap-2.5">
            {/* Save to Flashcards Button */}
            <button
              onClick={handleSaveWord}
              disabled={isSaving || isSaved || isLoadingTranslation || !translation}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isSaved
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                  : isSaving
                  ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                  : "bg-[#E50914] hover:bg-[#b80710] text-white shadow-lg shadow-red-900/20 active:scale-[0.98]"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : isSaved ? (
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

            {/* Continue Watching Button */}
            <button
              onClick={() => {
                onContinue();
                onClose();
              }}
              className="py-3 px-5 rounded-lg font-semibold text-sm bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Продолжить просмотр</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
