'use client';

import React from 'react';
import { Play, Star } from 'lucide-react';

interface CinemaLandscapeCardProps {
  item: {
    id: number | string;
    title: string;
    backdrop?: string | null;
    poster?: string | null;
    year: string;
    vote_average: string;
    media_type: 'movie' | 'tv';
  };
  onSelect: () => void;
}

export function CinemaLandscapeCard({ item, onSelect }: CinemaLandscapeCardProps) {
  const imageSrc = item.backdrop || item.poster;
  if (!imageSrc) return null;

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
      className="group relative flex-none w-[240px] sm:w-[280px] md:w-[320px] cursor-pointer transition-transform duration-300 hover:scale-[1.03] select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
    >
      {/* 16:9 горизонтальный баннер */}
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-zinc-900 border border-zinc-800/60 shadow-lg">
        <img
          src={imageSrc}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-80 select-none"
        />

        {/* Левый угол: Год */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span className="bg-black/80 backdrop-blur-sm text-zinc-200 border border-zinc-700/60 font-black px-1.5 py-0.5 rounded text-[10px]">
            {item.year}
          </span>
        </div>

        {/* Правый угол: Рейтинг */}
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md border border-amber-500/40 text-amber-400 font-black px-1.5 py-0.5 rounded text-[11px] shadow-lg">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{item.vote_average}</span>
          </div>
        </div>

        {/* Play-кнопка при ховере */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-white/95 text-black flex items-center justify-center shadow-xl transition-transform group-hover:scale-110">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Название на русском */}
      <h3 className="mt-1.5 text-xs font-bold text-zinc-200 line-clamp-1 group-hover:text-white">
        {item.title}
      </h3>
    </div>
  );
}

export default CinemaLandscapeCard;
