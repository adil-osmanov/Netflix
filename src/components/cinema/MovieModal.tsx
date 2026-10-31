'use client';

import React, { useEffect } from 'react';
import { MOVIE_SOURCES } from '@/config/movieSources';
import { X, Play, ExternalLink, Star, Calendar } from 'lucide-react';
import { Movie } from './MovieCard';

interface MovieModalProps {
  movie: Movie;
  onClose: () => void;
}

export function MovieModal({ movie, onClose }: MovieModalProps) {
  // Закрытие по клавише Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-zinc-400 hover:text-white transition-colors cursor-pointer select-none outline-none"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Баннер фильма */}
        <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
          {movie.backdrop || movie.poster ? (
            <img
              src={movie.backdrop || movie.poster!}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-700">Нет изображения</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-6">
            <h2 className="text-2xl font-black text-white tracking-tight">{movie.title}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold text-zinc-300">
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-current" /> {movie.vote_average}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {movie.year || '2024'}
              </span>
              <span>•</span>
              <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">EN ORIGINAL</span>
            </div>
          </div>
        </div>

        {/* Описание и выбор источника */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <p className="text-sm text-zinc-400 leading-relaxed">
            {movie.overview || 'Описание фильма временно отсутствует.'}
          </p>

          <div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-500 mb-3">
              Выберите сервер для просмотра:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MOVIE_SOURCES.map((source) => {
                const targetUrl = source.getUrl(movie.title, movie.year, movie.id);
                return (
                  <a
                    key={source.id}
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-red-600/60 hover:bg-zinc-800/70 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-600/10 text-red-500 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-200 group-hover:text-white">
                          {source.name}
                        </div>
                        <div className="text-[10px] text-zinc-500">{source.badge}</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovieModal;
