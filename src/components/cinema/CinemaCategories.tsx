'use client';

import React from 'react';
import { CinemaFilters } from './CinemaFilters';

export const CINEMA_CATEGORIES = [
  { id: 'trending', label: 'В тренде' },
  { id: 'top_rated', label: 'Топ рейтинг' }, // На втором месте
  { id: 'series', label: 'Сериалы' },       // На третьем месте
  { id: 'action', label: 'Боевики' },
  { id: 'scifi', label: 'Фантастика' },
  { id: 'drama', label: 'Драмы и криминал' },
  { id: 'comedy', label: 'Комедии' },
  { id: 'animation', label: 'Анимация' },
];

interface CinemaCategoriesProps {
  selected: string;
  onSelect: (id: string) => void;
  yearRange: [number, number];
  onYearChange: (range: [number, number]) => void;
  minRating: number;
  onRatingChange: (rating: number) => void;
  onResetFilters: () => void;
}

export function CinemaCategories({
  selected,
  onSelect,
  yearRange,
  onYearChange,
  minRating,
  onRatingChange,
  onResetFilters,
}: CinemaCategoriesProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 my-4">
      {/* Кнопки категорий */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
        {CINEMA_CATEGORIES.map((cat) => {
          const isActive = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 select-none cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] ${
                isActive
                  ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Единая кнопка вызова параметров и ползунков фильтров в стиле Netflix */}
      <CinemaFilters
        yearRange={yearRange}
        onYearChange={onYearChange}
        minRating={minRating}
        onRatingChange={onRatingChange}
        onReset={onResetFilters}
      />
    </div>
  );
}

export default CinemaCategories;
