'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

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
  selectedYear: string;
  onSelectYear: (year: string) => void;
  minRating: string;
  onSelectRating: (rating: string) => void;
}

export function CinemaCategories({
  selected,
  onSelect,
  selectedYear,
  onSelectYear,
  minRating,
  onSelectRating,
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

      {/* Регуляторы года и рейтинга */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Фильтр года */}
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => onSelectYear(e.target.value)}
            className="appearance-none bg-zinc-900/90 text-zinc-300 hover:text-white text-xs font-semibold px-3 py-1.5 pr-7 rounded-full border border-zinc-800 cursor-pointer focus:outline-none"
          >
            <option value="all">Все года</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2020">2020-е</option>
            <option value="2010">2010-е</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        {/* Фильтр рейтинга */}
        <div className="relative">
          <select
            value={minRating}
            onChange={(e) => onSelectRating(e.target.value)}
            className="appearance-none bg-zinc-900/90 text-amber-400 hover:text-amber-300 text-xs font-bold px-3 py-1.5 pr-7 rounded-full border border-zinc-800 cursor-pointer focus:outline-none"
          >
            <option value="6.0">Рейтинг: 6.0+</option>
            <option value="7.0">Рейтинг: 7.0+</option>
            <option value="7.5">Рейтинг: 7.5+</option>
            <option value="8.0">Рейтинг: 8.0+</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
