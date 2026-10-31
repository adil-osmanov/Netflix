'use client';

import React from 'react';
import { Play } from 'lucide-react';

export interface Movie {
  id: number | string;
  title: string;
  original_title?: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  year: string;
  vote_average: string;
}

export function MovieCard({ movie, onSelect }: { movie: Movie; onSelect: () => void }) {
  if (!movie.poster) return null;

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
      className="group relative flex flex-col cursor-pointer transition-transform duration-300 hover:scale-105 select-none outline-none focus:outline-none focus:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-zinc-900 border border-zinc-800/50 shadow-md">
        <img
          src={movie.poster}
          alt={movie.title}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
        />

        {/* Бейдж качества / года */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 select-none pointer-events-none">
          <span className="bg-black/80 backdrop-blur-sm text-zinc-200 border border-zinc-700/60 font-black px-1.5 py-0.5 rounded text-[10px]">
            {movie.year || '2024'}
          </span>
          <span className="bg-blue-600/90 text-white font-extrabold px-1.5 py-0.5 rounded text-[10px]">
            EN
          </span>
        </div>

        {/* Кнопка Play при наведении */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      <h3 className="mt-2 text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">
        {movie.title}
      </h3>
      <p className="text-[11px] text-zinc-500">{movie.vote_average} ★ • English</p>
    </div>
  );
}

export default MovieCard;
