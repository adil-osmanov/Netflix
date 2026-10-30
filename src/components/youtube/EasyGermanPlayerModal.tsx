"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, Sparkles, AlertCircle, Maximize2, Minimize2 } from "lucide-react";
import { EasyGermanVideo, QuizItem } from "@/types/youtube";
import VideoQuiz from "./VideoQuiz";

interface EasyGermanPlayerModalProps {
  video: EasyGermanVideo | null;
  isWatched?: boolean;
  onClose: () => void;
  onToggleWatched: (id: string) => void;
  onUpdateQuiz?: (videoId: string, quiz: QuizItem[]) => void;
  onSaveQuiz?: (videoId: string, quiz: QuizItem[]) => void;
}

function parseQuizJson(raw: string): QuizItem[] {
  let clean = raw.trim();
  // Очистка от markdown codeblocks ```json ... ```
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON должен содержать массив вопросов [ ... ]");
  }
  if (parsed.length === 0) {
    throw new Error("Массив вопросов не может быть пустым");
  }
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item.question !== "string" || !item.question.trim()) {
      throw new Error(`Вопрос #${i + 1} должен содержать текст 'question'`);
    }
    if (!Array.isArray(item.options) || item.options.length < 2) {
      throw new Error(`Вопрос #${i + 1} должен содержать минимум 2 варианта ответа в 'options'`);
    }
    if (
      typeof item.correct !== "number" ||
      item.correct < 0 ||
      item.correct >= item.options.length
    ) {
      throw new Error(
        `Вопрос #${i + 1} имеет неверный индекс правильного ответа 'correct' (от 0 до ${
          item.options.length - 1
        })`
      );
    }
  }
  return parsed.map((item, idx) => ({
    id: typeof item.id === "number" ? item.id : idx + 1,
    type: item.type === "vocab" || item.type === "context" ? item.type : "cloze",
    question: String(item.question),
    options: item.options.map(String),
    correct: Number(item.correct),
  }));
}

export default function EasyGermanPlayerModal({
  video,
  isWatched,
  onClose,
  onToggleWatched,
  onUpdateQuiz,
  onSaveQuiz,
}: EasyGermanPlayerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isIdle, setIsIdle] = useState(false);

  const modalCardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Разворачиваем карточку модалки на весь экран
      if (modalCardRef.current?.requestFullscreen) {
        modalCardRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      // Корректно выходим из полноэкранного режима
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Автоматическое скрытие курсора мыши при бездействии более 2.5 сек
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleMouseMove = () => {
      setIsIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsIdle(true), 2500);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  // Блокировка фонового скролла сайта при открытом окне
  useEffect(() => {
    if (!video) return;

    setIsImporting(false);
    setJsonInput("");
    setJsonError(null);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [video, onClose]);

  if (!mounted || !video) return null;

  const watched = isWatched !== undefined ? isWatched : Boolean(video.is_watched);
  const saveQuizHandler = onUpdateQuiz || onSaveQuiz;

  const handleSaveJson = () => {
    try {
      setJsonError(null);
      const parsed = parseQuizJson(jsonInput);
      if (saveQuizHandler) {
        saveQuizHandler(video.youtube_id || video.id, parsed);
      }
      setIsImporting(false);
      setJsonInput("");
    } catch (err: any) {
      setJsonError(err?.message || "Ошибка парсинга JSON. Проверьте формат.");
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] overflow-y-auto bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-200 ${
        isIdle ? "cursor-none" : "cursor-default"
      }`}
      onClick={onClose}
    >
      {/* Единая карточка модалки с переключением Fullscreen по double click */}
      <div
        ref={modalCardRef}
        onDoubleClick={toggleFullscreen}
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Плеер 16:9 со скругленными верхними углами */}
        <div
          className="relative aspect-video w-full bg-black rounded-t-2xl overflow-hidden"
        >
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&rel=0`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Блок под видео: кнопка выполнения, кнопка Fullscreen и интерактив */}
        <div onDoubleClick={toggleFullscreen} className="p-4 sm:p-5 bg-zinc-950 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900/80 pb-4">
            <button
              type="button"
              onClick={() => onToggleWatched(video.youtube_id || video.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition outline-none focus:outline-none focus:ring-0 active:outline-none shrink-0 cursor-pointer [-webkit-tap-highlight-color:transparent] ${
                watched
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>{watched ? "Выполнено" : "Отметить как выполненное"}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition outline-none cursor-pointer select-none [-webkit-tap-highlight-color:transparent]"
              title={isFullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>

          {/* Блок интерактива: идет прямо следом, без вложенных скроллов */}
          {isImporting ? (
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Sparkles size={14} className="text-emerald-400" />
                  <span>Вставьте JSON с заданиями (массив QuizItem):</span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">4 вопроса</span>
              </div>

              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  if (jsonError) setJsonError(null);
                }}
                rows={7}
                placeholder={`[\n  {\n    "id": 1,\n    "type": "cloze",\n    "question": "Er hat das Buch [...] den Tisch gelegt.",\n    "options": ["auf", "an", "in"],\n    "correct": 0\n  }\n]`}
                className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 outline-none focus:border-emerald-500/70 transition resize-y"
                autoFocus
              />

              {jsonError && (
                <div className="text-xs text-red-400 flex items-center gap-1.5 bg-red-950/20 border border-red-500/30 p-2.5 rounded-xl">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsImporting(false);
                    setJsonError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveJson}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-lg shadow-emerald-950/50 cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
                >
                  Сохранить
                </button>
              </div>
            </div>
          ) : video.quiz && video.quiz.length > 0 ? (
            <VideoQuiz
              quiz={video.quiz}
              onComplete={() => {
                if (!watched) {
                  onToggleWatched(video.youtube_id || video.id);
                }
              }}
              onEdit={() => {
                setJsonInput(JSON.stringify(video.quiz, null, 2));
                setJsonError(null);
                setIsImporting(true);
              }}
            />
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="text-zinc-500 text-xs">
                К этому видео пока нет заданий
              </div>
              <button
                type="button"
                onClick={() => {
                  setJsonInput("");
                  setJsonError(null);
                  setIsImporting(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 text-xs font-semibold transition cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
              >
                <Sparkles size={14} />
                <span>Импортировать интерактивные задания (JSON)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export { EasyGermanPlayerModal };
