'use client';

import React from 'react';

export const CINEMA_CATEGORIES = [
  { id: 'trending', label: '🔥 В тренде' },
  { id: 'series', label: '📺 Сериалы' },
  { id: 'top_rated', label: '⭐️ Топ рейтинг' },
  { id: 'action', label: '💥 Боевики и Sci-Fi' },
  { id: 'comedy', label: '🍿 Комедии' },
  { id: 'animation', label: '🎨 Анимация' },
];

export function CinemaCategories({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mb-4">
      {CINEMA_CATEGORIES.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 select-none outline-none focus:outline-none focus:ring-0 active:outline-none cursor-pointer [-webkit-tap-highlight-color:transparent] ${
              isActive
                ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

export default CinemaCategories;
