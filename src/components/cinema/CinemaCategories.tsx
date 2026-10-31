'use client';

import React from 'react';

export const CINEMA_CATEGORIES = [
  { id: 'trending', label: 'В тренде' },
  { id: 'series', label: 'Сериалы' },
  { id: 'top_rated', label: 'Топ рейтинг' },
  { id: 'action', label: 'Боевики' },
  { id: 'scifi', label: 'Фантастика' },
  { id: 'drama', label: 'Драмы и криминал' },
  { id: 'comedy', label: 'Комедии' },
  { id: 'animation', label: 'Анимация' },
];

interface CinemaCategoriesProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function CinemaCategories({ selected, onSelect }: CinemaCategoriesProps) {
  return (
    <div className="w-full overflow-hidden my-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1">
        {CINEMA_CATEGORIES.map((cat) => {
          const isActive = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 select-none whitespace-nowrap cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] ${
                isActive
                  ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/60'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CinemaCategories;
