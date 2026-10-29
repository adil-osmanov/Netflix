"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Edit3, ArrowRight } from "lucide-react";
import { QuizItem } from "@/types/youtube";

interface VideoQuizProps {
  quiz: QuizItem[];
  onComplete: () => void;
  onEdit: () => void;
}

export function VideoQuiz({ quiz, onComplete, onEdit }: VideoQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!quiz || quiz.length === 0) return null;

  const currentQ = quiz[currentIndex];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.correct) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < quiz.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      onComplete(); // Автоматически помечает видео как выполненное
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-950/80 border border-emerald-500/30 text-center animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <CheckCircle2 size={24} />
        </div>
        <h4 className="text-base font-bold text-white mb-1">Материал усвоен!</h4>
        <p className="text-xs text-zinc-400 mb-4">
          Результат: <span className="text-emerald-400 font-bold">{score}</span> из {quiz.length} верно
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-2 transition cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
          >
            <RotateCcw size={13} />
            <span>Пройти заново</span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-2 transition cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
          >
            <Edit3 size={13} />
            <span>Изменить JSON</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 shadow-xl">
      {/* Шапка квиза: прогресс шагов и тип вопроса */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          {quiz.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-6 bg-emerald-500"
                  : i < currentIndex
                  ? "w-3 bg-emerald-800"
                  : "w-3 bg-zinc-800"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
            {currentQ?.type === "cloze"
              ? "Вставка"
              : currentQ?.type === "vocab"
              ? "Сленг / Лексика"
              : "Контекст"}
          </span>
          <span className="text-xs font-mono text-zinc-500">
            {currentIndex + 1} / {quiz.length}
          </span>
        </div>
      </div>

      {/* Сам вопрос */}
      <h3 className="text-sm sm:text-base font-semibold text-zinc-100 mb-4 leading-relaxed">
        {currentQ?.question}
      </h3>

      {/* Варианты ответов */}
      <div className="grid grid-cols-1 gap-2 mb-4">
        {currentQ?.options?.map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === currentQ.correct;

          let btnStyle =
            "bg-zinc-900/90 text-zinc-300 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/60";

          if (isAnswered) {
            if (isCorrect) {
              btnStyle =
                "bg-emerald-950/40 text-emerald-300 border-emerald-500/60 shadow-lg shadow-emerald-950/40";
            } else if (isSelected) {
              btnStyle = "bg-red-950/40 text-red-300 border-red-500/60";
            } else {
              btnStyle = "bg-zinc-900/40 text-zinc-600 border-zinc-900 opacity-50";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(idx)}
              disabled={isAnswered}
              className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between outline-none focus:outline-none focus:ring-0 active:outline-none cursor-pointer [-webkit-tap-highlight-color:transparent] ${btnStyle}`}
            >
              <span>{opt}</span>
              {isAnswered && isCorrect && (
                <CheckCircle2 className="text-emerald-400 shrink-0" size={16} />
              )}
              {isAnswered && isSelected && !isCorrect && (
                <XCircle className="text-red-400 shrink-0" size={16} />
              )}
            </button>
          );
        })}
      </div>

      {/* Нижняя кнопка перехода */}
      {isAnswered && (
        <div className="flex justify-end pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/40 cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
          >
            <span>{currentIndex + 1 === quiz.length ? "Завершить" : "Следующий вопрос"}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoQuiz;
