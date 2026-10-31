'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, Star, Calendar, X } from 'lucide-react';

export interface CinemaFiltersProps {
  yearRange: [number, number]; // [1990, 2026]
  onYearChange: (range: [number, number]) => void;
  minRating: number;           // 6.0
  onRatingChange: (rating: number) => void;
  onReset: () => void;
}

export function CinemaFilters({
  yearRange,
  onYearChange,
  minRating,
  onRatingChange,
  onReset,
}: CinemaFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isFiltered = minRating > 6.0 || yearRange[0] > 1990 || yearRange[1] < 2026;

  return (
    <div className="relative">
      {/* Кнопка вызова панели фильтров */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] ${
          isOpen || isFiltered
            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
            : 'bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800'
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Фильтры</span>
        {isFiltered && (
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        )}
      </button>

      {/* Выпадающее всплывающее меню с ползунками */}
      {isOpen && (
        <div className="absolute right-0 top-10 z-40 w-72 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Параметры кино</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Ползунок минимального рейтинга */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Рейтинг:
              </span>
              <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                от {minRating.toFixed(1)} ★
              </span>
            </div>
            <input
              type="range"
              min="5.0"
              max="9.0"
              step="0.5"
              value={minRating}
              onChange={(e) => onRatingChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
          </div>

          {/* Ползунок диапазона годов */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Год от:
              </span>
              <span className="text-white font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {yearRange[0]} — {yearRange[1]}
              </span>
            </div>
            <input
              type="range"
              min="1990"
              max="2026"
              step="1"
              value={yearRange[0]}
              onChange={(e) => onYearChange([parseInt(e.target.value, 10), yearRange[1]])}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 font-semibold px-0.5">
              <span>1990</span>
              <span>2005</span>
              <span>2015</span>
              <span>2026</span>
            </div>
          </div>

          {/* Сброс */}
          <button
            type="button"
            onClick={() => {
              onReset();
              setIsOpen(false);
            }}
            className="w-full py-1.5 text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
}

export default CinemaFilters;
