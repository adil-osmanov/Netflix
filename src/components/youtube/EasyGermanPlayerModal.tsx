"use client";

import React, { useState, useEffect } from "react";
import { Check, X, Sparkles, AlertCircle } from "lucide-react";
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
  const [isImporting, setIsImporting] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

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

  if (!video) return null;

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

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex justify-center items-start sm:items-center p-4 sm:p-6 md:p-8"
      onClick={onClose}
    >
      {/* Единая карточка модалки (все идет единым потоком сверху вниз, без вложенных скроллов) */}
      <div
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия модалки */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/75 hover:bg-zinc-800 text-zinc-400 hover:text-white transition backdrop-blur-md outline-none focus:outline-none focus:ring-0 active:outline-none cursor-pointer [-webkit-tap-highlight-color:transparent]"
          title="Закрыть (Esc)"
        >
          <X size={16} />
        </button>

        {/* 1. Плеер 16:9 строго сверху */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&rel=0`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* 2. Панель под видео: Уровень, Название и статус */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-b border-zinc-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shrink-0 font-mono">
              {video.level || "B2"}
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100 truncate">
              {video.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => onToggleWatched(video.youtube_id || video.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition outline-none shrink-0 cursor-pointer [-webkit-tap-highlight-color:transparent] ${
              watched
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800"
            }`}
          >
            <Check size={14} strokeWidth={2.5} />
            <span>{watched ? "Выполнено" : "Отметить как выполненное"}</span>
          </button>
        </div>

        {/* 3. Блок интерактива: идет прямо следом, без вложенных скроллов */}
        <div className="p-4 sm:p-6 bg-zinc-950">
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
    </div>
  );
}
export { EasyGermanPlayerModal };
