'use client';

import React from 'react';
import { Play, Star } from 'lucide-react';
import { CinemaItem } from './MovieModal';

interface MovieCardProps {
  movie?: CinemaItem | {
    id: number | string;
    title: string;
    poster: string | null;
    year: string;
    vote_average: string;
    media_type: 'movie' | 'tv';
  };
  item?: CinemaItem;
  onSelect: () => void;
}

export function MovieCard({ movie, item, onSelect }: MovieCardProps) {
  const current = movie || item;
  if (!current || !current.poster) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className="group relative flex flex-col cursor-pointer transition-transform duration-300 hover:scale-[1.04] select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-zinc-900 border border-zinc-800/60 shadow-lg">
        <img
          src={current.poster}
          alt={current.title}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-85 select-none"
        />

        {/* Левый верхний угол: Год и бейдж качества HD вместо EN */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 select-none pointer-events-none">
          <span className="bg-black/85 backdrop-blur-sm text-zinc-200 border border-zinc-700/60 font-black px-1.5 py-0.5 rounded text-[10px]">
            {current.year}
          </span>
          <span className="bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 font-black px-1.5 py-0.5 rounded text-[10px] tracking-wider">
            HD
          </span>
        </div>

        {/* Правый верхний угол: ЗАМЕТНЫЙ РЕЙТИНГ */}
        <div className="absolute top-2 right-2 z-10 select-none pointer-events-none">
          <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-400 font-black px-2 py-0.5 rounded-md text-[11px] shadow-lg">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{current.vote_average}</span>
          </div>
        </div>

        {/* Кнопка Play при ховере */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-white/95 text-black flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Название фильма на русском */}
      <h3 className="mt-2 text-xs font-bold text-zinc-200 line-clamp-1 group-hover:text-white">
        {current.title}
      </h3>

      {/* Нижняя строка: год и тип (без слова English) */}
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
        <span>{current.year}</span>
        <span>•</span>
        <span className="capitalize">{current.media_type === 'tv' ? 'Сериал' : 'Фильм'}</span>
      </div>
    </div>
  );
}

export default MovieCard;
